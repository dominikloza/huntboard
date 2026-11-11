import { readFileSync } from "node:fs";
import path from "node:path";

import { readKnownSender } from "./known-senders";
import { mailCasesSchema } from "./mail-cases";

const cases = mailCasesSchema.parse(
  JSON.parse(readFileSync(path.join(process.cwd(), "evals/mail/cases.json"), "utf8")),
);
const byId = (id: string) => {
  const found = cases.find((c) => c.id === id);
  if (!found) throw new Error(`no case ${id}`);
  return found;
};

describe("readKnownSender", () => {
  it.each([
    "jjit-applied",
    "nfj-applied",
    "nfj-in-progress",
    "erecruiter-bluesoft",
    "erecruiter-interia",
  ])("reads %s with rules, exactly as expected", (id) => {
    const c = byId(id);
    const reading = readKnownSender(c);
    expect(reading).toMatchObject({ ...c.expected, sure: true });
  });

  it("keeps the city Just Join IT adds after the title", () => {
    expect(readKnownSender(byId("jjit-applied"))?.city).toBe("Kraków");
  });

  it("maps No Fluff Jobs status words to stages", () => {
    const status = (s: string) =>
      readKnownSender({
        from: "No Fluff Jobs <noreply@nofluffjobs.com>",
        subject: `[Automatic notification of status change] Your application for the position React Dev @ Kreska has changed its status to ${s}`,
        body: "",
      })?.kind;
    expect(status("rejected")).toBe("rejected");
    expect(status("interview")).toBe("interview");
    expect(status("offer")).toBe("offer");
    expect(status("in progress")).toBe("progress");
  });

  it("leaves company e-mails and look-alike senders to the AI", () => {
    expect(readKnownSender(byId("addepto-rejection"))).toBeNull();
    expect(readKnownSender(byId("hoa-applied-soft-no"))).toBeNull();
    expect(
      readKnownSender({
        from: "Fake <no-reply@justjoin.it.evil.example>",
        subject: "You applied for Senior Dev",
        body: "You've just applied for Senior Dev on Just Join IT to Evil.",
      }),
    ).toBeNull();
  });
});
