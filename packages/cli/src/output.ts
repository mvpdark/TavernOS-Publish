// packages/cli/src/output.ts
// Console output helpers. All output goes to stderr to keep stdout clean for piping.

/** Print an info message to stderr (keeps stdout clean for piping). */
export function info(msg: string): void {
  process.stderr.write(`${msg}\n`);
}

/** Print a success message to stderr. */
export function success(msg: string): void {
  process.stderr.write(`\u2713 ${msg}\n`);
}

/** Print an error message to stderr. */
export function error(msg: string): void {
  process.stderr.write(`\u2717 ${msg}\n`);
}
