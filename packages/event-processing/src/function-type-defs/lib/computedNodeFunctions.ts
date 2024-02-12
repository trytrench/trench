import "./computedNodeLib";

// @ts-ignore
import mbxClient from "@mapbox/mapbox-sdk";

import mbxGeocoding from "@mapbox/mapbox-sdk/services/geocoding";
import type MapiClient from "@mapbox/mapbox-sdk/lib/classes/mapi-client";
import { env } from "./env";

import { WebServiceClient } from "@maxmind/geoip2-node";
import { getGithubUserData } from "./getGithubUserData";

const maxMind = new WebServiceClient(
  env.MAXMIND_ACCOUNT_ID ?? "",
  env.MAXMIND_LICENSE_KEY ?? ""
);

export const functions: typeof fn = {
  getIpData: async (ipAddress) => {
    const data = await maxMind.insights(ipAddress);
    if (!data.location) {
      throw new Error("No location data");
    }
    return {
      latitude: data.location.latitude,
      longitude: data.location.longitude,
      accuracyRadius: data.location.accuracyRadius,
      averageIncome: data.location.averageIncome,
      timezone: data.location.timeZone,
      continentISOCode: data.continent?.code,
      continentName: data.continent?.names?.en,
      countryISOCode: data.country?.isoCode,
      countryName: data.country?.names?.en,
      countryConfidence: data.country?.confidence,
      cityGeonameId: data.city?.geonameId,
      cityName: data.city?.names?.en,
      cityConfidence: data.city?.confidence,
      postalCode: data.postal?.code,
      postalConfidence: data.postal?.confidence,
      // Use smallest subdivision
      subdivisionISOCode:
        data.subdivisions?.[data.subdivisions.length - 1]?.isoCode,
      subdivisionName:
        data.subdivisions?.[data.subdivisions.length - 1]?.names.en,
      subdivisionConfidence:
        data.subdivisions?.[data.subdivisions.length - 1]?.confidence,
      isp: data.traits?.isp,
      isAnonymous: data.traits?.isAnonymous,
      isAnonymousVpn: data.traits?.isAnonymousVpn,
      isHostingProvider: data.traits?.isHostingProvider,
      isLegitimateProxy: data.traits?.isLegitimateProxy,
      isPublicProxy: data.traits?.isPublicProxy,
      isResidentialProxy: data.traits?.isResidentialProxy,
      isTorExitNode: data.traits?.isTorExitNode,
      staticIPScore: data.traits?.staticIpScore,
      userCount: data.traits?.userCount,
      userType: data.traits?.userType,
    };
  },
  geolocate: async (address) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const mapboxClient = mbxClient({
      accessToken: env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "",
    }) as MapiClient;

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

    const countryFeature = response.body.features[0].context.find((context) =>
      context.id.startsWith("country")
    ) as Record<string, any> | undefined;

    const countryCode =
      (countryFeature?.short_code as string | undefined) ?? null;

    if (!countryCode) {
      throw new Error("No country code found");
    }

    const center = response.body.features[0].center;
    if (!center[1] || !center[0]) {
      throw new Error("Center missing latitude or longitude");
    }

    return {
      location: {
        lat: center[1],
        lng: center[0],
      },
      countryCode,
    };
  },
  getGithubUserData,
};
