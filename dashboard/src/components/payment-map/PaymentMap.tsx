import Map, { Layer, Marker, Source } from "react-map-gl";
import { LngLatBounds } from "mapbox-gl";
import { CardIcon, DeviceIcon, KycIcon } from "./icons";
import "mapbox-gl/dist/mapbox-gl.css";
import circle from "@turf/circle";
import { env } from "~/env.mjs";
import WebMercatorViewport from "@math.gl/web-mercator";

interface Marker {
  latitude: number | null;
  longitude: number | null;
  radius?: number;
  type: "device" | "card" | "kyc";
}

interface PaymentMapProps {
  markers: Marker[];
}

export const PaymentMap = ({ markers }: PaymentMapProps) => {
  const layerStyle = {
    id: "circle-fill",
    type: "fill",
    paint: {
      "fill-color": "#007cbf",
      "fill-opacity": 0.1,
    },
  };

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
                <DeviceIcon />
              ) : marker.type === "kyc" ? (
                <KycIcon />
              ) : (
                <CardIcon />
              )}
            </Marker>
            {marker.radius && (
              <Source
                id="circleSource"
                type="geojson"
                data={circle(
                  [marker.longitude, marker.latitude],
                  marker.radius,
                  {
                    steps: 50,
                    units: "kilometers",
                  }
                )}
              >
                <Layer {...layerStyle} />
              </Source>
            )}
          </>
        );
      })}
    </Map>
  );
};
