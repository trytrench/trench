import "./computedNodeLib";

export const functions: typeof fn = {
  getIpData: async (ipAddress) => {
    throw new Error("Not implemented in browser");
  },
  geolocate: async (address) => {
    throw new Error("Not implemented in browser");
  },
};
