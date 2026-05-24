# ECG MLOps

ECG arrhythmia detection project with:

- FastAPI inference service
- MLflow for experiment tracking
- Prometheus and Grafana for monitoring
- NGINX Ingress for routing
- Argo CD for GitOps deployment
- Kubernetes manifests for local development on `kind`

## Prerequisites

Install these tools before starting:

- Docker Desktop
- `kubectl`
- `kind`
- `helm`
- `git`

This setup also assumes:

- you have a Kind cluster config file named `clusters.yml` in the repo root
- you want to use a local Kind cluster named `local`
- the Docker image tag in [k8s/api/deployment.yml](/Applications/AI/ecg-mlops/k8s/api/deployment.yml:1) points to an image that exists in Docker Hub

If you want to use the ingress hostname locally, add this entry to `/etc/hosts`:

```bash
127.0.0.1 ecg.local
```

## Project Structure

```text
app/                  FastAPI app and model loading logic
models/               Model checkpoint
k8s/api/              API deployment, service, HPA, config
k8s/mlflow/           MLflow deployment, service, PVC
k8s/monitoring/       Prometheus and Grafana config
k8s/argocd/           Argo CD application manifest
k8s/ingress.yml       NGINX ingress routes
```

## Start Locally

### 1. Reset old local processes and recreate the cluster

```bash
killall kubectl
kind delete cluster -n local
kind create cluster --config clusters.yml -n local
```

### 2. Create namespaces and install ingress

```bash
kubectl apply -f k8s/namespace.yml
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
```

### 3. Install Argo CD

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl apply -f k8s/argocd/application.yml
```

### 4. Open the Argo CD UI and get the initial password

```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443 &
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d; echo
```

### 5. Add Helm repositories

```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
```

### 6. Deploy the ECG API

```bash
kubectl apply -f k8s/api/configmap.yml
kubectl apply -f k8s/api/deployment.yml
kubectl apply -f k8s/api/service.yml
kubectl apply -f k8s/api/hpa.yml
```

### 7. Deploy MLflow

```bash
kubectl apply -f k8s/mlflow/pvc.yml
kubectl apply -f k8s/mlflow/deployment.yml
kubectl apply -f k8s/mlflow/service.yml
```

### 8. Deploy monitoring

```bash
kubectl apply -f k8s/monitoring/prometheus-configmap.yml
kubectl apply -f k8s/monitoring/prometheus-deployment.yml
kubectl apply -f k8s/monitoring/prometheus-service.yml

helm install grafana grafana/grafana \
  --namespace ecg-mlops \
  --values k8s/monitoring/grafana-values.yml
```

### 9. Deploy ingress

```bash
kubectl apply -f k8s/ingress.yml
```

### 10. Verify workloads

```bash
kubectl get pods -n ecg-mlops
kubectl get services -n ecg-mlops
kubectl get ingress -n ecg-mlops
```

### 11. Expose local ports

Run these in the background or in separate terminals:

```bash
kubectl port-forward svc/ecg-api-service -n ecg-mlops 8000:80 &
kubectl port-forward svc/mlflow-service -n ecg-mlops 5001:5000 &
kubectl port-forward svc/prometheus-service -n ecg-mlops 9090:9090 &
```

Forward Grafana using the pod name:

```bash
export GRAFANA_POD=$(kubectl get pods --namespace ecg-mlops \
  -l "app.kubernetes.io/name=grafana,app.kubernetes.io/instance=grafana" \
  -o jsonpath="{.items[0].metadata.name}")

kubectl port-forward --namespace ecg-mlops $GRAFANA_POD 3000:3000 &
```

Get the Grafana admin password:

```bash
kubectl get secret --namespace ecg-mlops grafana \
  -o jsonpath="{.data.admin-password}" | base64 --decode; echo
```

Expose the ingress controller locally:

```bash
kubectl port-forward --namespace=ingress-nginx \
  service/ingress-nginx-controller 8081:80 &
```

## Local Service Endpoints

| Service | URL | Notes |
| --- | --- | --- |
| Argo CD UI | https://localhost:8080 | GitOps dashboard — sync and monitor deployments |
| ECG API docs | http://localhost:8000/docs | FastAPI interactive docs — test predictions here |
| ECG API health | http://localhost:8000/health | Model version + status |
| ECG API predict | http://localhost:8000/predict | POST endpoint for ECG classification |
| MLflow UI | http://localhost:5001 | Experiment runs, model registry, artifacts |
| Prometheus | http://localhost:9090 | Raw metrics query interface |
| Grafana | http://localhost:3000 | Monitoring dashboards — login: `admin` / see password step above |
| Via Ingress | http://ecg.local:8081/api | All API routes via nginx ingress controller |
| Via Ingress | http://ecg.local:8081/mlflow | MLflow via ingress |
| Via Ingress | http://ecg.local:8081/prometheus | Prometheus via ingress |
| Via Ingress | http://ecg.local:8081/grafana | Grafana via ingress |

## Optional Git Workflow

If you want to commit and push changes after local setup:

```bash
git add .
git commit -m "your message here"
git pull --rebase origin main
git push
```

## Troubleshooting

### Port already in use

If a port-forward fails because the port is already busy:

```bash
lsof -nP -iTCP:8080 -sTCP:LISTEN
kill <PID>
```

You can do the same for `5001`, `8000`, `9090`, `3000`, or `8081`.

### Port-forward stops immediately

That usually means the target pod is crashing. Check:

```bash
kubectl get pods -n ecg-mlops
kubectl logs -n ecg-mlops <pod-name>
kubectl describe pod -n ecg-mlops <pod-name>
```

### Recreate everything from scratch

```bash
killall kubectl
kind delete cluster -n local
```

Then follow the setup steps again from the top.
