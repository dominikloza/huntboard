import { offerUrlInMail, parseOfferUrl } from "./offer-url";

describe("parseOfferUrl", () => {
  it("accepts single offers on allowed boards and drops tracking", () => {
    expect(
      parseOfferUrl(
        "https://justjoin.it/job-offer/iteamly-staff-engineer-krakow-react?utm_source=mail",
      ),
    ).toBe("https://justjoin.it/job-offer/iteamly-staff-engineer-krakow-react");
    expect(parseOfferUrl(" https://nofluffjobs.com/pl/job/frontend-react-sor-warszawa/ ")).toBe(
      "https://nofluffjobs.com/pl/job/frontend-react-sor-warszawa",
    );
    expect(
      parseOfferUrl("https://www.pracuj.pl/praca/frontend-developer-warszawa,oferta,1004"),
    ).toBe("https://www.pracuj.pl/praca/frontend-developer-warszawa,oferta,1004");
  });

  it("refuses anything the server should not fetch", () => {
    for (const url of [
      "http://justjoin.it/job-offer/a", // not https
      "https://justjoin.it:8443/job-offer/a", // other port
      "https://user:pw@justjoin.it/job-offer/a",
      "https://justjoin.it.evil.com/job-offer/a",
      "https://evil.com/?u=https://justjoin.it/job-offer/a",
      "https://justjoin.it/job-offers/all-locations", // a listing, not an offer
      "https://localhost/job-offer/a",
      "not a url",
    ]) {
      expect(parseOfferUrl(url), url).toBeNull();
    }
  });
});

describe("offerUrlInMail", () => {
  const body = `You've just applied for Staff Software Engineer Kraków on Just Join IT to iTeamly.
<https://justjoin.it/job-offer/iteamly-staff-software-engineer-krakow-react?utm_campaign=x>
Check similar offers
<https://justjoin.it/job-offer/dcg-senior-frontend-developer-warszawa-react>
<https://rocket.pl/?utm_source=jjit>`;

  it("picks the offer the e-mail is about, not a similar one", () => {
    expect(offerUrlInMail(body, { company: "iTeamly", role: "Staff Software Engineer" })).toBe(
      "https://justjoin.it/job-offer/iteamly-staff-software-engineer-krakow-react",
    );
  });

  it("gives up when no link matches the card well enough", () => {
    expect(offerUrlInMail(body, { company: "Kreska", role: "Data Analyst" })).toBeNull();
    expect(offerUrlInMail("no links here", { company: "A", role: "B" })).toBeNull();
  });
});
