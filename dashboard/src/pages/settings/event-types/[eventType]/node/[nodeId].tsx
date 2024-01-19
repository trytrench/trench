import { NodeDefsMap, NodeType } from "event-processing";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import SettingsLayout from "~/components/SettingsLayout";
import { EditComputed } from "~/pages/settings/event-types/[eventType]/node/EditComputed";
import { toast } from "~/components/ui/use-toast";
import type { NextPageWithLayout } from "~/pages/_app";
import { api } from "~/utils/api";
import { EditCount } from "./EditCount";
import { EditUniqueCount } from "./EditUniqueCount";

const Page: NextPageWithLayout = () => {
  const router = useRouter();

  const { data: eventType } = api.eventTypes.get.useQuery(
    { id: router.query.eventType as string },
    { enabled: !!router.query.eventType }
  );

  const { refetch: refetchNodes } = api.nodeDefs.list.useQuery(
    { eventType: router.query.eventType as string },
    { enabled: false }
  );

  const { data: nodeDef } = api.nodeDefs.get.useQuery(
    { id: router.query.nodeId as string },
    { enabled: !!router.query.nodeId }
  );

  const { mutateAsync: updateNodeDef } = api.nodeDefs.update.useMutation();

  function handleSave(def: NodeDefsMap[NodeType.Computed]) {
    updateNodeDef({
      ...def,
      dependsOn: [],
      eventTypes: [router.query.eventType as string],
    })
      .then(() => {
        toast({
          title: "Node updated",
          // description: `${values.entity}`,
        });
        return refetchNodes();
      })
      .catch(() => {
        toast({
          variant: "destructive",
          title: "Failed to update node",
        });
      });
  }

  return (
    <div>
      <Link
        href={`/settings/event-types/${router.query.eventType as string}`}
        className="text-sm text-muted-foreground flex items-center gap-1"
      >
        <ChevronLeft className="w-3 h-3" />
        Back to {eventType?.type}
      </Link>

      {!nodeDef ? null : nodeDef.type === NodeType.Count ? (
        <EditCount
          onRename={() => {}}
          onSave={(name, assignToFeatures, countConfig) => {
            createCount({
              name,
              eventTypes: [router.query.eventType as string],
              assignToFeatures,
              countConfig,
            })
              .then(() => {
                toast({
                  title: "Node created",
                  // description: `${values.entity}`,
                });

                return refetchNodes();
              })
              .catch(() => {
                toast({
                  variant: "destructive",
                  title: "Failed to create node",
                });
              });
          }}
        />
      ) : nodeDef.type === NodeType.UniqueCounter ? (
        <EditUniqueCount
          onRename={() => {}}
          onSave={(name, assignToFeatures, countUniqueConfig) => {
            createUniqueCount({
              name,
              eventTypes: [router.query.eventType as string],
              assignToFeatures,
              countUniqueConfig,
            })
              .then(() => {
                toast({
                  title: "Node created",
                  // description: `${values.entity}`,
                });

                return refetchNodes();
              })
              .catch(() => {
                toast({
                  variant: "destructive",
                  title: "Failed to create node",
                });
              });
          }}
        />
      ) : (
        <EditComputed
          onRename={() => {}}
          onSave={(def, assignToFeatures, featureDeps, nodeDeps) => {
            createComputed({
              nodeDef: {
                name: def.name,
                type: NodeType.Computed,
                eventTypes: [router.query.eventType as string],
                returnSchema: def.returnSchema,
                config: def.config,
              },
              featureDeps,
              nodeDeps,
              assignToFeatures,
            })
              .then(() => {
                toast({
                  title: "Node created",
                  // description: `${values.entity}`,
                });
                return refetchNodes();
              })
              .catch(() => {
                toast({
                  variant: "destructive",
                  title: "Failed to create node",
                });
              });
          }}
        />
      )}
    </div>
  );
};

Page.getLayout = (page) => <SettingsLayout>{page}</SettingsLayout>;

export default Page;
