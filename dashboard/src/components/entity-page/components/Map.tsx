import { EntityPageComponent } from "./types";

export interface MapConfig {
  locationFeatureId: string | null;
}

export const MapComponent: EntityPageComponent<MapConfig> = ({ config }) => {
  // Component implementation
  return (
    <div className="bg-red-100 h-full w-full">
      <div>MAP</div>
    </div>
  );
};
