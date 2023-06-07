import { useRouter } from "next/router";
import { Layout } from "../../components/layouts/Layout";
import { ViewNavLayout } from "../../components/layouts/ViewNavLayout";
import { type CustomPage } from "../../types/Page";
import { ViewSessions } from "../../components/views/ViewSessions";
import { Box, Heading, Skeleton } from "@chakra-ui/react";
import {
  TransactionsTable,
  useTransactionTableProps,
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
  } = useTransactionTableProps({});

  return (
    <Box>
      <Heading>Transactions</Heading>
      {transactionsData ? (
        <TransactionsTable
          transactionsData={transactionsData}
          count={count}
          pagination={pagination}
          onPaginationChange={setPagination}
          selectedOptions={selectedOptions}
          onSelectedOptionsChange={setSelectedOptions}
          allowMarkAsFraud={true}
          onMarkSelectedAsFraud={() => {
            refetchTransactions().catch(handleError);
          }}
        />
      ) : (
        <Skeleton />
      )}
    </Box>
  );
};

ViewPage.getLayout = (page) => <Layout>{page}</Layout>;

export default ViewPage;
