import type { NextPageWithLayout } from "~/pages/_app";
import { api } from "~/utils/api";
import { NodeType } from "event-processing";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import SettingsLayout from "~/components/SettingsLayout";
import { toast } from "~/components/ui/use-toast";
import { EditUniqueCount } from "./EditUniqueCount";
import { EditCount } from "./EditCount";
import { EditComputed } from "./EditComputed";
import { EditRule } from "./EditRule";

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

  const { mutateAsync: createCount } = api.nodeDefs.createCount.useMutation();

  const { mutateAsync: createUniqueCount } =
    api.nodeDefs.createUniqueCount.useMutation();

  const { mutateAsync: createComputed } =
    api.nodeDefs.createComputed.useMutation();

  const { mutateAsync: createRule } = api.nodeDefs.createRule.useMutation();

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
          onRename={() => {}}
          onSave={(name, assignToFeatures, countConfig) => {
            createCount({
              name,
              eventTypes: [router.query.eventTypeId as string],
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
      ) : router.query.type === "unique-count" ? (
        <EditUniqueCount
          onRename={() => {}}
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
      ) : router.query.type === "rule" ? (
        <EditRule
          onRename={() => {}}
          onSave={(
            def,
            assignToFeatures,
            featureDeps,
            nodeDeps,
            assignToEvent
          ) => {
            createRule({
              nodeDef: {
                name: def.name,
                type: NodeType.Rule,
                eventTypes: [router.query.eventTypeId as string],
                config: def.config,
              },
              featureDeps,
              nodeDeps,
              assignToFeatures,
              assignToEvent,
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
