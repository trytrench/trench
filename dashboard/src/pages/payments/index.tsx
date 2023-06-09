import { useRouter } from "next/router";
import { Layout } from "../../components/layouts/Layout";
import { ViewNavLayout } from "../../components/layouts/ViewNavLayout";
import { type CustomPage } from "../../types/Page";
import { Box, Heading, Skeleton } from "@chakra-ui/react";
import {
  PaymentsTable,
  usePaymentsTableProps,
} from "~/components/PaymentsTable";
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
    isLoading,
    isFetching,
    isPreviousData,
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
          // Only load when fetching new data
          isLoading={isFetching}
        />
      ) : (
        <Skeleton />
      )}
    </Box>
  );
};

ViewPage.getLayout = (page) => <Layout>{page}</Layout>;

export default ViewPage;
