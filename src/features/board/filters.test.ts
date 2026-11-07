import { filterApplications, isFiltering, neighboursInFullColumn, normalize } from "./filters";
import { boardFixture } from "./lib/test-fixtures";

const list = boardFixture();
const none = { q: "", mode: [], min: null };
const ids = (cards: { id: string }[]) => cards.map((c) => c.id);

describe("normalize", () => {
  it("ignores case and Polish diacritics", () => {
    expect(normalize("Łódź Wisła ŻÓŁĆ")).toBe("lodz wisla zolc");
  });
});

describe("filterApplications", () => {
  it("returns everything without filters", () => {
    expect(filterApplications(list, none)).toHaveLength(list.length);
    expect(isFiltering(none)).toBe(false);
  });

  it("searches company, role, city and stack; every word must match", () => {
    expect(ids(filterApplications(list, { ...none, q: "graphql" }))).toEqual(["szlak-react"]);
    expect(ids(filterApplications(list, { ...none, q: "lodz" }))).toEqual(["wior-ui"]);
    expect(ids(filterApplications(list, { ...none, q: "react gdansk" }))).toEqual(["mewa-react"]);
    expect(filterApplications(list, { ...none, q: "react cobol" })).toHaveLength(0);
  });

  it("filters by any of the selected work modes", () => {
    const result = filterApplications(list, { ...none, mode: ["hybrid", "office"] });
    expect(result.every((c) => c.workMode !== "remote")).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("keeps cards whose salary range reaches the minimum", () => {
    const result = filterApplications(list, { ...none, min: 21000 });
    expect(ids(result).sort()).toEqual(["brzeg-ai", "kropla-mid", "mewa-react"]);
  });

  it("hides cards without any salary when a minimum is set", () => {
    const noSalary = list.map((c) => ({ ...c, salaryMin: null, salaryMax: null }));
    expect(filterApplications(noSalary, { ...none, min: 1 })).toHaveLength(0);
  });

  it("detects active filters", () => {
    expect(isFiltering({ ...none, q: "  " })).toBe(false);
    expect(isFiltering({ ...none, min: 15000 })).toBe(true);
  });
});

describe("neighboursInFullColumn", () => {
  const column = ["a", "hidden1", "b", "hidden2", "c"];

  it("puts the card right after the visible card above it", () => {
    expect(neighboursInFullColumn(column, "c", "a")).toEqual({ prevId: "a", nextId: "hidden1" });
  });

  it("puts the card on top when nothing visible is above it", () => {
    expect(neighboursInFullColumn(column, "b", null)).toEqual({ prevId: null, nextId: "a" });
  });

  it("ignores the moving card itself and handles the column end", () => {
    expect(neighboursInFullColumn(column, "a", "c")).toEqual({ prevId: "c", nextId: null });
    expect(neighboursInFullColumn(["a"], "a", null)).toEqual({ prevId: null, nextId: null });
  });
});
