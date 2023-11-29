import { CheckIcon, Loader2, XIcon } from "lucide-react";
import { useAtom } from "jotai";
import { compileStatusAtom } from "../../../global-state/editor";

export function CompileStatusIndicator() {
  const [compileStatus] = useAtom(compileStatusAtom);

  if (compileStatus.status === "compiling") {
    return (
      <div className="flex items-center text-xs gap-1">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>{compileStatus.message}</span>
      </div>
    );
  } else if (compileStatus.status === "error") {
    return (
      <div className="flex items-center text-xs gap-1 text-red-600">
        <XIcon className="w-4 h-4 " />
        <span>{"Compilation error"}</span>
      </div>
    );
  } else if (compileStatus.status === "success") {
    return (
      <div className="flex items-center text-xs gap-1 text-lime-400">
        <CheckIcon className="w-4 h-4" />
        <span>{compileStatus.message}</span>
      </div>
    );
  } else {
    return null;
  }
}
