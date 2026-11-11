import { plainMailText, sanitizeReading } from "./sanitize";

const reading = { kind: "applied" as const, sure: true };

describe("plainMailText", () => {
  it("drops images, links and bold markers from Gmail's plain body", () => {
    expect(
      plainMailText(
        "You applied for *Frontend Engineer* to *GS Services*.\n[image: aplikacja] <https://rocket.pl/?utm_source=x> see https://justjoin.it/offers/1",
      ),
    ).toBe("You applied for Frontend Engineer to GS Services.\nsee");
  });

  it("keeps words with underscores or stars inside", () => {
    expect(plainMailText("C++ and snake_case 5*4")).toBe("C++ and snake_case 5*4");
  });
});

describe("sanitizeReading", () => {
  it("cleans the GS Services misread: bold company, a link as the city", () => {
    expect(
      sanitizeReading({
        ...reading,
        company: "*GS Services*",
        role: "Frontend Engineer | React + Next.js",
        city: "[image: aplikacja] <https://rocket.pl/?utm_source=jjit>",
      }),
    ).toMatchObject({
      company: "GS Services",
      role: "Frontend Engineer | React + Next.js",
      city: null,
    });
  });

  it("keeps a real city and drops anything that cannot be one", () => {
    expect(sanitizeReading({ ...reading, company: "A", role: "B", city: "Kraków" }).city).toBe(
      "Kraków",
    );
    expect(sanitizeReading({ ...reading, company: "A", role: "B", city: "ID: 1234" }).city).toBe(
      null,
    );
    expect(sanitizeReading({ ...reading, company: " ", role: "B", city: null }).company).toBe(null);
  });
});
