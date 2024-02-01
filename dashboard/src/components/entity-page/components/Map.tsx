import { ComponentType } from "./_enum";
import { EntityPageComponent } from "./types";
import Map, { Layer, Marker, Source } from "react-map-gl";
import { LngLatBounds } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import WebMercatorViewport from "@math.gl/web-mercator";
import { CreditCard, PersonStanding, Phone } from "lucide-react";
import { env } from "../../../env";
import { FeaturePathItem } from "../../../shared/types";
import { useAtom } from "jotai";
import { isEditModeAtom } from "../state";
import { FeatureSelector } from "../FeatureSelector";
import { TypeName, parseTypedData } from "event-processing";
import { api } from "../../../utils/api";
import { EditModeOverlay } from "../EditModeOverlay";

export interface MapConfig {
  locationFeaturePath: FeaturePathItem[];
}

export const MapComponent: EntityPageComponent<MapConfig> = ({
  id,
  entity,
  config,
  setConfig,
}) => {
  // Component implementation
  const [isEditMode, setIsEditMode] = useAtom(isEditModeAtom);

  const { data: location } = api.features.getValue.useQuery(
    {
      entity,
      featurePath: config.locationFeaturePath,
    },
    {
      enabled: !!config.locationFeaturePath.length,
    }
  );

  const locationObject =
    location?.result.type === "success"
      ? parseTypedData(
          {
            type: TypeName.Location,
          },
          location.result.data
        )
      : null;

  const locationMarkers: Marker[] = locationObject
    ? [
        {
          latitude: locationObject.lat,
          longitude: locationObject.lng,
          type: "device",
        },
      ]
    : [];

  return (
    <EditModeOverlay
      className="h-40"
      isEditMode={isEditMode}
      renderEditModeControls={() => (
        <div>
          <div>MAP</div>
          <div>
            <FeatureSelector
              desiredSchema={{ type: TypeName.Location }}
              baseEntityTypeId={entity.type}
              value={config.locationFeaturePath}
              onChange={(path) => {
                setConfig((prev) => ({
                  ...prev,
                  locationFeaturePath: path,
                }));
              }}
            />
          </div>
        </div>
      )}
    >
      <MapboxMap markers={locationMarkers} />
    </EditModeOverlay>
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
          </>
        );
      })}
    </Map>
  );
};

export const DeviceIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    xmlnsXlink="http://www.w3.org/1999/xlink"
    width="64"
    height="110"
    viewBox="0 0 64 110"
  >
    <defs>
      <path
        id="desktop-b"
        d="M39.261408,48 L32,54.9028616 L25.2971618,48 L20,48 C17.790861,48 16,46.209139 16,44 L16,20 C16,17.790861 17.790861,16 20,16 L44,16 C46.209139,16 48,17.790861 48,20 L48,44 C48,46.209139 46.209139,48 44,48 L39.261408,48 Z"
      />
      <filter
        id="desktop-a"
        width="290.6%"
        height="256.8%"
        x="-95.3%"
        y="-52.7%"
        filterUnits="objectBoundingBox"
      >
        <feOffset dy="3" in="SourceAlpha" result="shadowOffsetOuter1" />
        <feGaussianBlur
          in="shadowOffsetOuter1"
          result="shadowBlurOuter1"
          stdDeviation="3"
        />
        <feColorMatrix
          in="shadowBlurOuter1"
          result="shadowMatrixOuter1"
          values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.07 0"
        />
        <feOffset dy="7" in="SourceAlpha" result="shadowOffsetOuter2" />
        <feGaussianBlur
          in="shadowOffsetOuter2"
          result="shadowBlurOuter2"
          stdDeviation="7"
        />
        <feColorMatrix
          in="shadowBlurOuter2"
          result="shadowMatrixOuter2"
          values="0 0 0 0 0.196078431   0 0 0 0 0.196078431   0 0 0 0 0.364705882  0 0 0 0.1 0"
        />
        <feMerge>
          <feMergeNode in="shadowMatrixOuter1" />
          <feMergeNode in="shadowMatrixOuter2" />
        </feMerge>
      </filter>
    </defs>
    <g fill="none" fill-rule="evenodd">
      <circle cx="32" cy="55" r="4" fill="#6772E5" />
      <circle cx="32" cy="55" r="8" fill="#6772E5" opacity=".3" />
      <use fill="#000" filter="url(#desktop-a)" xlinkHref="#desktop-b" />
      <use fill="#FFF" xlinkHref="#desktop-b" />
      <path
        fill="#32325D"
        d="M28.6638888,37 L26,37 C24.8494068,37 24,36.1045695 24,35 L24,26 C24,24.8954305 24.8460734,24 25.9966666,24 L38,24 C39.1505932,24 40,24.8954305 40,26 L40,35 C40,36.1045695 39.1505932,37 38,37 L35.3333333,37 C36.292161,37 37,37.6715729 37,38.5 C37,39.3284271 36.292161,40 35.3333333,40 L28.6666667,40 C27.707839,40 27,39.3284271 27,38.5 C27,37.6715729 27.7050611,37 28.6638888,37 Z M38.0033334,26 L26,26 L26,34 L38.0033334,34 L38.0033334,26 Z"
      />
    </g>
  </svg>
);

