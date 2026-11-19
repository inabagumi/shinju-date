const MAX_LENGTH = 40;

/**
 * Creates the name of a feedback for the audit log: the first 40 characters
 * of the message, on one line.
 *
 * The message is cut between characters, not between UTF-16 code units, so
 * that an emoji at the end is not cut in half. Half of a surrogate pair is
 * not valid in `jsonb`, and the audit log entry would not be recorded.
 */
export const createEntityNameFromMessage = (message: string): string => {
  const characters = [...message.replaceAll(/\s+/gu, " ").trim()];

  return characters.slice(0, MAX_LENGTH).join("");
};
