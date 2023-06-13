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

export const geocodeCardStream = stream.plugin({
  feedInput: ({ input }) => {
    const paymentMethod = input.paymentAttempt.paymentMethod;

    if (!paymentMethod.address) {
      throw new Error("Address not found");
    }
    return paymentMethod.address;
  },
  plugin: geocodePlugin,
});

export const cardIpDistanceStream = stream
  .depend({
    geolocateSession: ipDataStream,
    geolocateCard: geocodeCardStream,
  })
  .resolver(({ deps }) => {
    const { geolocateSession, geolocateCard } = deps;

    const distance = getPreciseDistance(
      { lat: geolocateSession.latitude, lon: geolocateSession.longitude },
      { lat: geolocateCard.latitude, lon: geolocateCard.longitude }
    );

    const distanceKm = convertDistance(distance, "km");

    return {
      value: distanceKm,
      unit: "km",
    };
  });
