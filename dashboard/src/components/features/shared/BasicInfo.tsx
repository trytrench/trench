// For the feature editor: name, type, and import alias.
// These properties are common to all feature types.

import { Pencil, Save } from "lucide-react";
import { Button } from "../../ui/button";

// - the monaco editor ig? unsure

interface BasicInfoProps {
  featureName: string;
  featureType: string;
  dataType: string;
}

function BasicInfo(props: BasicInfoProps) {
  const { featureName, featureType, dataType } = props;

  // todo: query event types

  // ...

  return (
    <div className="flex items-center justify-between">
      {/* Title; Feature Name */}

      <div>
        <h1 className="text-emphasis-foreground text-3xl">{featureName}</h1>
        <div className="text-muted-foreground">{featureType} feature</div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="gap-2">
          <Save className="w-4 h-4" />
          Save
        </Button>
        <Button variant="outline" className="gap-2">
          <Pencil className="w-4 h-4" />
          Rename
        </Button>
        <Button variant="destructive">Delete</Button>
      </div>
    </div>
  );
}

export { BasicInfo };
