import { useComponentConfig } from "../useComponentConfig";
import { ComponentType } from "./_enum";
import { EntityPageComponent } from "./types";
import Map, { Layer, Marker, Source } from "react-map-gl";
import { LngLatBounds } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import WebMercatorViewport from "@math.gl/web-mercator";
import { CreditCard, PersonStanding, Phone } from "lucide-react";
import { env } from "../../../env";

export interface MapConfig {
  locationFeatureId: string | null;
}

export const MapComponent: EntityPageComponent<MapConfig> = ({ id }) => {
  const [config, setConfig] = useComponentConfig<ComponentType.Map>(id);
  // Component implementation

  return (
    <div className="w-full h-40">
      <MapboxMap markers={[]} />
    </div>
  );
};

interface Marker {
  latitude: number | null;
  longitude: number | null;
  radius?: number;
  type: "device" | "card" | "kyc";
}

interface PaymentMapProps {
  markers: Marker[];
}

const MapboxMap = ({ markers }: PaymentMapProps) => {
  // const layerStyle = {
  //   id: "circle-fill",
  //   type: "fill",
  //   paint: {
  //     "fill-color": "#007cbf",
  //     "fill-opacity": 0.1,
  //   },
  // };

  const getInitialViewState = (): React.ComponentProps<
    typeof Map
  >["initialViewState"] => {
    if (markers.length >= 1) {
      let bounds = new LngLatBounds();

      for (const marker of markers) {
        if (!marker.latitude || !marker.longitude) {
          continue;
        }
        bounds = bounds.extend([marker.longitude, marker.latitude]);
      }

      const viewport = new WebMercatorViewport({
        width: 600,
        height: 400,
      }).fitBounds(bounds.toArray() as [[number, number], [number, number]], {
        padding: 100,
        maxZoom: 10,
      });

      const { longitude, latitude, zoom } = viewport;
      return { longitude, latitude, zoom };
    }
  };
  console.log(env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN);
  return (
    <Map
      mapboxAccessToken={env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
      mapLib={import("mapbox-gl")}
      reuseMaps
      initialViewState={getInitialViewState()}
      mapStyle="mapbox://styles/mapbox/streets-v12"
    >
      {markers.map((marker) => {
        if (!marker.latitude || !marker.longitude) {
          return null;
        }
        return (
          <>
            <Marker latitude={marker.latitude} longitude={marker.longitude}>
              {marker.type === "device" ? (
                <Phone />
              ) : marker.type === "kyc" ? (
                <PersonStanding />
              ) : (
                <CreditCard />
              )}
            </Marker>
          </>
        );
      })}
    </Map>
  );
};
