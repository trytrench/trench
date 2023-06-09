import mbxClient from "@mapbox/mapbox-sdk";
import type MapiClient from "@mapbox/mapbox-sdk/lib/classes/mapi-client";
import mbxGeocoding from "@mapbox/mapbox-sdk/services/geocoding";
import { type Address } from "@prisma/client";
import { env } from "../../../env.mjs";

const mapboxClient = mbxClient({
  accessToken: env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
}) as MapiClient;

export const geocodePlugin = async (address: Address) => {
  const query = [
    address.line1,
    address.line2,
    address.city,
    address.state,
    address.country,
    address.postalCode,
  ]
    .filter(Boolean)
    .join(", ");

  const geocodingService = mbxGeocoding(mapboxClient);

  const response = await geocodingService
    .forwardGeocode({
      query,
      limit: 1,
    })
    .send();

  if (!response.body.features[0]) {
    throw new Error("No features found");
  }

  return response.body.features[0];
};
