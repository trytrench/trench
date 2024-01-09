import AppLayout from "~/components/AppLayout";
import type { NextPageWithLayout } from "~/pages/_app";
import { api } from "~/utils/api";

import { toast } from "~/components/ui/use-toast";
import { EditFeatureDef } from "~/components/features/EditFeatureDef";
import { ComputedNodeType, NodeDef } from "event-processing";
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

  const { refetch: refetchNodes } = api.nodeDefs.getNodesForEventType.useQuery(
    { eventTypeId: router.query.eventTypeId as string },
    { enabled: false }
  );

  const { mutateAsync: createNodeDef } = api.nodeDefs.create.useMutation();

  function handleSave(def: NodeDef) {
    createNodeDef({
      ...def,
      deps: [],
      eventTypes: Array.from(def.eventTypes),
      dataType: {
        type: def.dataType,
      },
      config: {
        ...def.config,
        type: ComputedNodeType.Code,
      },
    })
      .then((nodeDef) => {
        toast({
          title: "Node created",
          // description: `${values.entity}`,
        });
        void router.push(
          `/settings/event-types/${router.query.eventTypeId as string}/node/${
            nodeDef.id
          } `
        );
        return refetchNodes();
      })
      .catch(() => {
        toast({
          variant: "destructive",
          title: "Failed to create node",
        });
      });
    // try {
    //   await create({
    //     name: def.featureName,
    //     featureType: def.featureType,
    //     dataType: def.dataType,
    //     eventTypes: [...def.eventTypes],
    //     deps: [...def.dependsOn],
    //     config: def.config,
    //   });
    //   void router.push(`/settings/features`);
    //   toast({
    //     variant: "default",
    //     title: "FeatureDef created!",
    //     description: `${def.featureName} (${def.featureType})`,
    //   });
    // } catch (e) {
    //   toast({
    //     variant: "destructive",
    //     title: "Failed to create FeatureDef",
    //   });
    // }
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
      <EditFeatureDef onFeatureDefSave={handleSave} />
    </div>
  );
};

Page.getLayout = (page) => <SettingsLayout>{page}</SettingsLayout>;

export default Page;
