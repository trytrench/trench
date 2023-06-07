import FingerprintJS from "@fingerprintjs/fingerprintjs";
import {
  getCSS,
  getCSSMedia,
  getCanvas2d,
  getCanvasWebgl,
  getCapturedErrors,
  getClientRects,
  getConsoleErrors,
  getFonts,
  getHTMLElementVersion,
  getIntl,
  getLies,
  getMaths,
  getMedia,
  getOfflineAudioContext,
  getResistance,
  getSVG,
  getScreen,
  getStatus,
  getTimezone,
  getTrash,
  getVoices,
  getWebRTCData,
  getWebRTCDevices,
  getWindowFeatures,
} from "@trytrench/creepjs/src/index";
import { detectIncognito } from "detectincognitojs";
import { Base64 } from "js-base64";

const getHasLiedLanguages = function () {
  // We check if navigator.language is equal to the first language of navigator.languages
  // navigator.languages is undefined on IE11 (and potentially older IEs)
  if (typeof navigator.languages !== "undefined") {
    try {
      const firstLanguages = navigator.languages[0].substr(0, 2);
      if (firstLanguages !== navigator.language.substr(0, 2)) {
        return true;
      }
    } catch (err) {
      return true;
    }
  }
  return false;
};

const getHasLiedResolution = function () {
  return (
    window.screen.width < window.screen.availWidth ||
    window.screen.height < window.screen.availHeight
  );
};

const getHasLiedOs = function () {
  const userAgent = navigator.userAgent.toLowerCase();
  let oscpu = navigator.oscpu;
  const platform = navigator.platform.toLowerCase();
  let os;
  // We extract the OS from the user agent (respect the order of the if else if statement)
  if (userAgent.indexOf("windows phone") >= 0) {
    os = "Windows Phone";
  } else if (
    userAgent.indexOf("windows") >= 0 ||
    userAgent.indexOf("win16") >= 0 ||
    userAgent.indexOf("win32") >= 0 ||
    userAgent.indexOf("win64") >= 0 ||
    userAgent.indexOf("win95") >= 0 ||
    userAgent.indexOf("win98") >= 0 ||
    userAgent.indexOf("winnt") >= 0 ||
    userAgent.indexOf("wow64") >= 0
  ) {
    os = "Windows";
  } else if (userAgent.indexOf("android") >= 0) {
    os = "Android";
  } else if (
    userAgent.indexOf("linux") >= 0 ||
    userAgent.indexOf("cros") >= 0 ||
    userAgent.indexOf("x11") >= 0
  ) {
    os = "Linux";
  } else if (
    userAgent.indexOf("iphone") >= 0 ||
    userAgent.indexOf("ipad") >= 0 ||
    userAgent.indexOf("ipod") >= 0 ||
    userAgent.indexOf("crios") >= 0 ||
    userAgent.indexOf("fxios") >= 0
  ) {
    os = "iOS";
  } else if (
    userAgent.indexOf("macintosh") >= 0 ||
    userAgent.indexOf("mac_powerpc)") >= 0
  ) {
    os = "Mac";
  } else {
    os = "Other";
  }
  // We detect if the person uses a touch device
  const mobileDevice =
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0;

  if (
    mobileDevice &&
    os !== "Windows" &&
    os !== "Windows Phone" &&
    os !== "Android" &&
    os !== "iOS" &&
    os !== "Other" &&
    userAgent.indexOf("cros") === -1
  ) {
    return true;
  }

  // We compare oscpu with the OS extracted from the UA
  if (typeof oscpu !== "undefined") {
    oscpu = oscpu.toLowerCase();
    if (
      oscpu.indexOf("win") >= 0 &&
      os !== "Windows" &&
      os !== "Windows Phone"
    ) {
      return true;
    } else if (
      oscpu.indexOf("linux") >= 0 &&
      os !== "Linux" &&
      os !== "Android"
    ) {
      return true;
    } else if (oscpu.indexOf("mac") >= 0 && os !== "Mac" && os !== "iOS") {
      return true;
    } else if (
      (oscpu.indexOf("win") === -1 &&
        oscpu.indexOf("linux") === -1 &&
        oscpu.indexOf("mac") === -1) !==
      (os === "Other")
    ) {
      return true;
    }
  }

  // We compare platform with the OS extracted from the UA
  if (
    platform.indexOf("win") >= 0 &&
    os !== "Windows" &&
    os !== "Windows Phone"
  ) {
    return true;
  } else if (
    (platform.indexOf("linux") >= 0 ||
      platform.indexOf("android") >= 0 ||
      platform.indexOf("pike") >= 0) &&
    os !== "Linux" &&
    os !== "Android"
  ) {
    return true;
  } else if (
    (platform.indexOf("mac") >= 0 ||
      platform.indexOf("ipad") >= 0 ||
      platform.indexOf("ipod") >= 0 ||
      platform.indexOf("iphone") >= 0) &&
    os !== "Mac" &&
    os !== "iOS"
  ) {
    return true;
  } else if (platform.indexOf("arm") >= 0 && os === "Windows Phone") {
    return false;
  } else if (
    platform.indexOf("pike") >= 0 &&
    userAgent.indexOf("opera mini") >= 0
  ) {
    return false;
  } else {
    const platformIsOther =
      platform.indexOf("win") < 0 &&
      platform.indexOf("linux") < 0 &&
      platform.indexOf("mac") < 0 &&
      platform.indexOf("iphone") < 0 &&
      platform.indexOf("ipad") < 0 &&
      platform.indexOf("ipod") < 0;
    if (platformIsOther !== (os === "Other")) {
      return true;
    }
  }

  return (
    typeof navigator.plugins === "undefined" &&
    os !== "Windows" &&
    os !== "Windows Phone"
  );
};

