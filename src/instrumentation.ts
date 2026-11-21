export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { exitIfEnvInvalid } = await import("./lib/env");
  exitIfEnvInvalid();
}
