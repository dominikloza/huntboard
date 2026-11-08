/** Errors are plain text: useObject shows the response body as the error message. */
export function textError(message: string, status: number, headers: Record<string, string> = {}) {
  return new Response(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

/** Resolves with the value, or undefined after `ms` (a cancelled stream never settles). */
export function settleWithin<T>(promise: PromiseLike<T>, ms: number): Promise<T | undefined> {
  return Promise.race([
    Promise.resolve(promise).then(
      (value) => value,
      () => undefined,
    ),
    new Promise<undefined>((resolve) => setTimeout(resolve, ms)),
  ]);
}
