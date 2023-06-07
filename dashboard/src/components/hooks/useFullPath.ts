import { useRouter } from "next/router";

const objs = ["sessions", "transactions", "customers"];
export function useFullPath() {
  const router = useRouter();
  const parent = router.query.parent as string;
  const path = router.query.path ?? ([] as string[]);

  const pathArray = [parent, ...path];
  const lastItem = pathArray[pathArray.length - 1] as string;
  const lastItemIsId = !objs.includes(lastItem);

  return {
    pathArray,
    parent,
    lastItem,
    lastItemIsId,
  };
}
