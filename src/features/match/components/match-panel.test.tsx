import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { requestBody, streamedResponse, textErrorResponse } from "@/test/stream";

import { scoreMatch } from "../lib/score";
import { type StoredMatchComment } from "../schemas";

import { MatchPanel } from "./match-panel";

const breakdown = scoreMatch(
  {
    skills: ["React", "TypeScript"],
    yearsExperience: 3,
    salaryMin: 18000,
    remotePreference: "remote",
  },
  {
    stack: ["React", "TypeScript", "Redux"],
    salaryMin: 16000,
    salaryMax: 22000,
    workMode: "remote",
    seniority: "Mid",
  },
);

const savedCoach: StoredMatchComment = {
  verdict: "Pasuje, brakuje tylko Reduxa.",
  strengths: ["React i TypeScript"],
  gaps: ["Redux"],
  advice: "Zrób mały projekt z Redux Toolkit.",
  score: 85,
  model: "demo",
  createdAt: "2026-11-08T13:05:00.000Z",
};

const roast = {
  verdict: "Redux w 2026? Odważnie.",
  strengths: ["Stack prawie się zgadza."],
  gaps: ["Brak Reduxa to nie wada, to higiena."],
  advice: "Zapytaj, czy planują migrację.",
};

function setup(
  saved = { coach: null, roast: null } as Record<"coach" | "roast", StoredMatchComment | null>,
) {
  render(
    <MatchPanel
      applicationId="0b6c4f4e-1f1a-4a52-9a52-0d8b3b0d1b11"
      breakdown={breakdown}
      saved={saved}
    />,
  );
  return userEvent.setup();
}

afterEach(() => vi.unstubAllGlobals());

describe("MatchPanel", () => {
  it("asks for a profile when there is nothing to compare", () => {
    render(<MatchPanel applicationId="x" breakdown={null} saved={{ coach: null, roast: null }} />);
    expect(screen.getByRole("link", { name: "Przejdź do profilu" })).toHaveAttribute(
      "href",
      "/profile",
    );
    expect(screen.queryByRole("button", { name: "Skomentuj z AI" })).not.toBeInTheDocument();
  });

  it("shows the computed score with points per part, without calling the AI", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    setup();
    expect(
      screen.getByRole("img", { name: `Dopasowanie ${breakdown?.score} na 100` }),
    ).toBeInTheDocument();
    expect(screen.getByText("Znasz 2 z 3. Brakuje: Redux.")).toBeInTheDocument();
    expect(screen.getByText("20/20")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows a saved comment with its date and offers to refresh it", () => {
    setup({ coach: savedCoach, roast: null });
    const comment = screen.getByRole("article", { name: "Komentarz AI" });
    expect(within(comment).getByText("Pasuje, brakuje tylko Reduxa.")).toBeInTheDocument();
    expect(within(comment).getByText("8 lis 2026, 14:05")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Skomentuj jeszcze raz" })).toBeInTheDocument();
  });

  it("streams a roast in red pen, asking the server for the roast tone", async () => {
    const fetchMock = vi.fn().mockResolvedValue(streamedResponse(JSON.stringify(roast)));
    vi.stubGlobal("fetch", fetchMock);
    const user = setup({ coach: savedCoach, roast: null });

    await user.click(screen.getByRole("button", { name: /^Roast$/ }));
    expect(screen.getByRole("button", { name: /^Roast$/ })).toHaveAttribute("aria-pressed", "true");
    // The coach comment belongs to the other tone.
    expect(screen.queryByRole("article", { name: "Komentarz AI" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Zrób roast" }));
    const article = await screen.findByRole("article", { name: "Roast" });
    expect(await within(article).findByText("A na serio:")).toBeInTheDocument();
    expect(within(article).getByText("Redux w 2026? Odważnie.")).toHaveAttribute(
      "data-slot",
      "pen-note",
    );
    expect(requestBody(fetchMock)).toEqual({
      applicationId: "0b6c4f4e-1f1a-4a52-9a52-0d8b3b0d1b11",
      tone: "roast",
    });
    expect(await screen.findByRole("button", { name: "Jeszcze jeden roast" })).toBeInTheDocument();
  });

  it("shows the server's message when the AI is not available", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(textErrorResponse("Limit: 3 ocen dopasowania na godzinę.", 429)),
    );
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Skomentuj z AI" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Limit: 3 ocen dopasowania na godzinę.",
    );
  });

  it("says so when the network is down", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Skomentuj z AI" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Brak połączenia z serwerem.");
  });
});
