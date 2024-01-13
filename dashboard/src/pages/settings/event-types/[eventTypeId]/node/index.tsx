import type { NextPageWithLayout } from "~/pages/_app";
import { api } from "~/utils/api";
import { NodeType } from "event-processing";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import SettingsLayout from "~/components/SettingsLayout";
import { EditNodeDef } from "~/components/features/EditNodeDef";
import { toast } from "~/components/ui/use-toast";
import { EditCount } from "./EditCount";

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

  const { mutateAsync: createUniqueCount } =
    api.nodeDefs.createUniqueCount.useMutation();

  const { mutateAsync: createComputed } =
    api.nodeDefs.createComputed.useMutation();

  return (
    <div>
      <Link
        href={`/settings/event-types/${router.query.eventTypeId as string}`}
        className="text-sm text-muted-foreground flex items-center gap-1"
      >
        <ChevronLeft className="w-3 h-3" />
        Back to {eventType?.type}
      </Link>
      {router.query.type === "count" ? (
        <EditCount
          onSave={(name, assignToFeatures, countUniqueConfig) => {
            createUniqueCount({
              name,
              eventTypes: [router.query.eventTypeId as string],
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
        <EditNodeDef
          onRename={() => {}}
          onSave={(def, assignToFeatures, featureDeps, nodeDeps) => {
            createComputed({
              nodeDef: {
                name: def.name,
                type: NodeType.Computed,
                eventTypes: [router.query.eventTypeId as string],
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