import { render, screen } from "@testing-library/react";

import { type Application } from "../types";

import { OfferCard } from "./offer-card";

const base: Application = {
  id: "kropla-mid",
  status: "applied",
  company: "Kropla Software",
  role: "Mid Frontend Developer",
  salaryMin: 17000,
  salaryMax: 22000,
  workMode: "remote",
  city: null,
  stack: ["Next.js"],
  matchScore: 88,
};

describe("OfferCard", () => {
  it("shows role as a heading with company, salary and work mode", () => {
    render(<OfferCard application={base} />);
    expect(screen.getByRole("heading", { name: "Mid Frontend Developer" })).toBeInTheDocument();
    expect(screen.getByText("Kropla Software")).toBeInTheDocument();
    expect(screen.getByText("17-22k")).toBeInTheDocument();
    expect(screen.getByText("zdalnie")).toBeInTheDocument();
  });

  it("exposes the match score to screen readers", () => {
    render(<OfferCard application={base} />);
    expect(screen.getByRole("img", { name: "Dopasowanie 88 na 100" })).toBeInTheDocument();
  });

  it("shows the city for office roles and hides empty optional parts", () => {
    render(
      <OfferCard
        application={{ ...base, workMode: "office", city: "Wrocław", matchScore: null }}
      />,
    );
    expect(screen.getByText("Wrocław")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders a stamp only when it carries information", () => {
    const { rerender } = render(<OfferCard application={base} />);
    expect(screen.queryByText("Wysłano 04.11")).not.toBeInTheDocument();
    rerender(<OfferCard application={{ ...base, stamp: "Wysłano 04.11" }} />);
    expect(screen.getByText("Wysłano 04.11")).toBeInTheDocument();
  });
});
