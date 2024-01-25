import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import type { AppProps } from "next/app";
import { api } from "~/utils/api";
import "../styles/globals.css";
import { QueryParamProvider } from "use-query-params";
import { NextAdapter } from "next-query-params";
import type { NextPage } from "next";
import type { ReactElement, ReactNode } from "react";
import { ThemeProvider } from "~/components/ui/custom/theme-provider";
import { Toaster } from "../components/ui/toaster";

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
          <Toaster />
        </ThemeProvider>
      </SessionProvider>
    </QueryParamProvider>
  );
}

export default api.withTRPC(MyApp);
