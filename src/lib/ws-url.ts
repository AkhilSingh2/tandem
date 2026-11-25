export function websocketUrl(): string {
  const configured = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (configured) return configured;
  return "ws://127.0.0.1:1234";
}
