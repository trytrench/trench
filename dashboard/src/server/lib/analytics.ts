import { PostHog } from "posthog-node";

const posthog = new PostHog("phc_geKdMR6WVsF9KRdlRh4dU6xRFhSzPLca6o7dlQzS4E", {
  host: "https://app.posthog.com",
});

export const trackEvent = (event: string) =>
  posthog.capture({
    distinctId: "server",
    event,
  });
