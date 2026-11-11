import { decideMail, findCard } from "./decide";
import { type CardForMail, type MailReading } from "./types";

const cards: CardForMail[] = [
  { id: "a", company: "Addepto", role: "Frontend Developer", status: "applied" },
  { id: "b", company: "BlueSoft", role: "Tech Lead React", status: "saved" },
  { id: "k1", company: "Kreska Software", role: "Frontend Developer (React)", status: "applied" },
  { id: "k2", company: "Kreska Software", role: "Backend Java Engineer", status: "applied" },
  { id: "r", company: "Wiór Games", role: "UI Developer", status: "rejected" },
];

const reading = (r: Partial<MailReading>): MailReading => ({
  kind: "applied",
  company: null,
  role: null,
  city: null,
  sure: true,
  ...r,
});

describe("decideMail", () => {
  it("creates a card for a confirmation with no matching card", () => {
    const r = reading({ company: "iTeamly", role: "Staff Software Engineer" });
    expect(decideMail(r, "no-reply@justjoin.it", cards)).toEqual({ action: "create" });
  });

  it("moves a saved card to applied when the confirmation arrives", () => {
    const r = reading({ company: "BlueSoft Sp. z o.o.", role: "Tech Lead React" });
    expect(decideMail(r, "mail@stage.erecruiter.pl", cards)).toEqual({
      action: "move",
      applicationId: "b",
      from: "saved",
      to: "applied",
    });
  });

  it("finds the card by the sender's domain when the e-mail names no company", () => {
    const r = reading({ kind: "rejected" });
    expect(decideMail(r, "people@addepto.com", cards)).toMatchObject({
      action: "move",
      applicationId: "a",
      to: "rejected",
    });
  });

  it("picks the right card by title when a company has two", () => {
    const r = reading({
      kind: "interview",
      company: "Kreska Software",
      role: "Frontend Developer",
    });
    expect(decideMail(r, "x@kreska.dev", cards)).toMatchObject({
      action: "move",
      applicationId: "k1",
    });
  });

  it("asks instead of guessing when two cards fit equally", () => {
    const r = reading({ kind: "interview", company: "Kreska Software", role: null });
    expect(decideMail(r, "x@kreska.dev", cards)).toMatchObject({
      action: "proposal",
      to: "interview",
    });
  });

  it("turns an unsure AI reading into a proposal", () => {
    const r = reading({ kind: "rejected", company: "Addepto", sure: false });
    expect(decideMail(r, "people@addepto.com", cards)).toMatchObject({
      action: "proposal",
      applicationId: "a",
    });
  });

  it("never moves a card backwards or out of rejected", () => {
    expect(
      decideMail(
        reading({ company: "Kreska Software", role: "Frontend Developer (React)" }),
        "",
        cards,
      ),
    ).toEqual({
      action: "none",
      applicationId: "k1",
    });
    expect(decideMail(reading({ kind: "interview", company: "Wiór Games" }), "", cards)).toEqual({
      action: "none",
      applicationId: "r",
    });
  });

  it("treats another job at a known company as a new application", () => {
    const r = reading({ company: "Addepto", role: "Data Engineer" });
    expect(decideMail(r, "people@addepto.com", cards)).toEqual({ action: "create" });
  });

  it("reports answers it cannot place and ignores progress and other e-mails", () => {
    expect(decideMail(reading({ kind: "rejected", company: "Nowa Firma" }), "", cards)).toEqual({
      action: "unmatched",
    });
    expect(decideMail(reading({ kind: "progress", company: "Addepto" }), "", cards)).toEqual({
      action: "none",
      applicationId: "a",
    });
    expect(decideMail(reading({ kind: "applied" }), "", cards)).toEqual({ action: "unmatched" });
  });
});

describe("findCard", () => {
  it("finds nothing for an unknown employer", () => {
    expect(findCard({ company: "Nowa Firma", role: null }, "x@nowa.pl", cards)).toEqual({
      card: null,
      ambiguous: false,
    });
  });
});
