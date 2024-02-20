export enum QueueType {
  PureFunctionQueue = "PureFunctionQueue",
  StatefulFunctionQueue = "StatefulFunctionQueue",
}

export type QueueOptions = {
  uniqueId: string;
  queueType: QueueType;
};

export function getQueueId(options: QueueOptions) {
  return `${options.queueType}_${options.uniqueId}`;
}

export const QUEUE_TYPE_OPTIONS: Record<QueueType, { concurrency: number }> = {
  [QueueType.PureFunctionQueue]: { concurrency: 5 },
  [QueueType.StatefulFunctionQueue]: { concurrency: 1 },
};
