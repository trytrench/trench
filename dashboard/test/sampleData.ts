const Defaults = {
  ExternalSessionId: "externalSessionId",
};

export function mockTransaction(props?: { externalSessionId?: string }) {
  const { externalSessionId = Defaults.ExternalSessionId } = props ?? {};

  return {
    customer: {
      externalId: "1234",
      email: "johndoe@example.com",
    },
    paymentMethod: {
      name: "John Does",
      externalId: "1234",
      card: {
        last4: "1234",
        bin: "456789",
        country: "US",
        brand: "Visa",
        funding: "credit",
        issuer: "Bank of Example",
        fingerprint: "e5e5b5f7h5i5j5k5",
        wallet: "exampleWallet",
        threeDSecureSupported: true,
        cvcCheckResult: "pass",
      },
      billingDetails: {
        name: "John Does",
        email: "johndoe@example.com",
      },
    },
    transaction: {
      amount: 10000,
      currency: "USD",
      quantity: 1,
      sellerId: "seller_67890",
      walletAddress: "0x9fB29AAc15b9A4B7F17c3385939b007540f4d791",
    },
    session: {
      externalId: externalSessionId,
    },
  };
}
export function mockSampleDevice() {
  return {
    hdr: {
      value: true,
      duration: 0,
    },
    math: {
      value: {
        cos: -0.8390715290095377,
        exp: 2.718281828459045,
        sin: 0.8178819121159085,
        tan: -1.4214488238747245,
        acos: 1.4473588658278522,
        asin: 0.12343746096704435,
        atan: 0.4636476090008061,
        cosh: 1.5430806348152437,
        sinh: 1.1752011936438014,
        tanh: 0.7615941559557649,
        acosh: 709.889355822726,
        asinh: 0.881373587019543,
        atanh: 0.5493061443340548,
        expm1: 1.718281828459045,
        log1p: 2.3978952727983707,
        powPI: 1.9275814160560204e-50,
        coshPf: 1.5430806348152437,
        sinhPf: 2.534342107873324,
        tanhPf: 0.7615941559557649,
        acoshPf: 355.291251501643,
        asinhPf: 0.8813735870195429,
        atanhPf: 0.5493061443340548,
        expm1Pf: 1.718281828459045,
        log1pPf: 2.3978952727983707,
      },
      duration: 0,
    },
    audio: {
      value: 124.04344968475198,
      duration: 4,
    },
    fonts: {
      value: ["Arial Unicode MS", "Gill Sans", "Helvetica Neue", "Menlo"],
      duration: 77,
    },
    osCpu: {
      duration: 0,
    },
    canvas: {
      value: {
        text: "test",
        winding: true,
        geometry: "geo",
      },
      duration: 29,
    },
    vendor: {
      value: "Google Inc.",
      duration: 0,
    },
    plugins: {
      value: [
        {
          name: "Chrome PDF Plugin",
          mimeTypes: [
            {
              type: "application/x-google-chrome-pdf",
              suffixes: "pdf",
            },
          ],
          description: "Portable Document Format",
        },
        {
          name: "Chrome PDF Viewer",
          mimeTypes: [
            {
              type: "application/pdf",
              suffixes: "pdf",
            },
          ],
          description: "",
        },
      ],
      duration: 1,
    },
    contrast: {
      value: 0,
      duration: 0,
    },
    cpuClass: {
      duration: 0,
    },
    platform: {
      value: "MacIntel",
      duration: 0,
    },
    timezone: {
      value: "America/Los_Angeles",
      duration: 7,
    },
    indexedDB: {
      value: true,
      duration: 0,
    },
    languages: {
      value: [["en-US"]],
      duration: 0,
    },
    videoCard: {
      value: {
        vendor: "Google Inc. (Apple)",
        renderer: "ANGLE (Apple, Apple M2 Max, OpenGL 4.1)",
      },
      duration: 23,
    },
    colorDepth: {
      value: 30,
      duration: 0,
    },
    colorGamut: {
      value: "p3",
      duration: 0,
    },
    monochrome: {
      value: 0,
      duration: 0,
    },
    domBlockers: {
      duration: 12,
    },
    screenFrame: {
      value: [40, 0, 0, 0],
      duration: 1,
    },
    architecture: {
      value: 127,
      duration: 0,
    },
    deviceMemory: {
      value: 8,
      duration: 0,
    },
    forcedColors: {
      value: false,
      duration: 0,
    },
    localStorage: {
      value: true,
      duration: 0,
    },
    openDatabase: {
      value: true,
      duration: 0,
    },
    touchSupport: {
      value: {
        touchEvent: false,
        touchStart: false,
        maxTouchPoints: 0,
      },
      duration: 0,
    },
    reducedMotion: {
      value: false,
      duration: 0,
    },
    vendorFlavors: {
      value: ["chrome"],
      duration: 0,
    },
    cookiesEnabled: {
      value: true,
      duration: 0,
    },
    invertedColors: {
      duration: 1,
    },
    sessionStorage: {
      value: true,
      duration: 0,
    },
    fontPreferences: {
      value: {
        min: 9.234375,
        mono: 132.625,
        sans: 144.015625,
        apple: 147.5625,
        serif: 147.5625,
        system: 146.09375,
        default: 147.5625,
      },
      duration: 20,
    },
    pdfViewerEnabled: {
      value: true,
      duration: 0,
    },
    screenResolution: {
      value: [1728, 1117],
      duration: 0,
    },
    hardwareConcurrency: {
      value: 12,
      duration: 0,
    },
  };
}
