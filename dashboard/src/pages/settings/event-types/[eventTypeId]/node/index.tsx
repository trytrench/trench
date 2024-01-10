import AppLayout from "~/components/AppLayout";
import type { NextPageWithLayout } from "~/pages/_app";
import { api } from "~/utils/api";

import { toast } from "~/components/ui/use-toast";
import { EditNodeDef } from "~/components/features/EditNodeDef";
import { NodeDef, NodeType } from "event-processing";
import { useRouter } from "next/router";
import SettingsLayout from "~/components/SettingsLayout";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

const Page: NextPageWithLayout = () => {
  const router = useRouter();

  const { data: eventType } = api.eventTypes.get.useQuery(
    { id: router.query.eventTypeId as string },
    { enabled: !!router.query.eventTypeId }
  );

  const { refetch: refetchNodes } = api.nodeDefs.list.useQuery(
    { eventTypeId: router.query.eventTypeId as string },
    { enabled: false }
  );

  const { mutateAsync: createNodeDef } = api.nodeDefs.create.useMutation();

  function handleSave(def: NodeDef) {
    // createNodeDef({
    //   name: def.name,
    //   type: NodeType.Computed,
    //   deps: [],
    //   eventTypes: [router.query.eventTypeId as string],
    //   dataType: {
    //     type: def.dataType,
    //   },
    //   config: {
    //     ...def.config,
    //     type: ComputedNodeType.Code,
    //     depsMap: {},
    //   },
    // })
    //   .then((nodeDef) => {
    //     toast({
    //       title: "Node created",
    //       // description: `${values.entity}`,
    //     });
    //     void router.push(
    //       `/settings/event-types/${router.query.eventTypeId as string}/node/${
    //         nodeDef.id
    //       } `
    //     );
    //     return refetchNodes();
    //   })
    //   .catch(() => {
    //     toast({
    //       variant: "destructive",
    //       title: "Failed to create node",
    //     });
    //   });
  }

  return (
    <div>
      <Link
        href={`/settings/event-types/${router.query.eventTypeId as string}`}
        className="text-sm text-muted-foreground flex items-center gap-1"
      >
        <ChevronLeft className="w-3 h-3" />
        Back to {eventType?.type}
      </Link>
      <EditNodeDef onSave={handleSave} />
    </div>
  );
};

Page.getLayout = (page) => <SettingsLayout>{page}</SettingsLayout>;

export default Page;
