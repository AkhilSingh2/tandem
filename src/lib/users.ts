export const PRESENCE_COLORS = [
  "#9a3412",
  "#1e3a8a",
  "#115e59",
  "#5b21b6",
  "#9d174d",
  "#854d0e",
  "#155e75",
  "#3730a3",
] as const;

export type PresenceUser = {
  id: string;
  name: string;
  color: string;
};

export function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function colorForUser(name: string, id: string): string {
  return PRESENCE_COLORS[hashString(`${name}:${id}`) % PRESENCE_COLORS.length];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return "?";
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}
