import { SimHash } from "simhash-js";

export function normalize(markdownText: string): string {
  // Regular expression to match @user mentions
  const mentionRegex = /(?:^|\s)@([a-zA-Z0-9_-]+)/g;

  // Matches for code blocks, inline code, and HTML comments to be excluded
  const excludeRegex = /(```[\s\S]*?```|`[^`]*`|<!--[\s\S]*?-->)/g;

  // Remove the parts of the text that should be excluded from the search
  let sanitizedText = markdownText.replace(excludeRegex, "");

  // Replace each @user mention with @user
  sanitizedText = sanitizedText.replace(mentionRegex, "");

  return sanitizedText;
}

const jsSimhash = new SimHash({
  kshingles: 3,
});

export function simhash(text: string) {
  const hashHex: string = jsSimhash.hash(text).toString(16);
  return hashHex.padStart(8, "0");
}
