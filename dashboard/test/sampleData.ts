export function mockIpAddress() {
  return {
    id: "ip_1234",
    ipAddress: "172.10.120.186",
    createdAt: "2023-02-28T02:14:18.638Z",
    updatedAt: "2023-03-16T14:40:56.646Z",
    locationId: "locId",
    metadata: {
      isp: "Google Cloud",
      cityName: "Seoul",
      latitude: 37.5794,
      longitude: 126.9754,
      timezone: "Asia/Seoul",
      userType: "hosting",
      userCount: 2,
      postalCode: "04524",
      countryName: "South Korea",
      isAnonymous: true,
      cityGeonameId: 1835848,
      continentName: "Asia",
      isPublicProxy: false,
      isTorExitNode: false,
      accuracyRadius: 20,
      cityConfidence: 50,
      countryISOCode: "KR",
      isAnonymousVpn: false,
      subdivisionName: "Seoul",
      continentISOCode: "AS",
      postalConfidence: 20,
      countryConfidence: 99,
      isHostingProvider: true,
      isLegitimateProxy: false,
      isResidentialProxy: false,
      subdivisionISOCode: "11",
      subdivisionConfidence: 80,
    },
    location: {
      id: "loc_1234",
      latitude: 37.5794,
      longitude: 126.9754,
      cityGeonameId: 1835848,
      cityName: "Seoul",
      countryISOCode: "KR",
      countryName: "South Korea",
      postalCode: "04524",
      regionISOCode: "11",
      regionName: "Seoul",
    },
  };
}

export function mockDevice() {
  return {
    id: "device_1234",
    updatedAt: "2023-03-16T17:41:21.430Z",
    createdAt: "2023-03-16T17:41:21.430Z",
  };
}

export function mockDeviceSnapshot() {
  return {
    id: "deviceSnapshot_1234",
    createdAt: "2023-06-14T19:40:22.530Z",
    updatedAt: "2023-06-14T19:40:22.530Z",
    fingerprint: "test_fingerprint1234567",
    userAgent:
      "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/114.0",
    browserName: "Firefox",
    browserVersion: "114.0",
    deviceModel: null,
    deviceType: null,
    deviceVendor: null,
    engineName: "Gecko",
    engineVersion: "109.0",
    osName: "Ubuntu",
    osVersion: null,
    cpuArchitecture: "amd64",
    isIncognito: false,
    reqUserAgent:
      "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/114.0",
    screenResolution: "1920x1080",
    timezone: "America/Chicago",
    metadata: {},
  };
}
