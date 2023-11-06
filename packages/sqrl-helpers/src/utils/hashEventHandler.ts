import { Sha1 } from "../lib/Sha1";

function hashStringToHex(str: string): string {
  const sha1 = new Sha1();

  sha1.update(str);

  // Get the hash in hexadecimal format
  return sha1.hex();
}
export function hashEventHandler({
  code,
}: {
  code: Record<string, string>;
}): string {
  const payload = {
    code,
  };

  return hashStringToHex(JSON.stringify(payload));
}
