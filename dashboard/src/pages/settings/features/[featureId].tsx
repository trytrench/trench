import AppLayout from "~/components/AppLayout";
import type { NextPageWithLayout } from "~/pages/_app";
import { api } from "~/utils/api";

import { toast } from "~/components/ui/use-toast";
import { useRouter } from "next/router";
import { FeatureDef } from "event-processing";
import SettingsLayout from "~/components/SettingsLayout";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

const Page: NextPageWithLayout = () => {
  const router = useRouter();
  const featureId = router.query.featureId as string;

  const { data } = api.nodeDefs.getLatest.useQuery();

  const { mutateAsync: save } = api.nodeDefs.save.useMutation();
  const { mutateAsync: rename } = api.nodeDefs.rename.useMutation();

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
    <div>
      <Link
        href="/settings/features"
        className="text-sm text-muted-foreground flex items-center gap-1"
      >
        <ChevronLeft className="w-3 h-3" />
        Back to features
      </Link>
      {/* <EditNodeDef
        initialNodeDef={data.find((v) => v.featureId === featureId)}
        onSave={void handleSave}
        onRename={void handleRename}
      /> */}
    </div>
  );
};

Page.getLayout = (page) => <SettingsLayout>{page}</SettingsLayout>;

export default Page;
