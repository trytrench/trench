import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import type { AppProps } from "next/app";
import { api } from "~/utils/api";
import "../styles/globals.css";
import { QueryParamProvider } from "use-query-params";
import { NextAdapter } from "next-query-params";
import type { Metadata, NextPage } from "next";
import type { ReactElement, ReactNode } from "react";
import { ThemeProvider } from "~/components/ui/custom/theme-provider";
import { Toaster } from "../components/ui/toaster";
import Head from "next/head";

export type NextPageWithLayout<P = {}, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: ReactElement) => ReactNode;
};

type AppPropsWithLayout<P> = AppProps<P> & {
  Component: NextPageWithLayout<P>;
};

function MyApp({
  Component,
  pageProps,
}: AppPropsWithLayout<{ session: Session }>) {
  const getLayout = Component.getLayout ?? ((page) => page);

  return (
    <QueryParamProvider adapter={NextAdapter}>
      <SessionProvider session={pageProps.session}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {getLayout(<Component {...pageProps} />)}
          <Head>
            <title>Trench</title>
            <meta
              name="description"
              content="Open source fraud and abuse monitoring"
            />

            <meta itemProp="name" content="Trench" />
            <meta
              itemProp="description"
              content="Open source fraud and abuse monitoring"
            />
            <meta itemProp="image" content="" />

            <meta property="og:url" content="" />
            <meta property="og:type" content="website" />
            <meta property="og:title" content="Trench" />
            <meta
              property="og:description"
              content="Open source fraud and abuse monitoring"
            />
            <meta property="og:image" content="" />

            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content="Trench" />
            <meta
              name="twitter:description"
              content="Open source fraud and abuse monitoring"
            />
            <meta name="twitter:image" content="" />
          </Head>
          <Toaster />
        </ThemeProvider>
      </SessionProvider>
    </QueryParamProvider>
  );
}

export default api.withTRPC(MyApp);
