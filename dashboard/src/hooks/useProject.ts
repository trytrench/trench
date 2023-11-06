import { useRouter } from "next/router";
import { api } from "../utils/api";

export function useProject() {
  const router = useRouter();
  return api.project.getByName.useQuery(
    { name: router.query.project as string },
    { enabled: !!router.query.project }
  );
}
