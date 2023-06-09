// https://github.com/fingerprintjs/fingerprintjs/blob/v2/fingerprint2.js

export const getHasLiedLanguages = function () {
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

export const getHasLiedResolution = function () {
  return (
    window.screen.width < window.screen.availWidth ||
    window.screen.height < window.screen.availHeight
  );
};

export const getHasLiedOs = function () {
  const userAgent = navigator.userAgent.toLowerCase();
  // @ts-ignore
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
    // @ts-ignore
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

export const getHasLiedBrowser = function () {
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
      // @ts-ignore
      err.toSource();
      errFirefox = true;
    } catch (errOfErr) {
      errFirefox = false;
    }
  }
  return errFirefox && browser !== "Firefox" && browser !== "Other";
};
