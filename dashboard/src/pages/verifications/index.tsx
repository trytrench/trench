import { Box, Heading, Skeleton } from "@chakra-ui/react";
import { KycAttemptsTable } from "~/components/KycAttemptsTable";
import { api } from "~/lib/api";
import { Layout } from "../../components/layouts/Layout";
import { type CustomPage } from "../../types/Page";

const Page: CustomPage = () => {
  const { data } = api.dashboard.verifications.getAll.useQuery({});

  if (!data) return <Skeleton />;

  return (
    <Box>
      <Heading mb={4}>Verifications</Heading>
      <KycAttemptsTable data={data.rows} />
    </Box>
  );
};

Page.getLayout = (page) => <Layout>{page}</Layout>;

export default Page;
