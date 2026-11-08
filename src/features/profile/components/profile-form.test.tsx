import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { applicationKeys } from "@/features/board/query-keys";
import { renderWithQuery } from "@/test/render";

import { saveProfile } from "../actions";
import { type ProfileFormValues } from "../schemas";

import { ProfileForm } from "./profile-form";

vi.mock("../actions", () => ({ saveProfile: vi.fn() }));

const values: ProfileFormValues = {
  skills: "React, TypeScript",
  yearsExperience: "3",
  salaryMin: "18000",
  remotePreference: "remote",
  bio: "",
};

function setup() {
  const view = renderWithQuery(<ProfileForm defaultValues={values} />);
  const invalidate = vi.spyOn(view.queryClient, "invalidateQueries");
  return { invalidate, user: userEvent.setup() };
}

afterEach(() => vi.mocked(saveProfile).mockReset());

describe("ProfileForm", () => {
  it("validates on the client with the shared schema", async () => {
    const { user } = setup();
    await user.clear(screen.getByLabelText("Twoje technologie"));
    await user.clear(screen.getByLabelText("Lata doświadczenia"));
    await user.type(screen.getByLabelText("Lata doświadczenia"), "70");
    await user.click(screen.getByRole("button", { name: "Zapisz profil" }));

    expect(await screen.findByText("Wpisz co najmniej jedną technologię.")).toBeInTheDocument();
    expect(screen.getByLabelText("Lata doświadczenia")).toHaveAccessibleDescription(
      "Wpisz liczbę lat od 0 do 60.",
    );
    expect(saveProfile).not.toHaveBeenCalled();
  });

  it("saves parsed values, refreshes the board and says how many scores changed", async () => {
    vi.mocked(saveProfile).mockResolvedValue({ ok: true, data: { rescored: 3 } });
    const { user, invalidate } = setup();
    await user.type(screen.getByLabelText("Twoje technologie"), ", Redux, react");
    await user.click(screen.getByRole("button", { name: "Zapisz profil" }));

    expect(
      await screen.findByText("Zapisano. Przeliczyłem dopasowanie: 3 karty."),
    ).toBeInTheDocument();
    expect(saveProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        // Duplicates (case-insensitive) dropped, numbers parsed.
        skills: ["React", "TypeScript", "Redux"],
        yearsExperience: 3,
        salaryMin: 18000,
      }),
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: applicationKeys.all });
    expect(screen.getByRole("link", { name: "Wróć do kartoteki" })).toHaveAttribute(
      "href",
      "/board",
    );
  });

  it("uses the right Polish form for the number of cards", async () => {
    vi.mocked(saveProfile).mockResolvedValue({ ok: true, data: { rescored: 5 } });
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Zapisz profil" }));
    expect(
      await screen.findByText("Zapisano. Przeliczyłem dopasowanie: 5 kart."),
    ).toBeInTheDocument();
  });

  it("shows server errors on the fields and keeps the input", async () => {
    vi.mocked(saveProfile).mockResolvedValue({
      ok: false,
      error: "Popraw zaznaczone pola.",
      fieldErrors: { salaryMin: ["Wpisz kwotę od 0 do 200000 zł."] },
    });
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Zapisz profil" }));
    expect(await screen.findByText("Popraw zaznaczone pola.")).toHaveAttribute("role", "alert");
    expect(screen.getByLabelText("Minimum (zł / mies.)")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Twoje technologie")).toHaveValue("React, TypeScript");
  });
});
