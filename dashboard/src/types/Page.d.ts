import { NextPage } from "next";

// Pages can state if they need to be authenticated
export type CustomPage<P = Record<string, unknown>> = NextPage<P> & {
  isPublicPage?: boolean;
  getLayout?: (page: React.ReactNode) => React.ReactNode;
};
