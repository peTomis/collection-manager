import { describe, expect, test } from "vitest";
import { parseObjectId, queryString } from "@/lib/validation";

describe("validation", () => {
  test("query params only accept a single string", () => {
    expect(queryString("a")).toBe("a");
    expect(queryString(["a", "b"])).toBeUndefined();
    expect(queryString(undefined)).toBeUndefined();
  });

  test("object ids must be 24 hex characters", () => {
    expect(parseObjectId("64b7f0c2a1b2c3d4e5f60718")?.toHexString()).toBe("64b7f0c2a1b2c3d4e5f60718");
    // 12-character strings are valid ObjectIds for the driver, but not ids the routes accept
    expect(parseObjectId("aaaaaaaaaaaa")).toBeNull();
    expect(parseObjectId("not-an-id")).toBeNull();
    expect(parseObjectId(["64b7f0c2a1b2c3d4e5f60718"])).toBeNull();
  });
});
