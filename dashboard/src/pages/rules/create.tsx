import { Layout } from "~/components/layouts/Layout";
import { useToast } from "@chakra-ui/react";
import { useCallback, useEffect, useState } from "react";
import { type CustomPage } from "../../types/Page";
import { api } from "../../lib/api";
import { handleError } from "../../lib/handleError";
import { useRouter } from "next/router";
import { RuleForm, type RuleFormType } from "../../components/RuleForm";
import { RiskLevel } from "~/common/types";

const RulesPage: CustomPage = () => {
  const router = useRouter();
  const toast = useToast();

  const { isLoading: userFlowsLoading, data: userFlows } =
    api.dashboard.userFlows.getAll.useQuery();

  const [rule, setRule] = useState<RuleFormType>({
    name: "",
    description: "",
    tsCode: "",
    jsCode: "",
    userFlowId: userFlows?.[0]?.id ?? "",
    riskLevel: RiskLevel.Medium,
  });

  useEffect(() => {
    const userFlowId = userFlows?.[0]?.id;
    if (userFlowId) {
      setRule((rule) => ({ ...rule, userFlowId: userFlowId }));
    }
  }, [userFlows]);

  const { mutateAsync: createRule, isLoading: loadingCreateRule } =
    api.dashboard.rules.create.useMutation();

  const handleSubmit = useCallback(
    (newRule: RuleFormType) => {
      createRule(newRule)
        .then(() => {
          toast({
            title: "Success",
            description: "Rule created successfully",
            status: "success",
          });
          router.push("/rules").catch(handleError);
        })
        .catch((err) => {
          toast({
            title: "Error creating rule",
            // description: err.message,
            status: "error",
          });
          handleError(err);
        });
    },
    [createRule, router, toast]
  );

  if (!userFlows) return null;

  return (
    <RuleForm
      mode="create"
      rule={rule}
      userFlows={userFlows.map((userFlow) => ({
        id: userFlow.id,
        name: userFlow.name,
      }))}
      onChange={setRule}
      onSubmit={handleSubmit}
      loading={loadingCreateRule}
    />
  );
};

RulesPage.getLayout = (page) => <Layout>{page}</Layout>;

export default RulesPage;
