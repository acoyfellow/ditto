export function mergeStrings(outputs: string[]): string {
  if (outputs.length === 0) {
    throw new Error("No outputs to merge");
  }
  const nonEmpty = outputs.filter((s) => s.trim().length > 0);
  return nonEmpty[0] ?? outputs[0];
}

