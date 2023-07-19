import { convertDistance, getPreciseDistance } from "geolib";
import { node } from "../flow";
import { geocodePlugin } from "../plugins/geocode";
import { ipDataNode } from "./paymentMethodIpDistance";

export const geocodeKycAddressNode = node.resolver(async ({ input }) => {
  const address = input.evaluableAction.kycAttempt?.address;
  if (!address) {
    throw new Error("Address not found");
  }

  const res = await geocodePlugin(address);
  return res;
});

export const kycIpDistanceNode = node
  .depend({
    geolocateSession: ipDataNode,
    geolocateKyc: geocodeKycAddressNode,
  })
  .resolver(({ deps, input }) => {
    const { geolocateSession, geolocateKyc } = deps;

    const kycLocation = input.evaluableAction.kycAttempt?.address?.location;
    const kycLoc =
      kycLocation?.latitude && kycLocation?.longitude
        ? {
            latitude: kycLocation.latitude,
            longitude: kycLocation.longitude,
          }
        : geolocateKyc;

    const distance = getPreciseDistance(
      { lat: geolocateSession.latitude, lon: geolocateSession.longitude },
      {
        lat: kycLoc.latitude,
        lon: kycLoc.longitude,
      }
    );

    const distanceKm = convertDistance(distance, "km");

    return {
      value: distanceKm,
      unit: "km",
    };
  });
