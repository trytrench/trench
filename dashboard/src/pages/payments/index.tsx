import { useRouter } from "next/router";
import { Layout } from "../../components/layouts/Layout";
import { ViewNavLayout } from "../../components/layouts/ViewNavLayout";
import { type CustomPage } from "../../types/Page";
import { Box, Heading, Skeleton } from "@chakra-ui/react";
import {
  PaymentsTable,
  usePaymentsTableProps,
} from "~/components/TransactionsTable";
import { handleError } from "~/lib/handleError";

const ViewPage: CustomPage = () => {
  const {
    pagination,
    setPagination,
    selectedOptions,
    setSelectedOptions,
    transactionsData,
    count,
    refetchTransactions,
  } = usePaymentsTableProps({});

  return (
    <Box>
      <Heading>Transactions</Heading>
      {transactionsData ? (
        <PaymentsTable
          paymentsData={transactionsData}
          count={count}
          pagination={pagination}
          onPaginationChange={setPagination}
          selectedOptions={selectedOptions}
          onSelectedOptionsChange={setSelectedOptions}
          allowMarkAsFraud={true}
          onMarkSelectedAsFraud={() => {
            refetchTransactions().catch(handleError);
          }}
          isLoading={isLoading}
        />
      ) : (
        <Skeleton />
      )}
    </Box>
  );
};

ViewPage.getLayout = (page) => <Layout>{page}</Layout>;

export default ViewPage;
