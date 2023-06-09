import { type Prisma } from "@prisma/client";
import { prisma } from "~/server/db";
import { getAggregations } from "~/server/utils/aggregations";
import { runRules } from "~/server/utils/rules";

const main = async () => {
  const transactions = await prisma.paymentAttempt.findMany({
    include: {
      checkoutSession: {
        include: {
          paymentAttempts: true,
          customer: true,
          deviceSnapshot: {
            include: {
              device: true,
              ipAddress: true,
            },
          },
        },
      },
      paymentMethod: {
        include: {
          card: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  function chunk<T>(arr: T[], size: number): T[][] {
    return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
      arr.slice(i * size, i * size + size)
    );
  }
  const batchSize = 50;
  const batches = chunk(transactions, batchSize);

  const [rules, lists] = await prisma.$transaction([
    prisma.rule.findMany(),
    prisma.list.findMany({
      include: {
        items: true,
      },
    }),
  ]);
  const listsObj = lists.reduce((acc, list) => {
    acc[list.alias] = list.items.map((item) => item.value);
    return acc;
  }, {} as Record<string, string[]>);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    if (!batch) break;

    const promises = batch.map(async (transaction) => {
      // Generate aggregations

      // console.time("getAggregations");
      const aggregations = await getAggregations(
        new Date(transaction.createdAt),
        transaction.customerId,
        transaction.session.ipAddressId,
        transaction.session.deviceId,
        transaction.paymentMethod.cardId
      );
      // console.timeEnd("getAggregations");

      // Save aggregations
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          transforms: aggregations,
        },
      });

      const { ruleExecutionResults, highestRiskLevel } = runRules({
        rules,
        payload: {
          transaction: transaction,
          aggregations: aggregations,
          lists: listsObj,
        },
      });

      // console.time("runRules");
      await prisma.$transaction([
        prisma.ruleExecution.deleteMany({
          where: {
            transactionId: transaction.id,
          },
        }),
        prisma.ruleExecution.createMany({
          data: rules
            .map((rule, index) => {
              const result = ruleExecutionResults[index];
              if (!result) return null;
              return {
                result: result?.result,
                error: result?.error,
                riskLevel: result.riskLevel,
                transactionId: transaction.id,
                ruleId: rule.id,
              };
            })
            .filter(
              (rule) => rule !== null
            ) as Prisma.RuleExecutionCreateManyInput[],
        }),
        prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            riskLevel: highestRiskLevel,
          },
        }),
      ]);
      // console.timeEnd("runRules");
    });

    await Promise.all(promises);
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
