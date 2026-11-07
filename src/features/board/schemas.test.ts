import { applicationInputSchema } from "./schemas";

const valid = {
  company: "  Kropla Software ",
  role: "Mid Frontend Developer",
  status: "saved",
  workMode: "remote",
  city: "",
  seniority: "",
  salaryMin: "17 000",
  salaryMax: "22000",
  stack: "Next.js, Tailwind, , next.js, Playwright",
};

describe("applicationInputSchema", () => {
  it("normalises form strings into database values", () => {
    expect(applicationInputSchema.parse(valid)).toEqual({
      company: "Kropla Software",
      role: "Mid Frontend Developer",
      status: "saved",
      workMode: "remote",
      city: null,
      seniority: null,
      salaryMin: 17000,
      salaryMax: 22000,
      stack: ["Next.js", "Tailwind", "Playwright"],
    });
  });

  it("accepts its own output (the Server Action re-validates parsed data)", () => {
    const parsed = applicationInputSchema.parse(valid);
    expect(applicationInputSchema.parse(parsed)).toEqual(parsed);
  });

  it("requires company and role", () => {
    const result = applicationInputSchema.safeParse({ ...valid, company: " ", role: "" });
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((i) => i.path.join("."));
    expect(paths).toEqual(expect.arrayContaining(["company", "role"]));
  });

  it("rejects a salary range that goes down", () => {
    const result = applicationInputSchema.safeParse({
      ...valid,
      salaryMin: "22000",
      salaryMax: "17000",
    });
    expect(result.error?.issues[0]?.path).toEqual(["salaryMax"]);
  });

  it.each(["abc", "-5", "12.5", "999999"])("rejects salary %s", (value) => {
    expect(applicationInputSchema.safeParse({ ...valid, salaryMin: value }).success).toBe(false);
  });

  it("treats empty salaries as unknown", () => {
    const parsed = applicationInputSchema.parse({ ...valid, salaryMin: "", salaryMax: null });
    expect(parsed.salaryMin).toBeNull();
    expect(parsed.salaryMax).toBeNull();
  });

  it("rejects unknown statuses (e.g. a tampered request)", () => {
    expect(applicationInputSchema.safeParse({ ...valid, status: "hired" }).success).toBe(false);
  });
});
