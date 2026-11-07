import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DEMO_APPLICATIONS } from "../lib/demo-data";

import { ApplicationForm, EMPTY_APPLICATION_FORM, toFormValues } from "./application-form";

const demo = DEMO_APPLICATIONS[0];
if (!demo) throw new Error("fixture missing");

function setup(onSubmit = vi.fn()) {
  const onSuccess = vi.fn();
  render(
    <ApplicationForm
      defaultValues={EMPTY_APPLICATION_FORM}
      submitLabel="Dodaj"
      pendingLabel="Zapisuję..."
      onSubmit={onSubmit}
      onSuccess={onSuccess}
      onCancel={vi.fn()}
    />,
  );
  return { onSubmit, onSuccess, user: userEvent.setup() };
}

describe("ApplicationForm", () => {
  it("shows field errors and does not call the server for invalid input", async () => {
    const { onSubmit, user } = setup();
    await user.click(screen.getByRole("button", { name: "Dodaj" }));

    expect(await screen.findByText("Podaj nazwę firmy.")).toBeInTheDocument();
    expect(screen.getByLabelText("Firma")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Firma")).toHaveAccessibleDescription("Podaj nazwę firmy.");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("sends parsed values (numbers, arrays) to the server", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ ok: true, data: demo });
    const { onSuccess, user } = setup(onSubmit);

    await user.type(screen.getByLabelText("Firma"), "Wisła Data");
    await user.type(screen.getByLabelText("Stanowisko"), "Frontend Developer");
    await user.type(screen.getByLabelText("Widełki od (zł / mies.)"), "18 000");
    await user.type(screen.getByLabelText("Stack"), "React, TypeScript");
    await user.click(screen.getByRole("button", { name: "Dodaj" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        company: "Wisła Data",
        salaryMin: 18000,
        stack: ["React", "TypeScript"],
      }),
    );
    expect(onSuccess).toHaveBeenCalledWith(demo);
  });

  it("shows errors returned by the Server Action on the right fields", async () => {
    const onSubmit = vi.fn().mockResolvedValue({
      ok: false,
      error: "Popraw zaznaczone pola.",
      fieldErrors: { role: ["Za długie stanowisko."] },
    });
    const { onSuccess, user } = setup(onSubmit);

    await user.type(screen.getByLabelText("Firma"), "Wisła Data");
    await user.type(screen.getByLabelText("Stanowisko"), "Frontend Developer");
    await user.click(screen.getByRole("button", { name: "Dodaj" }));

    expect(await screen.findByText("Za długie stanowisko.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Popraw zaznaczone pola.");
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("prefills the form from a card", () => {
    expect(toFormValues(demo)).toMatchObject({
      company: demo.company,
      salaryMin: String(demo.salaryMin),
      stack: demo.stack.join(", "),
      city: "",
    });
  });
});
