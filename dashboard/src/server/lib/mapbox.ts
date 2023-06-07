import mbxClient from "@mapbox/mapbox-sdk";
import mbxGeocoding from "@mapbox/mapbox-sdk/services/geocoding";
import type MapiClient from "@mapbox/mapbox-sdk/lib/classes/mapi-client";
import type { Address } from "../api/routers/api";
import { env } from "~/env.mjs";

export const geocodeAddress = async (address: Address) => {
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

  const baseClient = mbxClient({
    accessToken: env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
  }) as MapiClient;
  const geocodingService = mbxGeocoding(baseClient);

  const response = await geocodingService
    .forwardGeocode({
      query,
      limit: 1,
    })
    .send();

  return response.body.features[0] || null;
};
