import { Layout } from "../../components/layouts/Layout";
import { type CustomPage } from "../../types/Page";
import { Box, Heading, Skeleton } from "@chakra-ui/react";
import {
  PaymentsTable,
  useEvaluableActionProps,
} from "~/components/EvaluableActionsTable";
import { api } from "../../lib/api";

const ViewPage: CustomPage = () => {
  const {
    pagination,
    setPagination,
    selectedOptions,
    setSelectedOptions,
    data: paymentsData,
    count,
    queryProps,
    isFetching,
  } = useEvaluableActionProps({});

  const util = api.useContext();

  return (
    <Box>
      <Heading>Payments</Heading>
      {paymentsData ? (
        <PaymentsTable
          paymentsData={paymentsData}
          count={count}
          pagination={pagination}
          onPaginationChange={setPagination}
          selectedOptions={selectedOptions}
          onSelectedOptionsChange={setSelectedOptions}
          allowMarkAsFraud={true}
          onMarkSelectedAsFraud={(paymentIds, markedAs) => {
            util.dashboard.evaluableActions.getAll.setData(
              queryProps,
              (prev) => {
                console.log(prev);
                if (!prev) return prev;
                return {
                  ...prev,
                  rows: prev.rows.map((action) => {
                    if (paymentIds.includes(action.id)) {
                      return { ...action, isFraud: markedAs };
                    } else {
                      return action;
                    }
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
