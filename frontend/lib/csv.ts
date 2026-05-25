export interface ParsedCsvRow {
  values: number[];
  valid: boolean;
  error?: string;
}

function parseRow(line: string): ParsedCsvRow {
  const values = line
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .map(Number);

  if (!values.length) {
    return {
      values: [],
      valid: false,
      error: "Empty row",
    };
  }

  if (values.some((value) => Number.isNaN(value))) {
    return {
      values,
      valid: false,
      error: "Contains non-numeric values",
    };
  }

  if (values.length !== 180) {
    return {
      values,
      valid: false,
      error: `Expected 180 values, received ${values.length}`,
    };
  }

  return { values, valid: true };
}

export function parseCsvText(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map(parseRow);
}
