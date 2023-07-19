import { initNodeBuilder } from "@trytrench/flow";
import { prisma } from "../db";
import type {
  Session,
  Device,
  DeviceSnapshot,
  IpAddress,
  PaymentMethod,
  List,
  PaymentAttempt,
  Address,
  Card,
  User,
  Location,
  EvaluableAction,
  KycAttempt,
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
            address:
              | (Address & {
                  location: Location | null;
                })
              | null;
            card: Card | null;
          };
        })
      | null;
    kycAttempt:
      | (KycAttempt & {
          address: (Address & { location: Location | null }) | null;
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
