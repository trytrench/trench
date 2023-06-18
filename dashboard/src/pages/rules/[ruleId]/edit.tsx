import { useToast } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { useState, useCallback, useEffect } from "react";
import { RuleForm, type RuleFormType } from "../../../components/RuleForm";
import { api } from "../../../lib/api";
import { handleError } from "../../../lib/handleError";
import { type CustomPage } from "../../../types/Page";
import { Layout } from "../../../components/layouts/Layout";
import { type RiskLevel } from "../../../common/types";

const EditRulePage: CustomPage = () => {
  const router = useRouter();
  const toast = useToast();

  const ruleId = router.query.ruleId as string;

  const { data: ruleData } = api.dashboard.rules.get.useQuery(
    {
      id: ruleId,
    },
    {
      refetchOnWindowFocus: false,
    }
  );

  const [rule, setRule] = useState<RuleFormType>();

  useEffect(() => {
    if (ruleData) {
      setRule({
        ...ruleData.currentRuleSnapshot,
        riskLevel: ruleData.currentRuleSnapshot.riskLevel as RiskLevel,
      });
    }
  }, [ruleData]);

  const { mutateAsync: editRule, isLoading: loadingEditRule } =
    api.dashboard.rules.update.useMutation();

  const handleSubmit = useCallback(
    (newRule: RuleFormType) => {
      editRule({
        id: ruleId,
        data: newRule,
      })
        .then(() => {
          toast({
            title: "Success",
            description: "Rule updated successfully",
            status: "success",
          });
          router.push("/rules").catch(handleError);
        })
        .catch((err) => {
          toast({
            title: "Error",
            status: "error",
          });
          handleError(err);
        });
    },
    [editRule, ruleId, toast, router]
  );

  if (!rule) return null;
  return (
    <RuleForm
      mode="edit"
      rule={rule}
      onChange={(newRule) => {
        setRule(newRule);
      }}
      onSubmit={handleSubmit}
      loading={loadingEditRule}
    />
  );
};

EditRulePage.getLayout = (page) => <Layout>{page}</Layout>;

export default EditRulePage;
