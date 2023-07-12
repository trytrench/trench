import { Layout } from "~/components/layouts/Layout";
import { useToast } from "@chakra-ui/react";
import { useCallback, useState } from "react";
import { type CustomPage } from "../../types/Page";
import { api } from "../../lib/api";
import { handleError } from "../../lib/handleError";
import { useRouter } from "next/router";
import { RuleForm, type RuleFormType } from "../../components/RuleForm";
import { RiskLevel } from "../../common/types";

const RulesPage: CustomPage = () => {
  const router = useRouter();
  const toast = useToast();

  const [rule, setRule] = useState<RuleFormType>({
    name: "",
    description: "",
    tsCode: "",
    jsCode: "",
    riskLevel: RiskLevel.Medium,
  });

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

  return (
    <RuleForm
      mode="create"
      rule={rule}
      onChange={setRule}
      onSubmit={handleSubmit}
      loading={loadingCreateRule}
    />
  );
};

RulesPage.getLayout = (page) => <Layout>{page}</Layout>;

export default RulesPage;
