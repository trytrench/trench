import { VirtualFilesystem, compileFromFilesystem, type Instance } from "sqrl";

export const compileSqrl = async (
  instance: Instance,
  files: Record<string, string>
) => {
  const fs = new VirtualFilesystem(files);

  return compileFromFilesystem(instance, fs);
};