const getHasLiedBrowser = function () {
  const userAgent = navigator.userAgent.toLowerCase();
  const productSub = navigator.productSub;

  // we extract the browser from the user agent (respect the order of the tests)
  let browser;
  if (userAgent.indexOf("edge/") >= 0 || userAgent.indexOf("iemobile/") >= 0) {
    // Unreliable, different versions use EdgeHTML, Webkit, Blink, etc.
    return false;
  } else if (userAgent.indexOf("opera mini") >= 0) {
    // Unreliable, different modes use Presto, WebView, Webkit, etc.
    return false;
  } else if (userAgent.indexOf("firefox/") >= 0) {
    browser = "Firefox";
  } else if (
    userAgent.indexOf("opera/") >= 0 ||
    userAgent.indexOf(" opr/") >= 0
  ) {
    browser = "Opera";
  } else if (userAgent.indexOf("chrome/") >= 0) {
    browser = "Chrome";
  } else if (userAgent.indexOf("safari/") >= 0) {
    if (
      userAgent.indexOf("android 1.") >= 0 ||
      userAgent.indexOf("android 2.") >= 0 ||
      userAgent.indexOf("android 3.") >= 0 ||
      userAgent.indexOf("android 4.") >= 0
    ) {
      browser = "AOSP";
    } else {
      browser = "Safari";
    }
  } else if (userAgent.indexOf("trident/") >= 0) {
    browser = "Internet Explorer";
  } else {
    browser = "Other";
  }

  if (
    (browser === "Chrome" || browser === "Safari" || browser === "Opera") &&
    productSub !== "20030107"
  ) {
    return true;
  }

  // eslint-disable-next-line no-eval
  const tempRes = eval.toString().length;
  if (
    tempRes === 37 &&
    browser !== "Safari" &&
    browser !== "Firefox" &&
    browser !== "Other"
  ) {
    return true;
  } else if (
    tempRes === 39 &&
    browser !== "Internet Explorer" &&
    browser !== "Other"
  ) {
    return true;
  } else if (
    tempRes === 33 &&
    browser !== "Chrome" &&
    browser !== "AOSP" &&
    browser !== "Opera" &&
    browser !== "Other"
  ) {
    return true;
  }

  // We create an error to see how it is handled
  let errFirefox;
  try {
    // eslint-disable-next-line no-throw-literal
    throw "a";
  } catch (err) {
    try {
      err.toSource();
      errFirefox = true;
    } catch (errOfErr) {
      errFirefox = false;
    }
  }
  return errFirefox && browser !== "Firefox" && browser !== "Other";
};

