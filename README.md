# ECG MLOps

ECG arrhythmia detection platform with:

- FastAPI inference API
- Next.js frontend powered by Bun
- MLflow for experiment tracking
- Prometheus and Grafana for monitoring
- Argo CD for GitOps
- Kubernetes manifests for local deployment on Kind

## What Runs Here

- `app/`: Python API and model loading
- `frontend/`: Next.js dashboard and prediction UI
- `k8s/api/`: API deployment, service, HPA, config
- `k8s/frontend/`: Frontend deployment and service
- `k8s/mlflow/`: MLflow deployment, service, PVC
- `k8s/monitoring/`: Prometheus and Grafana config
- `k8s/argocd/`: Argo CD application manifest
- `k8s/ingress.yml`: NGINX ingress routes

## Prerequisites

Install these tools before starting:

- Docker Desktop
- `kubectl`
- `kind`
- `helm`
- `bun`
- `git`

This setup assumes:

- you have a Kind config file named `clusters.yml` in the repo root
- you want to run a local Kind cluster named `local`
- the API image tag in [k8s/api/deployment.yml](/Applications/AI/ecg-mlops/k8s/api/deployment.yml:1) exists in Docker Hub
- the frontend image tag in [k8s/frontend/deployment.yml](/Applications/AI/ecg-mlops/k8s/frontend/deployment.yml:1) exists in Docker Hub

If you want the ingress host locally, add this to `/etc/hosts`:

```bash
127.0.0.1 ecg.local
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

### 4. Open Argo CD and get the initial password

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

### 6. Deploy the API

```bash
kubectl apply -f k8s/api/
```

### 7. Deploy the frontend

```bash
kubectl apply -f k8s/frontend/
```

### 8. Deploy MLflow

```bash
kubectl apply -f k8s/mlflow/
```

### 9. Deploy monitoring

```bash
kubectl apply -f k8s/monitoring/prometheus-configmap.yml
kubectl apply -f k8s/monitoring/prometheus-deployment.yml
kubectl apply -f k8s/monitoring/prometheus-service.yml

helm install grafana grafana/grafana \
  --namespace ecg-mlops \
  --values k8s/monitoring/grafana-values.yml
```

### 10. Deploy ingress

```bash
kubectl apply -f k8s/ingress.yml
```

### 11. Verify workloads

```bash
kubectl get pods -n ecg-mlops
kubectl get services -n ecg-mlops
kubectl get ingress -n ecg-mlops
```

### 12. Port-forward local service access

Run these in the background or separate terminals:

```bash
kubectl port-forward svc/ecg-frontend-service -n ecg-mlops 3000:80 &
kubectl port-forward svc/ecg-api-service -n ecg-mlops 8000:80 &
kubectl port-forward svc/mlflow-service -n ecg-mlops 5001:5000 &
kubectl port-forward svc/prometheus-service -n ecg-mlops 9090:9090 &
```

Forward Grafana on `3001` so it does not conflict with the frontend:

```bash
export GRAFANA_POD=$(kubectl get pods --namespace ecg-mlops \
  -l "app.kubernetes.io/name=grafana,app.kubernetes.io/instance=grafana" \
  -o jsonpath="{.items[0].metadata.name}")

kubectl port-forward --namespace ecg-mlops $GRAFANA_POD 3001:3000 &
```

Get the Grafana admin password:

```bash
kubectl get secret --namespace ecg-mlops grafana \
  -o jsonpath="{.data.admin-password}" | base64 --decode; echo
```

Expose the ingress controller locally:

```bash
kubectl port-forward --namespace ingress-nginx \
  service/ingress-nginx-controller 8081:80 &
```

## Local Service Endpoints

| Service         | URL                              | Notes                                                                                |
| --------------- | -------------------------------- | ------------------------------------------------------------------------------------ |
| Argo CD UI      | https://localhost:8080           | GitOps dashboard to sync and inspect resources                                       |
| Frontend UI     | http://localhost:3000            | Main ECG dashboard and prediction workflow                                           |
| ECG API docs    | http://localhost:8000/docs       | FastAPI interactive docs                                                             |
| ECG API health  | http://localhost:8000/health     | Model version and API health                                                         |
| ECG API predict | http://localhost:8000/predict    | POST endpoint for ECG beat classification                                            |
| MLflow UI       | http://localhost:5001            | Experiments, artifacts, and model tracking                                           |
| Prometheus      | http://localhost:9090            | Raw metrics query interface                                                          |
| Grafana         | http://localhost:3001            | Monitoring dashboards. Login: `admin` and the password from the secret command above |
| Via Ingress     | http://ecg.local:8081/           | Frontend through nginx ingress                                                       |
| Via Ingress     | http://ecg.local:8081/api        | All API routes through ingress                                                       |
| Via Ingress     | http://ecg.local:8081/mlflow     | MLflow through ingress                                                               |
| Via Ingress     | http://ecg.local:8081/prometheus | Prometheus through ingress                                                           |
| Via Ingress     | http://ecg.local:8081/grafana    | Grafana through ingress                                                              |

## Frontend Local Development

If you want to work on the frontend outside Kubernetes:

```bash
cd frontend
bun install
bun run dev
```

The frontend will run on `http://localhost:3000` and proxy `/api/*` requests to `http://localhost:8000` by default, so keep the API port-forward running on `8000`.

## CI/CD Pipeline

The GitHub Actions workflow now does all of the following:

- runs Python API tests
- builds the frontend with Bun
- builds and pushes the API Docker image
- builds and pushes the frontend Docker image
- updates [k8s/api/deployment.yml](/Applications/AI/ecg-mlops/k8s/api/deployment.yml:1) and [k8s/frontend/deployment.yml](/Applications/AI/ecg-mlops/k8s/frontend/deployment.yml:1) with the latest SHA tags

Argo CD then syncs the Kubernetes manifests from the `k8s/` directory recursively.

## Git Notes

There is no nested Git repository inside `frontend/` right now. Git sees it as a normal folder inside the main repo, so it can be committed as part of this project without creating a Git submodule link.

## Optional Git Workflow

```bash
git add .
git commit -m "your message here"
git pull --rebase origin main
git push
```

## Troubleshooting

### Port already in use

If a port-forward fails because a local port is already busy:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
kill <PID>
```

Use the same pattern for ports `3001`, `5001`, `8000`, `8080`, `8081`, or `9090`.

### Port-forward stops immediately

That usually means the target pod is restarting or crashing:

```bash
kubectl get pods -n ecg-mlops
kubectl logs -n ecg-mlops <pod-name>
kubectl describe pod -n ecg-mlops <pod-name>
```

### Refresh Argo CD view

If Argo CD looks incomplete, make sure the application is synced and refreshed after manifest changes:

```bash
kubectl apply -f k8s/argocd/application.yml
```

Then refresh the app in the Argo CD UI.

### Recreate everything from scratch

```bash
killall kubectl
kind delete cluster -n local
```

Then rerun the setup steps from the top.
