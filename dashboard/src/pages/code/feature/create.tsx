import AppLayout from "~/components/AppLayout";
import type { NextPageWithLayout } from "~/pages/_app";
import { api } from "~/utils/api";

import { toast } from "~/components/ui/use-toast";
import { EditFeatureDef } from "~/components/features/EditFeatureDef";
import { FeatureDef } from "event-processing";
import { useRouter } from "next/router";

const Page: NextPageWithLayout = () => {
  const { mutateAsync: create } = api.featureDefs.create.useMutation();
  const router = useRouter();

  async function handleSave(def: FeatureDef) {
    try {
      const res = await create({
        name: def.featureName!,
        featureType: def.featureType,
        dataType: def.dataType,
        eventTypes: [...def.eventTypes],
        deps: [...def.dependsOn],
        config: def.config,
      });

      router.push(`/settings/features`).then(() => {
        toast({
          variant: "default",
          title: "FeatureDef created!",
          description: `${def.featureName} (${def.featureType}))`,
        });
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Failed to create FeatureDef",
      });
    }
  }

  return <EditFeatureDef onFeatureDefSave={handleSave} />;
};

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;
