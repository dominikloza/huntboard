import { NOTE_MAX_LENGTH, noteInputSchema } from "./schemas";

const applicationId = "0b6c4f4e-1f1a-4a52-9a52-0d8b3b0d1b11";

describe("noteInputSchema", () => {
  it("trims the note", () => {
    expect(noteInputSchema.parse({ applicationId, body: "  Oddzwonią.  " }).body).toBe(
      "Oddzwonią.",
    );
  });

  it("rejects empty and too long notes with Polish messages", () => {
    const empty = noteInputSchema.safeParse({ applicationId, body: "   " });
    expect(empty.error?.issues[0]?.message).toBe("Wpisz treść notatki.");
    const long = noteInputSchema.safeParse({
      applicationId,
      body: "x".repeat(NOTE_MAX_LENGTH + 1),
    });
    expect(long.error?.issues[0]?.message).toBe("Maksymalnie 2000 znaków.");
  });

  it("rejects an id that is not a uuid", () => {
    expect(noteInputSchema.safeParse({ applicationId: "1 OR 1=1", body: "x" }).success).toBe(false);
  });
});
