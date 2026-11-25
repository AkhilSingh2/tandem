import { describe, expect, it } from "vitest";
import { colorForUser, initials, PRESENCE_COLORS } from "@/lib/users";

describe("presence", () => {
  it("picks a stable color for a person", () => {
    expect(colorForUser("Maya", "abc")).toBe(colorForUser("Maya", "abc"));
    expect(PRESENCE_COLORS).toContain(colorForUser("Akhil", "user_1"));
  });

  it("gives different people a chance at different colors", () => {
    expect(colorForUser("Maya", "a")).not.toBe(colorForUser("Akhilendra", "b"));
  });

  it("builds initials", () => {
    expect(initials("Akhilendra Singh")).toBe("AS");
    expect(initials("maya")).toBe("M");
    expect(initials("   ")).toBe("?");
  });
});
