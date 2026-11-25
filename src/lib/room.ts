const ROOM_ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,63}$/;

export function isRoomId(value: string): boolean {
  return ROOM_ID.test(value);
}

export function parseRoomInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split("/").filter(Boolean);
    const roomIndex = parts.indexOf("room");
    const id = roomIndex >= 0 ? parts[roomIndex + 1] : "";
    return id && isRoomId(id) ? id : null;
  } catch {
    return isRoomId(trimmed) ? trimmed : null;
  }
}

export function singleParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}
