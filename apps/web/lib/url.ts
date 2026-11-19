export const parseQueries = (queries?: string[]): string =>
  queries ? queries.map(decodeURIComponent).join("/") : "";
