import { Layout } from "../../components/layouts/Layout";
import { type CustomPage } from "../../types/Page";
import { Box, Heading, Skeleton } from "@chakra-ui/react";
import {
  PaymentsTable,
  usePaymentsTableProps,
} from "~/components/PaymentsTable";
import { api } from "../../lib/api";

const ViewPage: CustomPage = () => {
  const {
    pagination,
    setPagination,
    selectedOptions,
    setSelectedOptions,
    transactionsData,
    count,
    queryProps,
    isFetching,
  } = usePaymentsTableProps({});

  const util = api.useContext();

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
          onMarkSelectedAsFraud={(paymentIds, markedAs) => {
            // refetchTransactions().catch(handleError);
            util.dashboard.paymentAttempts.getAll.setData(
              queryProps,
              (prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  data: prev.data.map((payment) => {
                    if (paymentIds.includes(payment.id)) {
                      return {
                        ...payment,
                        assessment: payment.assessment
                          ? {
                              ...payment.assessment,
                              isFraud: markedAs,
                            }
                          : null,
                      };
                    }

                    return payment;
                  }),
                };
              }
            );
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
