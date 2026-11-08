import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { createApplication } from "@/features/board/actions";
import { boardFixture } from "@/features/board/lib/test-fixtures";
import { renderWithQuery } from "@/test/render";
import { requestBody, streamedResponse, textErrorResponse } from "@/test/stream";

import { type OfferExtraction } from "../schemas";

import { OfferIntake } from "./offer-intake";

vi.mock("@/features/board/actions", () => ({
  createApplication: vi.fn(),
  updateApplication: vi.fn(),
  deleteApplication: vi.fn(),
}));

const OFFER =
  "Frontend Developer (React) w Kreska Software, Wrocław, hybrydowo, 16-22k B2B. React, TypeScript, Next.js.";

const extraction: OfferExtraction = {
  company: "Kreska Software",
  role: "Frontend Developer (React)",
  seniority: "Mid",
  workMode: "hybrid",
  city: "Wrocław",
  salaryMin: 16000,
  salaryMax: 22000,
  stack: ["React", "TypeScript", "Next.js"],
  redFlags: ["Zadanie rekrutacyjne bez wynagrodzenia."],
};

function setup() {
  const onDone = vi.fn();
  renderWithQuery(<OfferIntake onDone={onDone} />);
  return { onDone, user: userEvent.setup() };
}

async function paste(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.click(screen.getByLabelText("Treść ogłoszenia"));
  await user.paste(text);
  await user.click(screen.getByRole("button", { name: "Wypełnij z AI" }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.mocked(createApplication).mockReset();
});

describe("OfferIntake", () => {
  it("checks the length before calling the AI", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { user } = setup();
    await paste(user, "React Developer");
    expect(screen.getByText("Wklej całe ogłoszenie (min. 80 znaków).")).toBeInTheDocument();
    expect(screen.getByLabelText("Treść ogłoszenia")).toHaveAttribute("aria-invalid", "true");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fills the form from the stream and saves the offer with its warnings", async () => {
    const fetchMock = vi.fn().mockResolvedValue(streamedResponse(JSON.stringify(extraction)));
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(createApplication).mockResolvedValue({ ok: true, data: boardFixture()[0]! });
    const { user, onDone } = setup();

    await paste(user, OFFER);
    expect(await screen.findByText(/^Gotowe\./)).toHaveAttribute("role", "status");
    expect(requestBody(fetchMock)).toEqual({ offer: OFFER });
    expect(screen.getByLabelText("Firma")).toHaveValue("Kreska Software");
    expect(screen.getByLabelText("Widełki do (zł / mies.)")).toHaveValue("22000");
    expect(screen.getByLabelText("Stack")).toHaveValue("React, TypeScript, Next.js");
    const warnings = screen.getByRole("region", { name: "Na co uważać" });
    expect(within(warnings).getByRole("listitem")).toHaveTextContent("bez wynagrodzenia");

    // The user corrects the AI before saving.
    await user.clear(screen.getByLabelText("Miasto"));
    await user.type(screen.getByLabelText("Miasto"), "Wrocław (Nadodrze)");
    await user.click(screen.getByRole("button", { name: "Dodaj do kartoteki" }));

    expect(createApplication).toHaveBeenCalledWith(
      expect.objectContaining({
        company: "Kreska Software",
        city: "Wrocław (Nadodrze)",
        salaryMin: 16000,
        stack: ["React", "TypeScript", "Next.js"],
        rawOffer: OFFER,
        redFlags: ["Zadanie rekrutacyjne bez wynagrodzenia."],
      }),
    );
    expect(onDone).toHaveBeenCalled();
  });

  it("shows the server's message and a retry when the AI refuses", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(textErrorResponse("Limit: 10 wypełnień z AI na godzinę.", 429))
        .mockResolvedValueOnce(streamedResponse(JSON.stringify(extraction))),
    );
    const { user } = setup();
    await paste(user, OFFER);
    expect(await screen.findByText("Limit: 10 wypełnień z AI na godzinę.")).toHaveAttribute(
      "role",
      "alert",
    );

    await user.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));
    expect(await screen.findByText(/^Gotowe\./)).toHaveAttribute("role", "status");
    expect(screen.getByLabelText("Firma")).toHaveValue("Kreska Software");
  });

  it("tells the user when the text was not a job offer", async () => {
    const empty: OfferExtraction = {
      ...extraction,
      company: "",
      role: "",
      stack: [],
      redFlags: [],
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamedResponse(JSON.stringify(empty))));
    const { user } = setup();
    await paste(user, `${OFFER} To jest wpis na blogu, nie ogłoszenie.`);
    expect(await screen.findByText(/^To nie wygląda na ogłoszenie o pracę\./)).toHaveAttribute(
      "role",
      "status",
    );
  });

  it("keeps what arrived when the stream is cut, and says so", async () => {
    const half = JSON.stringify(extraction).slice(0, 60); // ends in the middle of the object
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamedResponse(half)));
    const { user } = setup();
    await paste(user, OFFER);
    expect(
      await screen.findByText("AI nie dokończyło odpowiedzi. Sprawdź pola i uzupełnij braki."),
    ).toHaveAttribute("role", "status");
    expect(screen.getByLabelText("Firma")).toHaveValue("Kreska Software");
    expect(screen.getByLabelText("Stack")).toHaveValue("");
  });

  it("goes straight to an empty form when typing by hand", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Wpisz ręcznie" }));
    expect(screen.getByLabelText("Firma")).toHaveValue("");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
