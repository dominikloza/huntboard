import { pluralPl } from "./plural";

const forms = ["aplikacja", "aplikacje", "aplikacji"] as const;

describe("pluralPl", () => {
  it.each([
    [0, "aplikacji"],
    [1, "aplikacja"],
    [2, "aplikacje"],
    [4, "aplikacje"],
    [5, "aplikacji"],
    [12, "aplikacji"],
    [14, "aplikacji"],
    [22, "aplikacje"],
    [25, "aplikacji"],
    [102, "aplikacje"],
    [112, "aplikacji"],
  ])("%i -> %s", (count, expected) => {
    expect(pluralPl(count, forms)).toBe(expected);
  });
});