export const CardIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    xmlnsXlink="http://www.w3.org/1999/xlink"
    width="64"
    height="110"
    viewBox="0 0 64 110"
  >
    <defs>
      <path
        id="card-b"
        d="M39.261408,48 L32,54.9028616 L25.2971618,48 L20,48 C17.790861,48 16,46.209139 16,44 L16,20 C16,17.790861 17.790861,16 20,16 L44,16 C46.209139,16 48,17.790861 48,20 L48,44 C48,46.209139 46.209139,48 44,48 L39.261408,48 Z"
      />
      <filter
        id="card-a"
        width="290.6%"
        height="256.8%"
        x="-95.3%"
        y="-52.7%"
        filterUnits="objectBoundingBox"
      >
        <feOffset dy="3" in="SourceAlpha" result="shadowOffsetOuter1" />
        <feGaussianBlur
          in="shadowOffsetOuter1"
          result="shadowBlurOuter1"
          stdDeviation="3"
        />
        <feColorMatrix
          in="shadowBlurOuter1"
          result="shadowMatrixOuter1"
          values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.07 0"
        />
        <feOffset dy="7" in="SourceAlpha" result="shadowOffsetOuter2" />
        <feGaussianBlur
          in="shadowOffsetOuter2"
          result="shadowBlurOuter2"
          stdDeviation="7"
        />
        <feColorMatrix
          in="shadowBlurOuter2"
          result="shadowMatrixOuter2"
          values="0 0 0 0 0.196078431   0 0 0 0 0.196078431   0 0 0 0 0.364705882  0 0 0 0.1 0"
        />
        <feMerge>
          <feMergeNode in="shadowMatrixOuter1" />
          <feMergeNode in="shadowMatrixOuter2" />
        </feMerge>
      </filter>
    </defs>
    <g fill="none" fill-rule="evenodd">
      <circle cx="32" cy="55" r="4" fill="#6772E5" />
      <circle cx="32" cy="55" r="8" fill="#6772E5" opacity=".3" />
      <use fill="#000" filter="url(#card-a)" xlinkHref="#card-b" />
      <use fill="#FFF" xlinkHref="#card-b" />
      <path
        fill="#32325D"
        d="M40,28 L24,28 L24,27.25 C24,26.5596441 24.4477153,26 25,26 L39,26 C39.5522847,26 40,26.5596441 40,27.25 L40,28 Z M40,30.5 L40,37 C40,37.5522847 39.5522847,38 39,38 L25,38 C24.4477153,38 24,37.5522847 24,37 L24,30.5 L40,30.5 Z M28,34 C27.4477153,34 27,34.4477153 27,35 C27,35.5522847 27.4477153,36 28,36 L29,36 C29.5522847,36 30,35.5522847 30,35 C30,34.4477153 29.5522847,34 29,34 L28,34 Z"
      />
    </g>
  </svg>
);

