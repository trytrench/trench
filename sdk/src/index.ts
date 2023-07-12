import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { detectIncognito } from "detectincognitojs";
import {
  getHasLiedBrowser,
  getHasLiedLanguages,
  getHasLiedOs,
  getHasLiedResolution,
} from "./utils/fingerprint2";

export const initialize = async (baseUrl: string, sessionId: string) => {
  const fp = await FingerprintJS.load({ monitoring: false });
  const { components } = await fp.get();

  let incognitoResult;
  try {
    incognitoResult = await detectIncognito();
  } catch (error) {}

  try {
    const response = await fetch(`${baseUrl}/api/device`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        isIncognito: incognitoResult?.isPrivate,
        fingerprintComponents: components,
        fingerprint2Components: {
          hasLiedLanguages: getHasLiedLanguages(),
          hasLiedResolution: getHasLiedResolution(),
          hasLiedBrowser: getHasLiedBrowser(),
          hasLiedOs: getHasLiedOs(),
          userAgent: navigator.userAgent,
        },
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
