import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { requestBody, streamedResponse, textErrorResponse } from "@/test/stream";

import { type InterviewQuestions, type StoredInterviewQuestions } from "../schemas";

import { QuestionsPanel } from "./questions-panel";

const ID = "0b6c4f4e-1f1a-4a52-9a52-0d8b3b0d1b11";

const set: InterviewQuestions = {
  questions: [
    {
      topic: "React",
      question: "Kiedy useMemo ma sens?",
      hint: "Koszt obliczenia, stabilne referencje.",
    },
    {
      topic: "Redux",
      question: "Jak podzielisz store na slice'y?",
      hint: "Domeny, selektory, RTK.",
    },
    {
      topic: "Praca w zespole",
      question: "Jak prowadzisz code review?",
      hint: "Argumenty, nie gust.",
    },
  ],
  askThem: ["Czy zadanie rekrutacyjne jest płatne?", "Kto robi code review?"],
};

const saved: StoredInterviewQuestions = {
  ...set,
  model: "demo",
  createdAt: "2026-11-09T10:00:00.000Z",
};

function setup(props: Partial<Parameters<typeof QuestionsPanel>[0]> = {}) {
  render(<QuestionsPanel applicationId={ID} hasStack saved={null} {...props} />);
  return userEvent.setup();
}

afterEach(() => vi.unstubAllGlobals());

describe("QuestionsPanel", () => {
  it("streams a set of flashcards with hidden hints and questions for the employer", async () => {
    const fetchMock = vi.fn().mockResolvedValue(streamedResponse(JSON.stringify(set)));
    vi.stubGlobal("fetch", fetchMock);
    const user = setup();

    await user.click(screen.getByRole("button", { name: "Przygotuj pytania" }));

    const list = await screen.findByRole("list", { name: "Pytania" });
    expect(await within(list).findByText("Jak prowadzisz code review?")).toBeInTheDocument();
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    expect(requestBody(fetchMock)).toEqual({ applicationId: ID });

    // The hint is folded until the candidate asks for it.
    const hint = screen.getByText("Koszt obliczenia, stabilne referencje.");
    expect(hint).not.toBeVisible();
    await user.click(screen.getByText("Kiedy useMemo ma sens?"));
    expect(hint).toBeVisible();

    expect(await screen.findByText("Czy zadanie rekrutacyjne jest płatne?")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Nowy zestaw pytań" })).toBeInTheDocument();
  });

  it("shows a saved set without calling the AI", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    setup({ saved });
    expect(screen.getByText("Jak podzielisz store na slice'y?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nowy zestaw pytań" })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("explains the limit message from the server and keeps the saved set", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(textErrorResponse("Limit: 10 zestawów pytań na godzinę.", 429)),
    );
    const user = setup({ saved });

    await user.click(screen.getByRole("button", { name: "Nowy zestaw pytań" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Limit: 10 zestawów pytań");
    expect(screen.getByText("Jak podzielisz store na slice'y?")).toBeInTheDocument();
  });

  it("asks for a stack instead of offering an empty set", () => {
    setup({ hasStack: false });
    expect(screen.queryByRole("button", { name: "Przygotuj pytania" })).not.toBeInTheDocument();
    expect(screen.getByText(/Uzupełnij ją z ogłoszenia/)).toBeInTheDocument();
  });
});
