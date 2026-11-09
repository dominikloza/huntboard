import { render, screen } from "@testing-library/react";

import { stopAt } from "./rail-parts";
import { ScoreWeights } from "./score-weights";

describe("stopAt", () => {
  it("maps scroll progress to the four stops of the card", () => {
    expect([0, 0.2, 0.3, 0.55, 0.8, 1].map(stopAt)).toEqual([0, 0, 1, 2, 3, 3]);
    expect(stopAt(-0.5)).toBe(0);
    expect(stopAt(2)).toBe(3);
  });
});

describe("ScoreWeights", () => {
  it("lists every weight of the match score for screen readers", () => {
    // jsdom has no IntersectionObserver: the bars just never "come into view".
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    render(<ScoreWeights />);
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    for (const text of [
      "Stack: 55% wyniku",
      "Widełki: 20% wyniku",
      "Tryb pracy: 15% wyniku",
      "Poziom: 10% wyniku",
    ]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    vi.unstubAllGlobals();
  });
});
