import AppLayout from "~/components/AppLayout";
import type { NextPageWithLayout } from "~/pages/_app";
import { api } from "~/utils/api";

import { toast } from "~/components/ui/use-toast";
import { EditFeatureDef } from "~/components/features/EditFeatureDef";
import { useRouter } from "next/router";
import { FeatureDef } from "event-processing";

const Page: NextPageWithLayout = () => {
  const router = useRouter();
  const featureId = router.query.featureId as string;

  const { data } = api.featureDefs.getLatest.useQuery();

  const { mutateAsync: save } = api.featureDefs.save.useMutation();
  const { mutateAsync: rename } = api.featureDefs.rename.useMutation();

  async function handleSave(def: FeatureDef) {
    try {
      await save({
        id: featureId,
        eventTypes: [...def.eventTypes],
        deps: [...def.dependsOn],
        config: def.config,
      });

      toast({
        variant: "default",
        title: "FeatureDef saved!",
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Failed to create FeatureDef",
      });
    }
  }

  async function handleRename(name: string) {
    try {
      await rename({
        id: featureId,
        name,
      });

      toast({
        variant: "default",
        title: "Feature renamed to " + name + ".",
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Failed to rename",
      });
    }
  }

  if (!data) {
    return null;
  }

  return (
    <EditFeatureDef
      initialDef={data.find((v) => v.featureId === featureId)}
      onFeatureDefSave={void handleSave}
      onFeatureRename={void handleRename}
    />
  );
};

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;
