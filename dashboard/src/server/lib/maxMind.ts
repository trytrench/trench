import { Insights, WebServiceClient } from "@maxmind/geoip2-node";
import { env } from "~/env.mjs";

export const maxMind = new WebServiceClient(
  env.MAXMIND_ACCOUNT_ID,
  env.MAXMIND_LICENSE_KEY
);

export const getIpData = (data: Insights) => {
  return {
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
    latitude: data.location?.latitude,
    longitude: data.location?.longitude,
    accuracyRadius: data.location?.accuracyRadius,
    averageIncome: data.location?.averageIncome,
    timezone: data.location?.timeZone,
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
};