export const DeviceCardIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    xmlnsXlink="http://www.w3.org/1999/xlink"
    width="88"
    height="110"
    viewBox="0 0 88 110"
  >
    <defs>
      <path
        id="carddesktop-b"
        d="M51.261408,48 L44,54.9028616 L37.2971618,48 L20,48 C17.790861,48 16,46.209139 16,44 L16,20 C16,17.790861 17.790861,16 20,16 L68,16 C70.209139,16 72,17.790861 72,20 L72,44 C72,46.209139 70.209139,48 68,48 L51.261408,48 Z"
      />
      <filter
        id="carddesktop-a"
        width="208.9%"
        height="256.8%"
        x="-54.5%"
        y="-52.7%"
        filterUnits="objectBoundingBox"
      >
        <feOffset dy="3" in="SourceAlpha" result="shadowOffsetOuter1" />
        <feGaussianBlur
          in="shadowOffsetOuter1"
          result="shadowBlurOuter1"
          stdDeviation="3"
        />
        <feColorMatrix
          in="shadowBlurOuter1"
          result="shadowMatrixOuter1"
          values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.07 0"
        />
        <feOffset dy="7" in="SourceAlpha" result="shadowOffsetOuter2" />
        <feGaussianBlur
          in="shadowOffsetOuter2"
          result="shadowBlurOuter2"
          stdDeviation="7"
        />
        <feColorMatrix
          in="shadowBlurOuter2"
          result="shadowMatrixOuter2"
          values="0 0 0 0 0.196078431   0 0 0 0 0.196078431   0 0 0 0 0.364705882  0 0 0 0.1 0"
        />
        <feMerge>
          <feMergeNode in="shadowMatrixOuter1" />
          <feMergeNode in="shadowMatrixOuter2" />
        </feMerge>
      </filter>
    </defs>
    <g fill="none" fill-rule="evenodd">
      <circle cx="44" cy="55" r="4" fill="#6772E5" />
      <circle cx="44" cy="55" r="8" fill="#6772E5" opacity=".3" />
      <use
        fill="#000"
        filter="url(#carddesktop-a)"
        xlinkHref="#carddesktop-b"
      />
      <use fill="#FFF" xlinkHref="#carddesktop-b" />
      <path
        fill="#32325D"
        d="M40 28L24 28 24 27.25C24 26.5596441 24.4477153 26 25 26L39 26C39.5522847 26 40 26.5596441 40 27.25L40 28zM40 30.5L40 37C40 37.5522847 39.5522847 38 39 38L25 38C24.4477153 38 24 37.5522847 24 37L24 30.5 40 30.5zM28 34C27.4477153 34 27 34.4477153 27 35 27 35.5522847 27.4477153 36 28 36L29 36C29.5522847 36 30 35.5522847 30 35 30 34.4477153 29.5522847 34 29 34L28 34zM52.6638888 37L50 37C48.8494068 37 48 36.1045695 48 35L48 26C48 24.8954305 48.8460734 24 49.9966666 24L62 24C63.1505932 24 64 24.8954305 64 26L64 35C64 36.1045695 63.1505932 37 62 37L59.3333333 37C60.292161 37 61 37.6715729 61 38.5 61 39.3284271 60.292161 40 59.3333333 40L52.6666667 40C51.707839 40 51 39.3284271 51 38.5 51 37.6715729 51.7050611 37 52.6638888 37zM62.0033334 26L50 26 50 34 62.0033334 34 62.0033334 26z"
      />
    </g>
  </svg>
);

