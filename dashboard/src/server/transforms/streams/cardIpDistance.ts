import { stream } from "../flow";
import { geocodePlugin } from "../plugins/geocode";
import { maxmindPlugin } from "../plugins/maxmind";
import { convertDistance, getPreciseDistance } from "geolib";

export const ipDataStream = stream.plugin({
  feedInput: ({ input }) => {
    const ipAddress =
      input.paymentAttempt.checkoutSession.deviceSnapshot?.ipAddress?.ipAddress;
    if (!ipAddress) {
      throw new Error("IP address not found");
    }
    return ipAddress;
  },
  plugin: maxmindPlugin,
});

export const geocodeCard = stream.plugin({
  feedInput: ({ input }) => {
    const paymentMethod = input.paymentAttempt.paymentMethod;
    return paymentMethod.address;
  },
  plugin: geocodePlugin,
});

export const cardIpDistanceStream = stream
  .depend({
    geolocateSession: ipDataStream,
    geolocateCard: geocodeCard,
  })
  .resolver(({ deps }) => {
    const { geolocateSession, geolocateCard } = deps;

    if (!geolocateSession.latitude || !geolocateSession.longitude) {
      throw new Error("Session latitude or longitude is missing");
    }
    if (!geolocateCard.center[1] || !geolocateCard.center[0]) {
      throw new Error("Card center lat or long is missing");
    }

    const distance = getPreciseDistance(
      { lat: geolocateSession.latitude, lon: geolocateSession.longitude },
      { lat: geolocateCard.center[1], lon: geolocateCard.center[0] }
    );

    const distanceKm = convertDistance(distance, "km");

    return {
      value: distanceKm,
      unit: "km",
    };
  });
