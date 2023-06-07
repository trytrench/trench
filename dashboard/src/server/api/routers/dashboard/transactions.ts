import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import {
  type Session,
  type Customer,
  type Device,
  type Transaction,
  type CustomerDevice,
  type PaymentMethod,
  type Card,
  RiskLevel,
} from "@prisma/client";
import { type Prisma } from "@prisma/client";

type SessionNode = {
  type: "session";
  data: Session;
};

type TransactionNode = {
  type: "transaction";
  data: Transaction;
};

type CustomerNode = {
  type: "customer";
  data: Customer;
};

type DeviceNode = {
  type: "device";
  data: Device;
};

type CardNode = {
  type: "card";
  data: Card;
};

export type Node = {
  id: string;
} & (SessionNode | TransactionNode | CustomerNode | DeviceNode | CardNode);

type Edge = {
  source: string;
  target: string;
};

type Graph = {
  nodes: Record<string, Node>;
  edges: Edge[];
};

function getSearchOption(search?: string) {
  return search
    ? {
        contains: `%${search}%`,
        mode: "insensitive" as const,
      }
    : undefined;
}

export const transactionsRouter = createTRPCRouter({
  updateMany: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.string()),
        changes: z.object({
          isFraud: z.boolean().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { ids, changes } = input;
      return ctx.prisma.transaction.updateMany({
        where: { id: { in: ids } },
        data: changes,
      });
    }),

  get: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.transaction.findUnique({
        where: {
          id: input.id,
        },
        include: {
          ruleExecutions: {
            where: {
              result: true,
            },
            include: {
              rule: true,
            },
          },
          paymentMethod: {
            include: {
              card: true,
            },
          },
          customer: true,
          outcome: true,
          session: {
            include: {
              device: true,
              transactions: true,
              ipAddress: true,
            },
          },
        },
      });
    }),
  getAll: protectedProcedure
    .input(
      z.object({
        offset: z.number().optional(),
        limit: z.number().optional(),
        executedRuleId: z.string().optional(),
        linkedTransactionId: z.string().optional(),
        customerId: z.string().optional(),
        search: z
          .object({
            sellerName: z.string().optional(),
            sellerId: z.string().optional(),
            email: z.string().optional(),
            description: z.string().optional(),
            status: z.string().optional(),
            riskLevel: z.nativeEnum(RiskLevel).optional(),
            isFraud: z.string().optional(),
          })
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      let linkedTransaction;
      if (input.linkedTransactionId) {
        linkedTransaction = await ctx.prisma.transaction.findUnique({
          where: {
            id: input.linkedTransactionId,
          },
          include: {
            paymentMethod: {
              include: {
                card: true,
              },
            },
            customer: true,
            session: {
              include: {
                device: true,
                ipAddress: true,
              },
            },
          },
        });
        if (!linkedTransaction) throw new Error("Transaction not found");
      }

      const filter: Prisma.TransactionFindManyArgs["where"] = {
        sellerName: getSearchOption(input.search?.sellerName),
        sellerId: getSearchOption(input.search?.sellerId),
        description: getSearchOption(input.search?.description),
        isFraud:
          input.search?.isFraud === "true"
            ? true
            : input.search?.isFraud === "false"
            ? false
            : undefined,
        riskLevel: input.search?.riskLevel,
        outcome:
          input.search?.status === "null"
            ? { is: null }
            : { status: getSearchOption(input.search?.status) },

        customer: {
          email: getSearchOption(input.search?.email),
        },
        customerId: input.customerId,
        ruleExecutions: input.executedRuleId
          ? {
              some: {
                ruleId: input.executedRuleId,
                result: true,
              },
            }
          : undefined,
        ...(linkedTransaction && {
          id: { not: linkedTransaction.id },
          OR: [
            { session: { deviceId: linkedTransaction.session.deviceId } },
            {
              session: {
                device: {
                  fingerprint: linkedTransaction.session.device.fingerprint,
                },
              },
            },
            {
              session: {
                ipAddress: { id: linkedTransaction.session.ipAddress.id },
              },
            },
            { customer: { email: linkedTransaction.customer.email } },
            {
              paymentMethod: {
                card: { id: linkedTransaction.paymentMethod.card?.id },
              },
            },
            { walletAddress: linkedTransaction.walletAddress },
          ],
        }),
      };

      const [count, data] = await ctx.prisma.$transaction([
        ctx.prisma.transaction.count({
          where: filter,
        }),
        ctx.prisma.transaction.findMany({
          skip: input.offset,
          take: input.limit,
          where: filter,
          orderBy: {
            createdAt: "desc",
          },
          include: {
            customer: true,
            paymentMethod: {
              include: {
                card: true,
              },
            },
            outcome: true,
          },
        }),
      ]);
      return { count, data };
    }),
  getGraph: protectedProcedure
    .input(
      z.object({
        transactionId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { transactionId } = input;

      const transaction = await ctx.prisma.transaction.findUnique({
        where: {
          id: transactionId,
        },
        include: {
          paymentMethod: {
            include: {
              card: true,
            },
          },
          customer: {
            include: {
              devices: {
                include: {
                  device: true,
                },
              },
            },
          },
          session: {
            include: {
              transactions: {
                include: {
                  paymentMethod: {
                    include: {
                      card: true,
                    },
                  },
                  customer: {
                    include: {
                      devices: {
                        include: {
                          device: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
      if (!transaction) {
        throw new Error("Transaction not found");
      }

      // Add the transaction, customers, sessions, and devices to the graph
      const graph: Graph = {
        nodes: {},
        edges: [],
      };

      function addNodeToGraph(node: Node, parentNodeId: string) {
        if (node.id in graph.nodes) {
          const found = graph.edges.find(
            (e) => e.source === parentNodeId && e.target === node.id
          );
          if (found) {
            return;
          } else {
            graph.edges.push({
              source: parentNodeId,
              target: node.id,
            });
          }
        } else {
          graph.nodes[node.id] = node;
          graph.edges.push({
            source: parentNodeId,
            target: node.id,
          });
        }
      }

      function addTxChildrenToGraph(
        t: Transaction & {
          paymentMethod: PaymentMethod & {
            card: Card | null;
          };
          customer: Customer & {
            devices: (CustomerDevice & {
              device: Device;
            })[];
          };
        }
      ) {
        // Add card
        if (t.paymentMethod.card) {
          addNodeToGraph(
            {
              id: t.paymentMethod.card.id,
              type: "card",
              data: t.paymentMethod.card,
            },
            t.id
          );
        }

        // Add customer
        addNodeToGraph(
          { id: t.customer.id, type: "customer", data: t.customer },
          t.id
        );

        // Add customer devices
        t.customer.devices.forEach((d) => {
          const device = d.device;

          addNodeToGraph(
            {
              id: device.id,
              type: "device",
              data: device,
            },
            t.customerId
          );
        });
      }

      graph.nodes[transaction.id] = {
        id: transaction.id,
        type: "transaction",
        data: transaction,
      };
      addTxChildrenToGraph(transaction);

      if (transaction.session) {
        const session = transaction.session;

        addNodeToGraph(
          { id: session.id, type: "session", data: session },
          transaction.id
        );

        if (session.transactions) {
          session.transactions.forEach((t) => {
            if (t.id in graph.nodes) {
              return;
            }
            addNodeToGraph(
              { id: t.id, type: "transaction", data: t },
              session.id
            );
            addTxChildrenToGraph(t);
          });
        }
      }

      return graph;
    }),
});
