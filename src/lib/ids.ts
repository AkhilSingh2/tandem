const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export function randomString(size = 10): string {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let index = 0; index < size; index += 1) {
    out += ALPHABET[bytes[index] % ALPHABET.length];
  }
  return out;
}

export function createId(prefix = "id"): string {
  return `${prefix}_${randomString(8)}`;
}

export function createRoomId(): string {
  return `r${randomString(9)}`;
}
