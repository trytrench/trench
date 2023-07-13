import { node } from "../flow";
import { geocodePlugin } from "../plugins/geocode";
import { maxmindPlugin } from "../plugins/maxmind";
import { convertDistance, getPreciseDistance } from "geolib";

// global.crypto = require("crypto");

const ALWAYS_REFETCH_IP_DATA = false;

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
    const cardCountry =
      input.evaluableAction.paymentAttempt?.paymentMethod?.card?.country;
    if (!address) {
      throw new Error("Address not found");
    }
    return {
      ...address,
      country: address.country ?? cardCountry ?? null,
    };
  })
  .then(async (addr) => {
    try {
      const res = await geocodePlugin(addr);
      return res;
    } catch {
      // If we can't geocode the address, try again without the country
      const res = await geocodePlugin({
        ...addr,
        country: null,
      });
      return res;
    }
  });

export const paymentMethodIpDistanceNode = node
  .depend({
    geolocateSession: ipDataNode,
    geolocatePaymentMethod: geocodePaymentMethodNode,
  })
  .resolver(({ deps, input }) => {
    const { geolocateSession, geolocatePaymentMethod } = deps;

    const payMethodLocation =
      input.evaluableAction.paymentAttempt?.paymentMethod?.address?.location;
    const payLoc =
      payMethodLocation?.latitude && payMethodLocation?.longitude
        ? {
            latitude: payMethodLocation.latitude,
            longitude: payMethodLocation.longitude,
          }
        : geolocatePaymentMethod;

    const distance = getPreciseDistance(
      { lat: geolocateSession.latitude, lon: geolocateSession.longitude },
      {
        lat: payLoc.latitude,
        lon: payLoc.longitude,
      }
    );

    const distanceKm = convertDistance(distance, "km");

    return {
      value: distanceKm,
      unit: "km",
    };
  });
