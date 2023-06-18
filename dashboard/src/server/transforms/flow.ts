import { initNodeBuilder } from "@trytrench/flow";
import { prisma } from "../db";
import {
  type Session,
  type Device,
  type DeviceSnapshot,
  type IpAddress,
  type PaymentMethod,
  type List,
  type PaymentAttempt,
  type Address,
  type Card,
  type User,
  type Location,
  type EvaluableAction,
} from "@prisma/client";

export type StreamInput = {
  evaluableAction: EvaluableAction & {
    session: Session & {
      deviceSnapshot:
        | (DeviceSnapshot & {
            device: Device;
            ipAddress:
              | (IpAddress & {
                  location: Location | null;
                })
              | null;
          })
        | null;
      user: User | null;
    };
    paymentAttempt:
      | (PaymentAttempt & {
          paymentMethod: PaymentMethod & {
            address: Address | null;
            card: Card | null;
          };
        })
      | null;
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
