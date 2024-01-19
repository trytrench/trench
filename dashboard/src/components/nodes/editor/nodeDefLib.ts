/* eslint-disable @typescript-eslint/no-unused-vars */
declare let fn: {
  geolocate: (addr: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;

    zip?: string;
    country?: string;
  }) => Promise<{
    lat: number;
    lng: number;
  }>;
};