export const KycIcon = () => (
  <svg
    width="64"
    height="110"
    viewBox="0 0 64 110"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M32 59C34.2091 59 36 57.2091 36 55C36 52.7909 34.2091 51 32 51C29.7909 51 28 52.7909 28 55C28 57.2091 29.7909 59 32 59Z"
      fill="#6772E5"
    />
    <path
      opacity="0.3"
      d="M32 63C36.4183 63 40 59.4183 40 55C40 50.5817 36.4183 47 32 47C27.5817 47 24 50.5817 24 55C24 59.4183 27.5817 63 32 63Z"
      fill="#6772E5"
    />
    <g filter="url(#filter0_dd_1_2)">
      <path
        d="M39.2614 48L32 54.9029L25.2972 48H20C17.7909 48 16 46.2091 16 44V20C16 17.7909 17.7909 16 20 16H44C46.2091 16 48 17.7909 48 20V44C48 46.2091 46.2091 48 44 48H39.2614Z"
        fill="black"
      />
    </g>
    <path
      d="M39.2614 48L32 54.9029L25.2972 48H20C17.7909 48 16 46.2091 16 44V20C16 17.7909 17.7909 16 20 16H44C46.2091 16 48 17.7909 48 20V44C48 46.2091 46.2091 48 44 48H39.2614Z"
      fill="white"
    />
    <path
      d="M37.625 23.5625H26.375C25.9606 23.5625 25.5632 23.7271 25.2701 24.0201C24.9771 24.3132 24.8125 24.7106 24.8125 25.125V38.875C24.8125 39.2894 24.9771 39.6868 25.2701 39.9799C25.5632 40.2729 25.9606 40.4375 26.375 40.4375H37.625C38.0394 40.4375 38.4368 40.2729 38.7299 39.9799C39.0229 39.6868 39.1875 39.2894 39.1875 38.875V25.125C39.1875 24.7106 39.0229 24.3132 38.7299 24.0201C38.4368 23.7271 38.0394 23.5625 37.625 23.5625ZM37.3125 38.5625H26.6875V25.4375H37.3125V38.5625ZM28.5625 27.3125C28.5625 27.0639 28.6613 26.8254 28.8371 26.6496C29.0129 26.4738 29.2514 26.375 29.5 26.375H34.5C34.7486 26.375 34.9871 26.4738 35.1629 26.6496C35.3387 26.8254 35.4375 27.0639 35.4375 27.3125C35.4375 27.5611 35.3387 27.7996 35.1629 27.9754C34.9871 28.1512 34.7486 28.25 34.5 28.25H29.5C29.2514 28.25 29.0129 28.1512 28.8371 27.9754C28.6613 27.7996 28.5625 27.5611 28.5625 27.3125ZM29.25 37.2633C29.601 36.8846 30.0265 36.5826 30.4997 36.376C30.9729 36.1694 31.4837 36.0628 32 36.0628C32.5163 36.0628 33.0271 36.1694 33.5003 36.376C33.9735 36.5826 34.399 36.8846 34.75 37.2633C34.9191 37.4456 35.1537 37.5533 35.4021 37.5627C35.6506 37.5721 35.8927 37.4824 36.075 37.3133C36.2573 37.1442 36.365 36.9096 36.3744 36.6611C36.3838 36.4127 36.2941 36.1706 36.125 35.9883C35.693 35.5241 35.1855 35.1364 34.6242 34.8414C35.0475 34.3409 35.3189 33.7298 35.4064 33.0802C35.4938 32.4306 35.3937 31.7695 35.1179 31.1749C34.842 30.5803 34.4019 30.0769 33.8494 29.7242C33.2969 29.3714 32.6551 29.184 31.9996 29.184C31.3441 29.184 30.7023 29.3714 30.1498 29.7242C29.5973 30.0769 29.1572 30.5803 28.8813 31.1749C28.6055 31.7695 28.5054 32.4306 28.5928 33.0802C28.6803 33.7298 28.9517 34.3409 29.375 34.8414C28.814 35.1366 28.3069 35.5243 27.875 35.9883C27.7059 36.1706 27.6162 36.4127 27.6256 36.6611C27.635 36.9096 27.7427 37.1442 27.925 37.3133C28.1073 37.4824 28.3494 37.5721 28.5979 37.5627C28.8463 37.5533 29.0809 37.4456 29.25 37.2633ZM32 31.0625C32.309 31.0625 32.6111 31.1541 32.8681 31.3258C33.125 31.4975 33.3253 31.7415 33.4436 32.0271C33.5618 32.3126 33.5928 32.6267 33.5325 32.9298C33.4722 33.2329 33.3234 33.5113 33.1049 33.7299C32.8863 33.9484 32.6079 34.0972 32.3048 34.1575C32.0017 34.2178 31.6876 34.1868 31.4021 34.0686C31.1165 33.9503 30.8725 33.75 30.7008 33.4931C30.5291 33.2361 30.4375 32.934 30.4375 32.625C30.4375 32.2106 30.6021 31.8132 30.8951 31.5201C31.1882 31.2271 31.5856 31.0625 32 31.0625Z"
      fill="#32325D"
    />
    <defs>
      <filter
        id="filter0_dd_1_2"
        x="2"
        y="9"
        width="60"
        height="66.9029"
        filterUnits="userSpaceOnUse"
        color-interpolation-filters="sRGB"
      >
        <feFlood flood-opacity="0" result="BackgroundImageFix" />
        <feColorMatrix
          in="SourceAlpha"
          type="matrix"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
          result="hardAlpha"
        />
        <feOffset dy="3" />
        <feGaussianBlur stdDeviation="3" />
        <feColorMatrix
          type="matrix"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.07 0"
        />
        <feBlend
          mode="normal"
          in2="BackgroundImageFix"
          result="effect1_dropShadow_1_2"
        />
        <feColorMatrix
          in="SourceAlpha"
          type="matrix"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
          result="hardAlpha"
        />
        <feOffset dy="7" />
        <feGaussianBlur stdDeviation="7" />
        <feColorMatrix
          type="matrix"
          values="0 0 0 0 0.196078 0 0 0 0 0.196078 0 0 0 0 0.364706 0 0 0 0.1 0"
        />
        <feBlend
          mode="normal"
          in2="effect1_dropShadow_1_2"
          result="effect2_dropShadow_1_2"
        />
        <feBlend
          mode="normal"
          in="SourceGraphic"
          in2="effect2_dropShadow_1_2"
          result="shape"
        />
      </filter>
    </defs>
  </svg>
);
