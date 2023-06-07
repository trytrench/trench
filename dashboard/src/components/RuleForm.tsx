import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Button,
  FormControl,
  FormLabel,
  HStack,
  Heading,
  Input,
  Select,
  Text,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { useCallback, useMemo, useState } from "react";
import { z } from "zod";
import { CustomTypeScriptEditor } from "./editor/CustomTypescriptEditor";
import { PREFIX, SUFFIX, TYPES_SOURCE } from "./editor/constants";
import { RiskLevel } from "@prisma/client";
import { createProject, ts } from "@ts-morph/bootstrap";
import { api } from "~/lib/api";
import { handleError } from "~/lib/handleError";
import { TransactionsTable } from "./TransactionsTable";
import { type PaginationState } from "@tanstack/react-table";

const ruleSchema = z.object({
  name: z.string().nonempty(),
  description: z.string().nullable(),
  jsCode: z.string().nonempty(),
  tsCode: z.string().nonempty(),
  riskLevel: z.nativeEnum(RiskLevel),
});

export type RuleFormType = z.infer<typeof ruleSchema>;

interface RenderDiagnosticsProps {
  diagnostics: ts.Diagnostic[];
}

function RenderDiagnostics(props: RenderDiagnosticsProps) {
  const { diagnostics } = props;
  return (
    <VStack>
      {diagnostics.map((diagnostic, idx) => {
        if (diagnostic.start && diagnostic.file) {
          const lineAndChar = diagnostic.file?.getLineAndCharacterOfPosition(
            diagnostic.start
          );
          const { line, character } = lineAndChar;
          return (
            <Alert status="error" key={idx}>
              <AlertIcon />
              <AlertTitle>Line {line + 1}:</AlertTitle>
              <AlertDescription>
                {diagnostic.messageText.toString()}
              </AlertDescription>
            </Alert>
          );
        }

        return (
          <Alert status="error" key={idx}>
            <AlertIcon />
            <AlertTitle>Error:</AlertTitle>
            <AlertDescription>
              {diagnostic.messageText.toString()}
            </AlertDescription>
          </Alert>
        );
      })}
    </VStack>
  );
}

interface WriteRuleProps {
  value: string;
  onChange: (newVal: string) => void;
  onCompile: (jsCode: string) => void;
}

function WriteRule(props: WriteRuleProps) {
  const { value, onChange, onCompile } = props;

  const { data: listsData } = api.dashboard.lists.getAll.useQuery({});

  const dynamicTsLib = useMemo(() => {
    if (!listsData) return null;
    const listAliases = listsData.map((list) => list.alias);
    return `
    type Lists = {
      ${listAliases.map((alias) => `"${alias}": string[]`).join("\n")}
    }
    `.trim();
  }, [listsData]);

  const [submitted, setSubmitted] = useState(false);

  const [diagnostics, setDiagnostics] = useState<ts.Diagnostic[]>([]);

  const handleCompile = useCallback(async () => {
    const code = [PREFIX, value, SUFFIX, TYPES_SOURCE, dynamicTsLib].join("\n");

    const compilerOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ESNext,
      lib: ["lib.esnext.d.ts"],
    };

    const project = await createProject({
      useInMemoryFileSystem: true,
      compilerOptions,
    });

    project.createSourceFile("MyClass.ts", code);

    const program = project.createProgram();
    const allDiagnostics = ts.getPreEmitDiagnostics(program); // check these

    setDiagnostics(allDiagnostics);

    setSubmitted(true);
    if (!allDiagnostics.length) {
      const transpiledOutput = ts.transpileModule(code, {
        compilerOptions,
      });

      onCompile(transpiledOutput.outputText);
    } else {
      onCompile("");
    }
  }, [dynamicTsLib, onCompile, value]);

  return (
    <Box>
      {dynamicTsLib && (
        <CustomTypeScriptEditor
          dynamicTsLib={dynamicTsLib}
          readOnlyBoilerplate={{
            prefix: PREFIX,
            suffix: SUFFIX,
          }}
          value={value}
          onChange={(newVal) => {
            onChange(newVal ?? "");
            setSubmitted(false);
          }}
        />
      )}
      <Box h={4} />
      <Button onClick={handleCompile}>Compile</Button>
      <Box h={4} />

      <RenderDiagnostics diagnostics={diagnostics} />
      {submitted && diagnostics.length === 0 && (
        <Alert status="success">
          <AlertIcon />
          <AlertTitle>Success:</AlertTitle>
          <AlertDescription>Compiled successfully!</AlertDescription>
        </Alert>
      )}
    </Box>
  );
}
interface RuleFormProps {
  rule: RuleFormType;
  onChange: (rule: RuleFormType) => void;
  onSubmit: (rule: RuleFormType) => void;
  loading: boolean;
  mode: "create" | "edit";
}