function encode(input: string): string {
  // 1. Base64 encode the input string
  const base64 = Base64.encode(input);

  // Convert the base64 string to a Uint8Array for manipulation
  const byteArray = Base64.toUint8Array(base64);

  // 2. Shift every hex digit by 7
  for (let i = 0; i < byteArray.length; i++) {
    const hexDigit = byteArray[i];
    if (!hexDigit) {
      continue;
    }

    // Separate the two half-bytes (hex digits)
    let high = hexDigit >> 4;
    let low = hexDigit & 0x0f;

    // Shift each half-byte by 7
    high = (high + 7) % 16;
    low = (low + 7) % 16;

    // Combine the half-bytes back into one byte
    byteArray[i] = (high << 4) | low;
  }

  // 3. Base64 encode the byteArray again
  const doubleBase64 = Base64.fromUint8Array(byteArray);

  return doubleBase64;
}

export const initialize = async (baseUrl: string, id: string) => {
  const fp = await FingerprintJS.load({ monitoring: false });
  const { components } = await fp.get();

  let payload: any = {
    externalSessionId: id,
    deviceToken: localStorage.getItem("deviceToken") ?? undefined,
    device: components,
  };

  try {
    // @ts-ignore
    const [
      // workerScopeComputed,
      voicesComputed,
      offlineAudioContextComputed,
      canvasWebglComputed,
      // canvas2dComputed,
      windowFeaturesComputed,
      htmlElementVersionComputed,
      cssComputed,
      cssMediaComputed,
      screenComputed,
      mathsComputed,
      consoleErrorsComputed,
      timezoneComputed,
      clientRectsComputed,
      fontsComputed,
      mediaComputed,
      svgComputed,
      resistanceComputed,
      intlComputed,
    ] = await Promise.all([
      // getBestWorkerScope(),
      getVoices(),
      getOfflineAudioContext(),
      getCanvasWebgl(),
      // getCanvas2d(),
      getWindowFeatures(),
      getHTMLElementVersion(),
      getCSS(),
      getCSSMedia(),
      getScreen(),
      getMaths(),
      getConsoleErrors(),
      getTimezone(),
      getClientRects(),
      getFonts(),
      getMedia(),
      getSVG(),
      getResistance(),
      getIntl(),
    ]);

    const fingerprint = {
      // workerScopeComputed,
      voicesComputed,
      offlineAudioContextComputed,
      canvasWebglComputed: {
        ...canvasWebglComputed,
        dataURI: undefined,
        dataURI2: undefined,
        pixels: undefined,
        pixels2: undefined,
      },
      // canvas2dComputed,
      windowFeaturesComputed,
      htmlElementVersionComputed,
      cssComputed,
      cssMediaComputed,
      screenComputed,
      mathsComputed: {
        data: Object.entries(mathsComputed?.data ?? {}).reduce(
          (acc, [key, value]) => ({
            ...acc,
            // @ts-ignore
            [key]: value?.result ?? undefined,
          }),
          {}
        ),
      },
      consoleErrorsComputed,
      timezoneComputed,
      clientRectsComputed,
      fontsComputed,
      mediaComputed,
      svgComputed,
      resistanceComputed,
      intlComputed,
    };

    const [lies, trash, capturedErrors, incognitoResult] = await Promise.all([
      getLies(),
      getTrash(),
      getCapturedErrors(),
      detectIncognito().catch((error) => {}),
    ]);

    const [webRTCData, webRTCDevices, status] = await Promise.all([
      getWebRTCData(),
      getWebRTCDevices(),
      getStatus(),
    ]);

    payload = {
      ...payload,
      fingerprint,
      lies,
      trash,
      capturedErrors,
      incognitoResult,
      webRTCData,
      webRTCDevices,
      status,
      fp2Data: {
        hasLiedLanguages: getHasLiedLanguages(),
        hasLiedResolution: getHasLiedResolution(),
        hasLiedBrowser: getHasLiedBrowser(),
        hasLiedOs: getHasLiedOs(),
      },
    };
  } catch (error) {
    console.error("Error loading trench data:", error);
  }

  const obfs = encode(JSON.stringify(payload));

  try {
    const response = await fetch(`${baseUrl}/device`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payload: obfs,
      }),
    });
    if (response.status === 200) {
      const { deviceToken } = await response.json();
      localStorage.setItem("deviceToken", deviceToken);
    }
  } catch (error) {
    console.error("Error sending data:", error);
  }
};
