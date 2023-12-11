import AppLayout from "~/components/AppLayout";
import type { NextPageWithLayout } from "~/pages/_app";
import { api } from "~/utils/api";

import { toast } from "~/components/ui/use-toast";
import { EditFeatureDef } from "~/components/features/EditFeatureDef";
import { FeatureDef } from "event-processing";
import { useRouter } from "next/router";
import SettingsLayout from "~/components/SettingsLayout";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

const Page: NextPageWithLayout = () => {
  const { mutateAsync: create } = api.featureDefs.create.useMutation();
  const router = useRouter();

  async function handleSave(def: FeatureDef) {
    try {
      await create({
        name: def.featureName,
        featureType: def.featureType,
        dataType: def.dataType,
        eventTypes: [...def.eventTypes],
        deps: [...def.dependsOn],
        config: def.config,
      });

      void router.push(`/settings/features`);
      toast({
        variant: "default",
        title: "FeatureDef created!",
        description: `${def.featureName} (${def.featureType})`,
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Failed to create FeatureDef",
      });
    }
  }

  return (
    <div>
      <Link
        href="/settings/features"
        className="text-sm text-muted-foreground flex items-center gap-1"
      >
        <ChevronLeft className="w-3 h-3" />
        Back to features
      </Link>
      <EditFeatureDef onFeatureDefSave={handleSave} />
    </div>
  );
};

Page.getLayout = (page) => <SettingsLayout>{page}</SettingsLayout>;

export default Page;
