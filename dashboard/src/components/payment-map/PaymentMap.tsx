import Map, { Layer, Marker, Source } from "react-map-gl";
import { LngLatBounds } from "mapbox-gl";
import { CardIcon, DeviceIcon } from "./icons";
import "mapbox-gl/dist/mapbox-gl.css";
import circle from "@turf/circle";
import { env } from "~/env.mjs";

interface Marker {
  latitude: number;
  longitude: number;
  radius?: number;
  type: "device" | "card";
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
    let bounds = new LngLatBounds();

    for (const marker of markers) {
      bounds = bounds.extend([marker.longitude, marker.latitude]);
    }

    return { bounds, fitBoundsOptions: { padding: 50 } };
  };

  return (
    <Map
      mapboxAccessToken={env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
      mapLib={import("mapbox-gl")}
      reuseMaps
      initialViewState={getInitialViewState()}
      mapStyle="mapbox://styles/mapbox/streets-v12"
    >
      {markers.map((marker) => (
        <>
          <Marker latitude={marker.latitude} longitude={marker.longitude}>
            {marker.type === "device" ? <DeviceIcon /> : <CardIcon />}
          </Marker>
          {marker.radius && (
            <Source
              id="circleSource"
              type="geojson"
              data={circle([marker.longitude, marker.latitude], marker.radius, {
                steps: 50,
                units: "kilometers",
              })}
            >
              <Layer {...layerStyle} />
            </Source>
          )}
        </>
      ))}
    </Map>
  );
};
