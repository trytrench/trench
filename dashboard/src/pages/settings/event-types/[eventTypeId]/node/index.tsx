import type { NextPageWithLayout } from "~/pages/_app";
import { api } from "~/utils/api";

import { NodeDefsMap, NodeType, TypeName } from "event-processing";
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

  const { mutateAsync: createNodeDef } = api.nodeDefs.create.useMutation();

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
          onSave={(def, assignedToFeatures) => {
            createNodeDef({
              name: def.name,
              type: NodeType.UniqueCounter,
              dependsOn: [],
              eventTypes: [router.query.eventTypeId as string],
              // returnSchema: def.returnSchema,
              returnSchema: {
                type: TypeName.Int64,
              } as NodeDefsMap[NodeType.UniqueCounter]["returnSchema"],
              config: {
                ...def.config,
                counterId: "1",
              } as NodeDefsMap[NodeType.UniqueCounter]["config"],
            })
              .then((nodeDef) => {
                return Promise.all(
                  assignedToFeatures.map((featureDep) =>
                    createNodeDef({
                      name: featureDep.featureName,
                      type: NodeType.LogEntityFeature,
                      dependsOn: [nodeDef.id],
                      eventTypes: [router.query.eventTypeId as string],
                      // returnSchema: def.returnSchema,
                      returnSchema: {
                        type: TypeName.Any,
                      } as NodeDefsMap[NodeType.LogEntityFeature]["returnSchema"],
                      config: {
                        featureId: featureDep.featureId,
                        featureSchema: {
                          type: TypeName.Int64,
                        },
                        entityAppearanceNodeId: featureDep.nodeId,
                        valueAccessor: {
                          nodeId: nodeDef.id,
                        },
                      } as NodeDefsMap[NodeType.LogEntityFeature]["config"],
                    })
                  )
                );
              })
              .then(() => {
                toast({
                  title: "Node created",
                  // description: `${values.entity}`,
                });
                // void router.push(
                //   `/settings/event-types/${
                //     router.query.eventTypeId as string
                //   }/node/${nodeDef.id} `
                // );
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
          onSave={(def, assignedToFeatures) => {
            createNodeDef({
              name: def.name,
              type: NodeType.Computed,
              dependsOn: [],
              eventTypes: [router.query.eventTypeId as string],
              // returnSchema: def.returnSchema,
              returnSchema: {
                type: TypeName.String,
              },
              config: def.config,
            })
              .then((nodeDef) => {
                return Promise.all(
                  assignedToFeatures.map((featureDep) =>
                    createNodeDef({
                      name: featureDep.featureName,
                      type: NodeType.LogEntityFeature,
                      dependsOn: [nodeDef.id],
                      eventTypes: [router.query.eventTypeId as string],
                      // returnSchema: def.returnSchema,
                      returnSchema: {
                        type: TypeName.Any,
                      } as NodeDefsMap[NodeType.LogEntityFeature]["returnSchema"],
                      config: {
                        featureId: featureDep.featureId,
                        featureSchema: {
                          type: TypeName.String,
                        },
                        entityAppearanceNodeId: featureDep.nodeId,
                        valueAccessor: {
                          nodeId: nodeDef.id,
                        },
                      } as NodeDefsMap[NodeType.LogEntityFeature]["config"],
                    })
                  )
                );
              })
              .then(() => {
                toast({
                  title: "Node created",
                  // description: `${values.entity}`,
                });
                // void router.push(
                //   `/settings/event-types/${
                //     router.query.eventTypeId as string
                //   }/node/${nodeDef.id} `
                // );
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
