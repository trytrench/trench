export function customDecodeURIComponent(str: string | undefined) {
  if (!str) return str;
  return decodeURIComponent(str);
}

export function customEncodeURIComponent(str: string | undefined) {
  if (!str) return str;
  return encodeURIComponent(str);
}
