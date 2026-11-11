import { htmlToText, offerTextFromHtml } from "./offer-page";

const posting = {
  "@context": "https://schema.org",
  "@type": "JobPosting",
  title: "Frontend Engineer (React)",
  hiringOrganization: { "@type": "Organization", name: "GS Services" },
  jobLocation: [{ "@type": "Place", address: { addressLocality: "Kraków" } }],
  jobLocationType: "TELECOMMUTE",
  baseSalary: {
    "@type": "MonetaryAmount",
    currency: "PLN",
    value: { "@type": "QuantitativeValue", minValue: 18000, maxValue: 24000, unitText: "MONTH" },
  },
  employmentType: ["CONTRACTOR"],
  skills: ["React", "TypeScript", "Next.js"],
  description:
    "<p>Szukamy osoby do zespołu &amp; produktu.</p><ul><li>React 19</li><li>Testy w Vitest</li></ul><p>Wymagamy 3 lat doświadczenia z TypeScript i znajomości Next.js w produkcji.</p>",
};

const page = (head: string, body = "<nav>Menu</nav><main>Treść strony</main>") =>
  `<html><head>${head}</head><body>${body}</body></html>`;

describe("offerTextFromHtml", () => {
  it("reads the JobPosting job boards publish for Google Jobs", () => {
    const text = offerTextFromHtml(
      page(`<script type="application/ld+json">${JSON.stringify(posting)}</script>`),
    );
    expect(text).toContain("Frontend Engineer (React)");
    expect(text).toContain("Firma: GS Services");
    expect(text).toContain("Lokalizacja: Kraków, praca zdalna");
    expect(text).toContain("Wynagrodzenie: 18000 - 24000 PLN MONTH");
    expect(text).toContain("Umiejętności: React, TypeScript, Next.js");
    expect(text).toContain("zespołu & produktu");
    expect(text).toContain("- React 19");
    expect(text).not.toContain("Menu");
  });

  it("finds the posting inside @graph and skips broken JSON", () => {
    const html = page(
      `<script type="application/ld+json">{broken</script>` +
        `<script type="application/ld+json">${JSON.stringify({ "@graph": [{ "@type": "WebPage" }, posting] })}</script>`,
    );
    expect(offerTextFromHtml(html)).toContain("Firma: GS Services");
  });

  it("falls back to the visible text, without navigation and scripts", () => {
    const text = offerTextFromHtml(
      page(
        "",
        "<nav>Menu</nav><main><h1>Oferta</h1><p>React i TypeScript</p></main><script>x()</script>",
      ),
    );
    expect(text).toBe("Oferta\nReact i TypeScript");
  });
});

describe("htmlToText", () => {
  it("decodes entities, numeric ones too", () => {
    expect(htmlToText("<p>a&nbsp;&#8211;&#x41;&lt;b&gt;</p>")).toBe("a –A<b>");
  });
});
