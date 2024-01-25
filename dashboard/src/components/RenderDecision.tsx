import { Decision } from "@prisma/client";
import { AlertTriangle, Ban, Check } from "lucide-react";

interface Props {
  decision: Decision;
}

export function RenderDecision({ decision }: Props) {
  return (
    <div className="flex text-sm font-medium items-center">
      {decision?.type === "Allow" ? (
        <>
          <Check className="w-4 h-4 mr-1.5 text-green-500" />
          Allow
        </>
      ) : decision?.type === "Block" ? (
        <>
          <Ban className="w-4 h-4 mr-1.5 text-red-500" />
          Block
        </>
      ) : decision?.type === "Watch" ? (
        <>
          <AlertTriangle className="w-4 h-4 mr-1.5 text-yellow-500" />
          Watch
        </>
      ) : null}
    </div>
  );
}
