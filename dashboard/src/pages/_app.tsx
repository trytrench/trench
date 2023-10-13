import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import type { AppProps } from "next/app";
import { api } from "~/utils/api";
import { ChakraProvider } from "@chakra-ui/react";
import "../styles/globals.css";
import { QueryParamProvider } from "use-query-params";
import { NextAdapter } from "next-query-params";
import type { NextPage } from "next";
import type { ReactElement, ReactNode } from "react";

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
      <ChakraProvider>
        <SessionProvider session={pageProps.session}>
          {getLayout(<Component {...pageProps} />)}
        </SessionProvider>
      </ChakraProvider>
    </QueryParamProvider>
  );
}

export default api.withTRPC(MyApp);
