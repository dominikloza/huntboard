import { safeRedirectPath } from "./safe-redirect";

describe("safeRedirectPath", () => {
  it("keeps same-site paths", () => {
    expect(safeRedirectPath("/board")).toBe("/board");
    expect(safeRedirectPath("/profile?tab=skills")).toBe("/profile?tab=skills");
  });

  it.each(["https://evil.com", "//evil.com", "/\\evil.com", "board", "", null, undefined, 42])(
    "rejects %s",
    (value) => {
      expect(safeRedirectPath(value)).toBe("/board");
    },
  );
});
