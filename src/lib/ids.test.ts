import { describe, expect, it } from "vitest";
import { createId, createRoomId } from "@/lib/ids";
import { isRoomId, parseRoomInput } from "@/lib/room";

describe("ids", () => {
  it("creates url-safe room ids", () => {
    const id = createRoomId();
    expect(isRoomId(id)).toBe(true);
    expect(id.startsWith("r")).toBe(true);
    expect(createRoomId()).not.toBe(id);
  });

  it("creates prefixed document ids", () => {
    expect(createId("card")).toMatch(/^card_[a-z0-9]+$/);
  });
});

describe("parseRoomInput", () => {
  it("accepts a bare room id", () => {
    expect(parseRoomInput("  rdemo1234 ")).toBe("rdemo1234");
  });

  it("pulls the id out of a shared link", () => {
    expect(parseRoomInput("https://tandem.example/room/rdemo1234?name=Maya")).toBe("rdemo1234");
  });

  it("rejects short or decorated ids", () => {
    expect(parseRoomInput("ab")).toBeNull();
    expect(parseRoomInput("https://tandem.example/about")).toBeNull();
    expect(parseRoomInput("../etc/passwd")).toBeNull();
  });
});
