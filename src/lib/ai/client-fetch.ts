/**
 * `fetch` for useObject. It shows a failed response's body as the error, and our Route
 * Handlers answer with Polish plain text; a network failure gets its own Polish message
 * instead of "Failed to fetch". A user's Stop (AbortError) passes through.
 */
export const aiFetch: typeof fetch = async (input, init) => {
  try {
    return await fetch(input, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new Error("Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.");
  }
};
