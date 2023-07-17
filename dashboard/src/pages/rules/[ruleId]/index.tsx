import {
  Box,
  Button,
  HStack,
  Heading,
  Link,
  Text,
  VStack,
  useToast,
  IconButton,
  Skeleton,
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import { useState, useCallback, useEffect, useMemo } from "react";
import { RuleForm, type RuleFormType } from "../../../components/RuleForm";
import { api } from "../../../lib/api";
import { handleError } from "../../../lib/handleError";
import { type CustomPage } from "../../../types/Page";
import { Layout } from "../../../components/layouts/Layout";
import { Highlight, themes } from "prism-react-renderer";
import { PREFIX, SUFFIX } from "~/components/editor/constants";
import RuleExecutionStackedBarChart from "~/components/charts/RuleExecutionStackedBarChart";
import dynamic from "next/dynamic";
import { EditIcon } from "lucide-react";
import {
  PaymentsTable,
  useEvaluableActionProps,
} from "~/components/EvaluableActionsTable";
import { RiskLevelTag } from "../../../components/RiskLevelTag";

// const DynamicBarChart = dynamic(
//   () => import("~/components/charts/RuleExecutionStackedBarChart"),
//   { ssr: false }
// );

const EditRulePage: CustomPage = () => {
  const router = useRouter();

  const [showCode, setShowCode] = useState(false);
  const util = api.useContext();

  const ruleId = router.query.ruleId as string;
  const { data: ruleData } = api.dashboard.rules.get.useQuery({
    id: ruleId,
  });

  const ruleSnapshot = ruleData?.currentRuleSnapshot;

  // const { data: statsData } = api.dashboard.rules.getStatistics.useQuery({
  //   id: ruleId,
  // });

  //

  const {
    pagination,
    setPagination,
    selectedOptions,
    setSelectedOptions,
    data: paymentsData,
    count,
    queryProps,
  } = useEvaluableActionProps({
    executedRuleSnapshotId: ruleSnapshot?.id,
  });

  const realCode = useMemo(() => {
    return `${PREFIX}\n${ruleSnapshot?.tsCode ?? ""}\n${SUFFIX}`;
  }, [ruleSnapshot?.tsCode]);

  if (!ruleSnapshot) return null;
  return (
    <Box>
      <Box flexDirection="column">
        <Heading>
          Rule: {ruleSnapshot.name}
          <Link
            href={`/rules/${ruleData.id}/edit`}
            ml={4}
            mb={4}
            alignSelf="center"
          >
            {/* <Button>Edit</Button> */}
            <IconButton icon={<EditIcon />} aria-label={"Edit"} />
          </Link>
        </Heading>

        <Heading mt={8} mb={2} size="sm">
          Description
        </Heading>
        <Text color={ruleSnapshot.description ? "black" : "gray.500"}>
          {ruleSnapshot.description || "None"}
        </Text>

        <Heading mt={8} mb={2} size="sm">
          Risk Level
        </Heading>
        <RiskLevelTag riskLevel={ruleSnapshot.riskLevel} />

        <Heading mt={8} mb={2} size="sm">
          Code{" "}
          <Button
            size="xs"
            ml={2}
            onClick={() => {
              setShowCode((prev) => !prev);
            }}
          >
            {showCode ? "Hide" : "Show"}
          </Button>
        </Heading>
        {showCode ? (
          <Highlight
            theme={themes.vsDark}
            code={realCode}
            language="typescript"
          >
            {({ className, style, tokens, getLineProps, getTokenProps }) => (
              <pre
                style={{
                  ...style,
                  padding: "12px",
                }}
              >
                {tokens.map((line, i) => (
                  <div
                    key={i}
                    {...getLineProps({ line })}
                    style={{
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {/* <span>{i + 1}</span> */}
                    {line.map((token, key) => (
                      <span key={key} {...getTokenProps({ token })} />
                    ))}
                  </div>
                ))}
              </pre>
            )}
          </Highlight>
        ) : (
          <Box>
            <Text color="gray.500">Hidden</Text>
          </Box>
        )}
      </Box>
      <Box mt={8}>
        <Heading mb={4}>Payments</Heading>
        {paymentsData ? (
          <PaymentsTable
            onMarkSelectedAsFraud={(paymentIds, markedAs) => {
              util.dashboard.evaluableActions.getAll.setData(
                queryProps,
                (prev) => {
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
            allowMarkAsFraud={true}
            paymentsData={paymentsData}
            count={count}
            pagination={pagination}
            onPaginationChange={setPagination}
            selectedOptions={selectedOptions}
            onSelectedOptionsChange={setSelectedOptions}
          />
        ) : (
          <Skeleton />
        )}
      </Box>
      {/* <Box mt={8}>
        <Heading mb={4}>Statistics</Heading>
        {statsData && (
          <DynamicBarChart
            data={statsData.ruleActivationChart}
            width={800}
            height={300}
          />
        )}
      </Box> */}
    </Box>
  );
};

EditRulePage.getLayout = (page) => <Layout>{page}</Layout>;

export default EditRulePage;
