import { initNodeBuilder } from "@trytrench/flow";
import { prisma } from "../db";
import {
  type CheckoutSession,
  type Device,
  type DeviceSnapshot,
  type IpAddress,
  type PaymentMethod,
  type List,
  type PaymentAttempt,
  type Address,
  type Card,
  type Customer,
} from "@prisma/client";

export type StreamInput = {
  paymentAttempt: PaymentAttempt & {
    checkoutSession: CheckoutSession & {
      deviceSnapshot:
        | (DeviceSnapshot & {
            device: Device;
            ipAddress: IpAddress | null;
          })
        | null;
      customer: Customer | null;
    };
    paymentMethod: PaymentMethod & {
      address: Address | null;
      card: Card | null;
    };
  };
  blockLists: Record<string, string[]>;
};

export const node = initNodeBuilder
  .context(() => {
    return {
      prisma,
    };
  })
  .input<StreamInput>()
  .create();
