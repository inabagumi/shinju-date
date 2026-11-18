// The format helpers build strings with `padStart` instead of `toLocaleString`
// because the output of `hour: '2-digit'` differs between Temporal
// implementations (the native one returns `1:22`, while temporal-polyfill
// returns `01:22`). The server uses the native implementation and some
// browsers use the polyfill, so relying on `toLocaleString` causes hydration
// errors.

export const padNumber = (value: number): string =>
  value.toString(10).padStart(2, "0");
