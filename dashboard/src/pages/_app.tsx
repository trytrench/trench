import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { type AppType } from "next/app";
import { api } from "~/utils/api";
import { ChakraProvider } from "@chakra-ui/react";
import "../styles/globals.css";
import { QueryParamProvider } from "use-query-params";
import { NextAdapter } from "next-query-params";

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  return (
    <QueryParamProvider adapter={NextAdapter}>
      <ChakraProvider>
        <SessionProvider session={session}>
          <Component {...pageProps} />
        </SessionProvider>
      </ChakraProvider>
    </QueryParamProvider>
  );
};

export default api.withTRPC(MyApp);
