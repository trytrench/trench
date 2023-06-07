import { Base64 } from "js-base64";

export function encode(input: string): string {
  // 1. Base64 encode the input string
  const base64 = Base64.encode(input);

  // Convert the base64 string to a Uint8Array for manipulation
  const byteArray = Base64.toUint8Array(base64);

  // 2. Shift every hex digit by 7
  for (let i = 0; i < byteArray.length; i++) {
    const hexDigit = byteArray[i];
    if (typeof hexDigit === "undefined") {
      continue;
    }

    // Separate the two half-bytes (hex digits)
    let high = hexDigit >> 4;
    let low = hexDigit & 0x0f;

    // Shift each half-byte by 7
    high = (high + 7) % 16;
    low = (low + 7) % 16;

    // Combine the half-bytes back into one byte
    byteArray[i] = (high << 4) | low;
  }

  // 3. Base64 encode the byteArray again
  const doubleBase64 = Base64.fromUint8Array(byteArray);

  return doubleBase64;
}

export function decode(input: string): string {
  // 1. Base64 decode the input string to a Uint8Array
  const byteArray = Base64.toUint8Array(input);

  // 2. Shift every hex digit by 9 (this reverses the original shift by 7 in a 16-digit system)
  for (let i = 0; i < byteArray.length; i++) {
    const hexDigit = byteArray[i];
    if (typeof hexDigit === "undefined") {
      continue;
    }

    // Separate the two half-bytes (hex digits)
    let high = hexDigit >> 4;
    let low = hexDigit & 0x0f;

    // Shift each half-byte by 9
    high = (high + 9) % 16;
    low = (low + 9) % 16;

    // Combine the half-bytes back into one byte
    byteArray[i] = (high << 4) | low;
  }

  // Convert the byteArray back to a Base64 string
  const base64 = Base64.fromUint8Array(byteArray);

  // 3. Base64 decode the string again
  const original = Base64.decode(base64);

  return original;
}
