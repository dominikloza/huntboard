import { mailBatchSchema, MAIL_BATCH_MAX, MAIL_BODY_MAX } from "../schemas";

import { appsScript } from "./apps-script";

describe("appsScript", () => {
  const code = appsScript("https://huntboard-two.vercel.app/");

  it("posts to this instance's mail endpoint", () => {
    expect(code).toContain(
      'const HUNTBOARD_URL = "https://huntboard-two.vercel.app/api/mail/messages";',
    );
  });

  it("reads the token from the script properties, never from the code", () => {
    expect(code).toContain('getProperty("HUNTBOARD_TOKEN")');
    expect(code).not.toMatch(/hb_mail_/);
  });

  it("sends batches the endpoint accepts", () => {
    expect(code).toContain(`const BATCH = ${MAIL_BATCH_MAX};`);
    expect(code).toContain(`.slice(0, ${MAIL_BODY_MAX})`);
    const sample = {
      messages: [
        {
          messageId: "18c2f",
          from: "No Fluff Jobs <notifications@nofluffjobs.com>",
          subject: "Your application for X @ Y",
          date: new Date().toISOString(),
          body: "x",
        },
      ],
    };
    expect(mailBatchSchema.safeParse(sample).success).toBe(true);
  });

  it("is plain JavaScript that parses", () => {
    expect(() => new Function(code)).not.toThrow();
  });
});
