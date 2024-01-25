type IpAddressInfo = {
  latitude: number;
  longitude: number;
  accuracyRadius: number;

  // Below are optional
  averageIncome: number | undefined;
  timezone: string | undefined;
  isp: string | undefined;
  cityName: string | undefined;
  userType: string | undefined;
  userCount: number | undefined;
  postalCode: string | undefined;
  countryName: string | undefined;
  isAnonymous: boolean | undefined;
  cityGeonameId: number | undefined;
  continentName: string | undefined;
  isPublicProxy: boolean | undefined;
  isTorExitNode: boolean | undefined;
  staticIPScore: number | undefined;
  cityConfidence: number | undefined;
  countryISOCode: string | undefined;
  isAnonymousVpn: boolean | undefined;
  subdivisionName: string | undefined;
  continentISOCode: string | undefined;
  postalConfidence: number | undefined;
  countryConfidence: number | undefined;
  isHostingProvider: boolean | undefined;
  isLegitimateProxy: boolean | undefined;
  isResidentialProxy: boolean | undefined;
  subdivisionISOCode: string | undefined;
  subdivisionConfidence: number | undefined;
};

declare let fn: {
  geolocate: (addr: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;

    zip?: string;
    country?: string;
    postalCode?: string;
  }) => Promise<{
    location: {
      lat: number;
      lng: number;
    };
    countryCode: string;
  }>;

  getIpData: (ipAddress: string) => Promise<IpAddressInfo>;
};
