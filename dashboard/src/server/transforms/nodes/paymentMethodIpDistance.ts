import { node } from "../flow";
import { geocodePlugin } from "../plugins/geocode";
import { maxmindPlugin } from "../plugins/maxmind";
import { convertDistance, getPreciseDistance } from "geolib";

const ALWAYS_REFETCH_IP_DATA = true;
export const ipDataNode = node
  .resolver(({ input }) => {
    const ipAddress = input.evaluableAction.session.deviceSnapshot?.ipAddress;
    if (!ipAddress) {
      throw new Error("IP address not found");
    }
    return ipAddress;
  })
  .then(async (ipAddressObj) => {
    const { location, ipAddress } = ipAddressObj;
    if (ALWAYS_REFETCH_IP_DATA || !location?.latitude || !location?.longitude) {
      const maxmind = await maxmindPlugin(ipAddress);

      return maxmind;
    } else {
      return {
        ...location,
        latitude: location.latitude,
        longitude: location.longitude,
      };
    }
  });

export const geocodePaymentMethodNode = node
  .resolver(({ input }) => {
    const address =
      input.evaluableAction.paymentAttempt?.paymentMethod?.address;

    if (!address) {
      throw new Error("Address not found");
    }
    return address;
  })
  .then(geocodePlugin);

export const paymentMethodIpDistanceNode = node
  .depend({
    geolocateSession: ipDataNode,
    geolocatePaymentMethod: geocodePaymentMethodNode,
  })
  .resolver(({ deps }) => {
    const { geolocateSession, geolocatePaymentMethod } = deps;

    const distance = getPreciseDistance(
      { lat: geolocateSession.latitude, lon: geolocateSession.longitude },
      {
        lat: geolocatePaymentMethod.latitude,
        lon: geolocatePaymentMethod.longitude,
      }
    );

    const distanceKm = convertDistance(distance, "km");

    return {
      value: distanceKm,
      unit: "km",
    };
  });
