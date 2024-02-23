export function countUserMentions(markdownText: string): number {
  // Regular expression to match @user mentions
  const mentionRegex = /(?:^|\s)@([a-zA-Z0-9_-]+)/g;

  // Matches for code blocks, inline code, and HTML comments to be excluded
  const excludeRegex = /(```[\s\S]*?```|`[^`]*`|<!--[\s\S]*?-->)/g;

  // Remove the parts of the text that should be excluded from the search
  const sanitizedText = markdownText.replace(excludeRegex, "");

  const uniqueMentions = new Set();

  // Find all mentions in the sanitized text and add them to the Set
  let match;
  while ((match = mentionRegex.exec(sanitizedText)) !== null) {
    // Add the matched username (match[1] contains the username without the @ symbol) to the Set
    uniqueMentions.add(match[1]);
  }

  // Return the number of unique mentions found
  return uniqueMentions.size;
}