export function RuleForm({
  rule,
  onChange,
  onSubmit,
  loading,
  mode,
}: RuleFormProps) {
  const { name, description, tsCode, jsCode, riskLevel } = rule;

  const toast = useToast();

  const validateResult = useMemo(() => ruleSchema.safeParse(rule), [rule]);
  const { success } = validateResult;
  const [newlyCompiledJsCode, setNewlyCompiledJsCode] = useState<string>("");
  const [showNewlyCompiledJsCode, setShowNewlyCompiledJsCode] = useState(true);
  const [lastNDays, setLastNDays] = useState<"3" | "7" | "30">("3");

  const {
    mutateAsync: backtest,
    data: backtestData,
    isLoading: loadingBacktests,
  } = api.dashboard.rules.backtest.useMutation();

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const paginatedBacktestData = useMemo(() => {
    if (!backtestData) return null;
    const { pageIndex, pageSize } = pagination;
    return backtestData.slice(
      pageIndex * pageSize,
      pageIndex * pageSize + pageSize
    );
  }, [backtestData, pagination]);

  return (
    <Box p={8}>
      <Heading variant="h1">
        {mode === "create" ? "Create New Rule" : "Edit Rule"}
      </Heading>
      <Box h={16} />
      <VStack gap={8}>
        <FormControl>
          <FormLabel>Name</FormLabel>
          <Input
            value={name}
            onChange={(e) => {
              onChange({ ...rule, name: e.target.value });
            }}
          />
        </FormControl>
        <FormControl>
          <FormLabel>Description</FormLabel>
          <Input
            value={description ?? ""}
            onChange={(e) => {
              onChange({ ...rule, description: e.target.value });
            }}
          />
        </FormControl>
        <FormControl>
          <FormLabel>Risk Level</FormLabel>
          <Select
            value={riskLevel}
            onChange={(e) => {
              const val = e.target.value as RuleFormType["riskLevel"];
              onChange({ ...rule, riskLevel: val });
            }}
          >
            <option value={RiskLevel.Medium}>Medium</option>
            <option value={RiskLevel.High}>High</option>
            <option value={RiskLevel.VeryHigh}>Very High</option>
          </Select>
        </FormControl>

        <Box width="100%">
          <Text fontWeight="medium">Rule</Text>
          <Box h={2} />
          <WriteRule
            value={tsCode}
            onChange={(newCode) => {
              onChange({ ...rule, tsCode: newCode, jsCode: "" });
            }}
            onCompile={(compiledCode) => {
              onChange({ ...rule, jsCode: compiledCode });
              setNewlyCompiledJsCode(compiledCode);
            }}
          />
        </Box>

        {newlyCompiledJsCode && (
          <Box width="full">
            <Text fontWeight="medium" mt={4}>
              Compiled JS Code
            </Text>
            <Box mt={2}>
              <Text>{newlyCompiledJsCode}</Text>
            </Box>
          </Box>
        )}

        {newlyCompiledJsCode && (
          <Box width="100%">
            <Text fontWeight="medium">Test rule</Text>

            <Text mt={4} color="gray.500" fontWeight="medium"></Text>
            <HStack>
              <Button
                onClick={() => {
                  backtest({
                    lastNDays: lastNDays,
                    jsCode: newlyCompiledJsCode,
                  }).catch((err) => {
                    toast({
                      title: "Error running backtest",
                      // description: err.message,
                      status: "error",
                    });
                    handleError(err);
                  });
                }}
                isLoading={loadingBacktests}
              >
                Test rule
              </Button>
              <Text whiteSpace="nowrap">on transactions from the last</Text>
              <Select
                width="auto"
                value={lastNDays}
                onChange={(e) => {
                  setLastNDays(e.target.value);
                }}
              >
                <option value={"3"}>3 days</option>
                <option value={"7"}>7 days</option>
                <option value={"30"}>30 days</option>
              </Select>
            </HStack>

            {paginatedBacktestData && (
              <TransactionsTable
                transactionsData={paginatedBacktestData}
                count={backtestData?.length ?? 0}
                pagination={pagination}
                onPaginationChange={setPagination}
              />
            )}
          </Box>
        )}
      </VStack>

      <Box h={16} />
      <Button
        isLoading={loading}
        onClick={() => onSubmit(rule)}
        isDisabled={!success}
        variant="solid"
        colorScheme="blue"
      >
        {mode == "create" ? "Create New Rule" : "Save"}
      </Button>
    </Box>
  );
}
