import { SimpleContext } from "sqrl/lib/platform/Trace";
import { SimpleDatabaseSet } from "sqrl/lib/platform/DatabaseSet";
import { getGlobalLogger } from "sqrl";

export function createContext(databaseId: string) {
  return new SimpleContext(
    new SimpleDatabaseSet(databaseId),
    getGlobalLogger()
  );
}
