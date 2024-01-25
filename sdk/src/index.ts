import FingerprintJS, { Agent } from "@fingerprintjs/fingerprintjs";
import UAParser from "ua-parser-js";

class Trench {
  baseUrl: string;
  sessionId: string;
  clientKey: string;
  deviceToken = localStorage.getItem("deviceToken");
  fp: Agent | null = null;

  constructor(baseUrl: string, sessionId: string, clientKey: string) {
    this.baseUrl = baseUrl;
    this.sessionId = sessionId;
    this.clientKey = clientKey;
  }

  private async initFingerprint(): Promise<void> {
    this.fp = await FingerprintJS.load({ monitoring: false });
  }

  async pageview(): Promise<void> {
    if (!this.fp) {
      await this.initFingerprint();
    }

    const components = await this.fp!.get();
    const userAgentData = new UAParser().getResult();

    try {
      const response = await fetch(`${this.baseUrl}/api/sdk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.clientKey,
        },
        body: JSON.stringify({
          type: "pageview",
          data: {
            userAgent: userAgentData.ua,
            device: userAgentData.device,
            os: userAgentData.os,
            browser: userAgentData.browser,
            cpu: userAgentData.cpu,
            engine: userAgentData.engine,
            currentUrl: window?.location.href,
            referrer: document?.referrer ?? "$direct",
            host: window?.location.host,
            pathname: window?.location.pathname,
            browserLanguage: navigator.language,
            screenHeight: window?.screen.height,
            screenWidth: window?.screen.width,
            viewportHeight: window?.innerHeight,
            viewportWidth: window?.innerWidth,
            sessionId: this.sessionId,
            deviceToken: this.deviceToken,
            fingerprintComponents: components.components,
          },
        }),
      });

      if (response.status === 200) {
        const { deviceToken } = await response.json();
        this.deviceToken = deviceToken;
        localStorage.setItem("deviceToken", deviceToken);
      }
    } catch (error) {
      console.error(error);
    }
  }
}

export default Trench;
