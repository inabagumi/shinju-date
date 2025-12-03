/**
 * Creates a title from a feedback message by normalizing whitespace and truncating to a maximum length.
 *
 * This function takes a potentially multi-line message (which may include markdown formatting)
 * and converts it into a single-line title suitable for page metadata and browser tabs.
 *
 * @param message - The feedback message to convert into a title
 * @returns A normalized title string, truncated to 50 characters with "..." if longer
 *
 * @example
 * ```typescript
 * createTitleFromMessage("Hello\n\nworld") // "Hello world"
 * createTitleFromMessage("This is a very long message that exceeds the maximum length")
 * // "This is a very long message that exceeds the maxim..."
 * ```
 */
export function createTitleFromMessage(message: string): string {
  // Remove empty lines and normalize whitespace
  const cleaned = message.replaceAll(/\s+/g, ' ').trim()

  // Take first 50 characters
  const maxLength = 50
  if (cleaned.length <= maxLength) {
    return cleaned
  }
  return `${cleaned.substring(0, maxLength)}...`
}
