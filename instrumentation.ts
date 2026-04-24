export async function register() {
  // @vercel/otel currently crashes Next.js dev startup on Windows.
  // Skip telemetry there so local development remains usable.
  if (process.platform === "win32" && process.env.NODE_ENV === "development") {
    return;
  }

  const { registerOTel } = await import("@vercel/otel");
  registerOTel({ serviceName: "chatbot" });
}
