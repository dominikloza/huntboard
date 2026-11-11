import { fetchOfferPage } from "./fetch-offer";

const OFFER = "https://justjoin.it/job-offer/gs-services-frontend-engineer-react";
const html = `<html><body><main><h1>Frontend Engineer</h1><p>${"React TypeScript Next.js. ".repeat(10)}</p></main></body></html>`;

const reply = (status: number, body = "", headers: Record<string, string> = {}) =>
  new Response(status >= 300 && status < 400 ? null : body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", ...headers },
  });

describe("fetchOfferPage", () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("returns the offer text of an allowed board", async () => {
    fetchMock.mockResolvedValueOnce(reply(200, html));
    const result = await fetchOfferPage(`${OFFER}?utm_source=mail`);
    expect(result).toMatchObject({ ok: true, url: OFFER });
    expect(result.ok && result.text).toContain("Frontend Engineer");
    expect(fetchMock).toHaveBeenCalledWith(OFFER, expect.objectContaining({ redirect: "manual" }));
  });

  it("never fetches a link outside the allowlist", async () => {
    const result = await fetchOfferPage("https://169.254.169.254/latest/meta-data");
    expect(result.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("follows a redirect only to another offer of an allowed board", async () => {
    fetchMock
      .mockResolvedValueOnce(reply(301, "", { location: "/job-offer/gs-services-frontend-2" }))
      .mockResolvedValueOnce(reply(200, html));
    expect(await fetchOfferPage(OFFER)).toMatchObject({
      ok: true,
      url: "https://justjoin.it/job-offer/gs-services-frontend-2",
    });

    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(reply(302, "", { location: "http://10.0.0.1/admin" }));
    expect(await fetchOfferPage(OFFER)).toMatchObject({ ok: false });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("explains an expired offer, an empty page and a network error", async () => {
    fetchMock.mockResolvedValueOnce(reply(404));
    expect(await fetchOfferPage(OFFER)).toMatchObject({
      ok: false,
      error: expect.stringMatching(/wygasła/),
    });

    fetchMock.mockResolvedValueOnce(reply(200, "<html><body>Cookies</body></html>"));
    expect(await fetchOfferPage(OFFER)).toMatchObject({
      ok: false,
      error: expect.stringMatching(/Nie znalazłem/),
    });

    vi.spyOn(console, "error").mockImplementation(() => undefined);
    fetchMock.mockRejectedValueOnce(new Error("timeout"));
    expect(await fetchOfferPage(OFFER)).toMatchObject({
      ok: false,
      error: expect.stringMatching(/Nie udało/),
    });
  });
});
