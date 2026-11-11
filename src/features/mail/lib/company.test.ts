import { normalizeCompany, roleSimilarity, sameCompany, senderCompany } from "./company";

describe("company names", () => {
  it("normalises legal forms, case, dots and Polish letters", () => {
    expect(normalizeCompany("BlueSoft Sp. z o.o.")).toBe("bluesoft");
    expect(normalizeCompany("INTERIA.PL Sp. z o.o.")).toBe("interiapl");
    expect(normalizeCompany("Wiór Games S.A.")).toBe("wiorgames");
    expect(normalizeCompany("Łódź Code")).toBe("lodzcode");
  });

  it("matches the same employer written differently", () => {
    expect(sameCompany("BlueSoft", "BlueSoft Sp. z o.o.")).toBe(true);
    expect(sameCompany("Interia", "INTERIA.PL Sp. z o.o.")).toBe(true);
    expect(sameCompany("Addepto", "addepto")).toBe(true);
    expect(sameCompany("Kreska Software", "Kropla Software")).toBe(false);
    expect(sameCompany("IBM", "IBMX Studio")).toBe(false); // too short to match inside
  });

  it("takes the employer from the sender's domain, but not from platforms", () => {
    expect(senderCompany("Addepto People & Culture Team <people@addepto.com>")).toBe("addepto");
    expect(senderCompany("House of Angular <hr@houseofangular.io>")).toBe("houseofangular");
    expect(senderCompany("eRecruiter <mail@stage.erecruiter.pl>")).toBeNull();
    expect(senderCompany("someone@gmail.com")).toBeNull();
    expect(senderCompany("no address")).toBeNull();
  });

  it("compares job titles by shared words", () => {
    expect(roleSimilarity("Frontend Developer", "Frontend Developer (React)")).toBe(1);
    expect(roleSimilarity("Mid React Developer", "Backend Java Engineer")).toBe(0);
  });
});
