import { customAlphabet } from "nanoid";

export function generateNanoId(
  size = 21,
  alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
) {
  const nanoId = customAlphabet(alphabet, size);
  return nanoId();
}

export function assert(condition: any, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}
