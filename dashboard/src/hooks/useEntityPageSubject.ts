import { useRouter } from "next/router";
import { customDecodeURIComponent } from "../lib/uri";
import { api } from "../utils/api";

export function useEntityPageSubject() {
  const router = useRouter();

  const { data: entityTypes } = api.entityTypes.list.useQuery();

  const entityType = customDecodeURIComponent(
    router.query.entityType as string
  );
  const entityId = customDecodeURIComponent(router.query.entityId as string);

  const entityTypeId = entityTypes?.find((et) => et.type === entityType)?.id;

  return {
    id: entityId,
    type: entityTypeId,
  };
}
