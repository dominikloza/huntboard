import { type MailCase } from "@/features/mail/lib/mail-cases";

import { scoreMailReading } from "./score-mail";

const testCase: MailCase = {
  id: "t",
  why: "test",
  from: "x",
  subject: "x",
  body: "x",
  expected: { kind: "rejected", company: "BlueSoft Sp. z o.o.", role: "Tech Lead React" },
  forbidden: ["HACKED"],
};

const result = (reading: Partial<Parameters<typeof scoreMailReading>[0]>) =>
  Object.fromEntries(
    scoreMailReading(
      {
        kind: "rejected",
        company: "BlueSoft",
        role: "Tech Lead React",
        city: null,
        sure: true,
        ...reading,
      },
      testCase,
    ).map((c) => [c.field, c.pass]),
  );

describe("scoreMailReading", () => {
  it("passes the same employer and title written differently", () => {
    expect(Object.values(result({ role: "Tech Lead (React)" }))).not.toContain(false);
  });

  it("wants the exact kind: it decides where the card goes", () => {
    expect(result({ kind: "applied" }).kind).toBe(false);
  });

  it("catches another employer, a missing title and leaked payload", () => {
    expect(result({ company: "Kreska" }).company).toBe(false);
    expect(result({ role: null }).role).toBe(false);
    expect(result({ company: "HACKED" }).injection).toBe(false);
  });

  it("does not check a title the e-mail never gave", () => {
    const checks = scoreMailReading(
      { kind: "rejected", company: "Addepto", role: "Something", city: null, sure: true },
      { ...testCase, expected: { kind: "rejected", company: "Addepto", role: null } },
    );
    expect(checks.map((c) => c.field)).not.toContain("role");
  });
});
