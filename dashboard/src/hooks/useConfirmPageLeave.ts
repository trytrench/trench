import { useRouter } from "next/router";
import { useEffect } from "react";
import useBeforeUnload from "./useBeforeUnload";

export const useConfirmPageLeave = (enabled: boolean, message: string) => {
  const router = useRouter();
  useBeforeUnload(enabled, message);
  useEffect(() => {
    const handler = () => {
      if (enabled && !window.confirm(message)) {
        throw "Route change aborted";
      }
    };
    router.events.on("routeChangeStart", handler);
    return () => {
      router.events.off("routeChangeStart", handler);
    };
  }, [enabled, router.events, message]);
};
