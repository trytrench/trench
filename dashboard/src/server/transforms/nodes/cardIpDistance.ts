import { node } from "../flow";
import { geocodePlugin } from "../plugins/geocode";
import { maxmindPlugin } from "../plugins/maxmind";
import { convertDistance, getPreciseDistance } from "geolib";

export const ipDataNode = node
  .resolver(({ input }) => {
    const ipAddress =
      input.paymentAttempt.checkoutSession.deviceSnapshot?.ipAddress?.ipAddress;
    if (!ipAddress) {
      throw new Error("IP address not found");
    }
    return ipAddress;
  })
  .then(maxmindPlugin);

export const geocodePaymentMethodNode = node
  .resolver(({ input }) => {
    const paymentMethod = input.paymentAttempt.paymentMethod;

    if (!paymentMethod.address) {
      throw new Error("Address not found");
    }
    return paymentMethod.address;
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
