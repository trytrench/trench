import { ChakraProvider, baseTheme, extendTheme } from "@chakra-ui/react";
import { api } from "~/lib/api";
import { SessionProvider, signIn, useSession } from "next-auth/react";
import { type CustomPage } from "../types/Page";
import { useEffect, type ReactNode } from "react";
import { Inter } from "next/font/google";
import { type Session } from "next-auth";
import { type AppPropsType } from "next/dist/shared/lib/utils";
import { useRouter, type NextRouter } from "next/router";
import { handleError } from "../lib/handleError";
import "../styles/globals.css";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";

type CustomAppProps = AppPropsType<NextRouter, { session: Session | null }> & {
  Component: CustomPage;
};

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

if (typeof window !== "undefined") {
  posthog.init("phc_geKdMR6WVsF9KRdlRh4dU6xRFhSzPLca6o7dlQzS4E", {
    api_host: "https://app.posthog.com",
    autocapture: false,
    loaded: (posthog) => {
      if (process.env.NODE_ENV === "development") posthog.debug();
    },
  });
}

const RenderComponent = (props: CustomAppProps) => {
  const { Component, pageProps } = props;

  const isPublicPage = Component.isPublicPage || false;
  const { status } = useSession();
  const getLayout = Component.getLayout || ((page: ReactNode) => page);

  if (status === "loading") {
    return null;
  }

  return (
    <>
      {status === "authenticated" || isPublicPage ? (
        <>{getLayout(<Component {...pageProps} />)}</>
      ) : (
        <RedirectToSignIn />
      )}
    </>
  );
};

const MyApp = (props: CustomAppProps) => {
  const { pageProps } = props;
  const router = useRouter();

  useEffect(() => {
    // Track page views
    const handleRouteChange = () => posthog?.capture("$pageview");
    router.events.on("routeChangeComplete", handleRouteChange);

    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, []);

  const theme = extendTheme({
    colors: {
      subtle: baseTheme.colors.gray[500],
    },
    fonts: {
      heading: inter.style.fontFamily,
      body: inter.style.fontFamily,
    },
    components: {
      Text: {
        variants: {
          caption: {
            fontSize: "xs",
            fontWeight: "semibold",
            textTransform: "uppercase",
            color: "gray.700",
          },
        },
      },
      Menu: {
        baseStyle: {
          item: {
            fontSize: "sm",
          },
        },
      },
    },
  });

  return (
    <PostHogProvider client={posthog}>
      <ChakraProvider theme={theme}>
        <SessionProvider session={pageProps.session}>
          <RenderComponent {...props} />
        </SessionProvider>
      </ChakraProvider>
    </PostHogProvider>
  );
};

function RedirectToSignIn() {
  useEffect(() => {
    signIn().catch(handleError);
  }, []);

  return null;
}

export default api.withTRPC(MyApp);
