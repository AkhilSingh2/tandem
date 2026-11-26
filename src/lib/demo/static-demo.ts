/** True only in the GitHub Pages build, where there is no websocket server. */
export const STATIC_DEMO = process.env.NEXT_PUBLIC_STATIC_DEMO === "true";
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Room link. The static build has no dynamic routes, so rooms live at /room/?id=…
 * Pass withBase for plain <a>/<iframe> URLs; Next's router adds the base path itself.
 */
export function roomHref(id: string, query: Record<string, string> = {}, withBase = false): string {
  const params = new URLSearchParams(query);
  if (!STATIC_DEMO) {
    const search = params.toString();
    return `/room/${id}${search ? `?${search}` : ""}`;
  }
  params.set("id", id);
  return `${withBase ? BASE_PATH : ""}/room/?${params.toString()}`;
}
