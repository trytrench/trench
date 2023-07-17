import {
  Box,
  Divider,
  Grid,
  GridItem,
  HStack,
  Icon,
  Text,
} from "@chakra-ui/react";
import { type Address } from "@prisma/client";
import { startCase } from "lodash";
import { type ReactNode } from "react";
import { IoCheckmarkCircle } from "react-icons/io5";
import { api } from "~/lib/api";
import { handleError } from "~/lib/handleError";
import { getLabelValuePairs } from "~/utils/getLabelValuePairs";
import { DeviceSection } from "../DeviceSection";
import {
  PaymentsTable,
  useEvaluableActionProps,
} from "../EvaluableActionsTable";
import { List } from "../List";
import { LocationSection } from "../LocationSection";
import { CardWithIcon } from "../card-with-icon/CardWithIcon";

export const Section = ({
  children,
  title,
}: {
  children: ReactNode;
  title: string | ReactNode;
}) => (
  <Box py={4}>
    <Text fontSize="lg" fontWeight="bold" mb={2}>
      {title}
    </Text>
    <Divider borderColor="gray.300" mb={4} />
    {children}
  </Box>
);

function getAddressString(address?: Address | null) {
  if (!address) return "No address";
  return (
    [
      address.line1,
      address.line2,
      address.city,
      address.state,
      address.country,
      address.postalCode,
    ]
      .filter(Boolean)
      .join(", ") || "No address"
  );
}

interface PaymentDetailsProps {
  paymentId: string;
}

export const PaymentDetails = ({ paymentId }: PaymentDetailsProps) => {
  const utils = api.useContext();
  const { isLoading, data: evaluableAction } =
    api.dashboard.evaluableActions.get.useQuery({
      id: paymentId,
    });

  const deviceSnapshot = evaluableAction?.session.deviceSnapshot;
  const paymentAttempt = evaluableAction?.paymentAttempt;
  const paymentMethod = paymentAttempt?.paymentMethod;
  const user = evaluableAction?.session.user;
  const session = evaluableAction?.session;

  // const getAnonymizers = (ipAddress: IpAddress) => {
  //   const anonymizers = [];

  //   if (ipAddress.isAnonymousVpn) anonymizers.push("VPN");
  //   if (ipAddress.isHostingProvider) anonymizers.push("Hosting provider");
  //   if (ipAddress.isPublicProxy) anonymizers.push("Public proxy");
  //   if (ipAddress.isResidentialProxy) anonymizers.push("Residential proxy");
  //   if (ipAddress.isTorExitNode) anonymizers.push("Tor exit node");

  //   return anonymizers;
  // };

  const {
    pagination,
    setPagination,
    selectedOptions,
    setSelectedOptions,
    data: relatedData,
    count,
    refetch,
    isFetching,
    queryProps,
  } = useEvaluableActionProps({
    paymentAttemptActionId: paymentId,
  });

  if (!evaluableAction) return null;

  const paymentDetails = getLabelValuePairs([
    {
      label: "Price",
      value: paymentAttempt
        ? (paymentAttempt.amount / 100).toLocaleString("en-US", {
            style: "currency",
            currency: paymentAttempt.currency,
          })
        : undefined,
    },
    { label: "Description", value: paymentAttempt?.description },

    // {
    //   label: "Seller",
    //   value: data.sellerName,
    // },
    // {
    //   label: "Wallet address",
    //   value: data.walletAddress,
    // },
    // {
    //   label: "Created",
    //   value: format(new Date(data.createdAt), "dd/MM/yyyy HH:mm:ss"),
    // },
    // {
    //   label: "Updated",
    //   value: format(new Date(data.updatedAt), "dd/MM/yyyy HH:mm:ss"),
    // },
  ]);

  const paymentMethodData = getLabelValuePairs([
    { label: "ID", value: paymentMethod?.id },
    { label: "Fingerprint", value: paymentMethod?.card?.fingerprint },
    {
      label: "Card",
      value: (
        <CardWithIcon
          brand={paymentMethod?.card?.brand}
          last4={paymentMethod?.card?.last4}
          wallet={paymentMethod?.cardWallet}
        />
      ),
    },
    {
      label: "Type",
      value: `${startCase(paymentMethod?.card?.brand || "")} ${
        paymentMethod?.card?.funding || ""
      }`,
    },
    { label: "Issuer", value: paymentMethod?.card?.issuer },
    { label: "Country", value: paymentMethod?.card?.country },
    { label: "Owner", value: paymentMethod?.name },
    { label: "Email", value: paymentMethod?.email },
    {
      label:
        paymentMethod?.address?.line1 ||
        paymentMethod?.address?.line2 ||
        paymentMethod?.address?.city ||
        paymentMethod?.address?.state ||
        paymentMethod?.address?.country
          ? "Address"
          : "Postal code",
      value: getAddressString(paymentMethod?.address),
    },
    {
      label: "CVC Check",
      value:
        paymentMethod?.cvcCheck === "pass" ? (
          <>
            <Icon color="green" as={IoCheckmarkCircle} />
            <Text>Passed</Text>
          </>
        ) : (
          <Text>{startCase(paymentMethod?.cvcCheck ?? "")}</Text>
        ),
    },
    {
      label: "ZIP Check",
      show: !!paymentMethod?.address?.postalCode,
      value: (
        <HStack spacing={1}>
          {paymentMethod?.postalCodeCheck === "pass" ? (
            <>
              <Icon color="green" as={IoCheckmarkCircle} />
              <Text>Passed</Text>
            </>
          ) : (
            <Text>{startCase(paymentMethod?.postalCodeCheck ?? "")}</Text>
          )}
        </HStack>
      ),
    },
    {
      label: "Address Check",
      show: !!paymentMethod?.address?.line1,
      value: paymentMethod?.addressLine1Check && (
        <HStack spacing={1}>
          {paymentMethod?.addressLine1Check === "pass" ? (
            <>
              <Icon color="green" as={IoCheckmarkCircle} />
              <Text>Passed</Text>
            </>
          ) : (
            <Text>{startCase(paymentMethod?.addressLine1Check)}</Text>
          )}
        </HStack>
      ),
    },
  ]);

  const markers = [
    ...(evaluableAction.session.deviceSnapshot?.ipAddress?.location
      ? [
          {
            longitude:
              evaluableAction.session.deviceSnapshot.ipAddress.location
                .longitude,
            latitude:
              evaluableAction.session.deviceSnapshot.ipAddress.location
                .latitude,
            type: "device" as const,
          },
        ]
      : []),
    ...(paymentMethod?.address?.location
      ? [
          {
            longitude: paymentMethod.address.location.longitude,
            latitude: paymentMethod.address.location.latitude,
            type: "card" as const,
          },
        ]
      : []),
  ];

  return (
    <Box>
      <Section title="Product">
        <List data={paymentDetails} />
      </Section>

      <LocationSection
        ipAddress={deviceSnapshot?.ipAddress}
        markers={markers}
      />

      <Section title="Payment method">
        <Grid
          templateColumns={{
            md: "repeat(2, 1fr)",
            base: "repeat(1, 1fr)",
          }}
          gap={{
            md: 8,
            base: 2,
          }}
        >
          <GridItem>
            <List
              data={paymentMethodData.slice(
                0,
                Math.ceil(paymentMethodData.length / 2)
              )}
            />
          </GridItem>

          <GridItem>
            <List
              data={paymentMethodData.slice(
                Math.ceil(paymentMethodData.length / 2)
              )}
            />
          </GridItem>
        </Grid>
      </Section>

      <DeviceSection deviceSnapshot={deviceSnapshot} />

      <Section title="Related payments">
        <PaymentsTable
          linkedPaymentAttemptActionId={evaluableAction.id}
          paymentsData={relatedData || []}
          count={count}
          pagination={pagination}
          onPaginationChange={setPagination}
          selectedOptions={selectedOptions}
          onSelectedOptionsChange={setSelectedOptions}
          allowMarkAsFraud
          onMarkSelectedAsFraud={(paymentIds, markedAs) => {
            utils.dashboard.evaluableActions.getAll.setData(
              queryProps,
              (prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  rows: prev.rows.map((action) => {
                    if (paymentIds.includes(action.id)) {
                      return { ...action, isFraud: markedAs };
                    } else {
                      return action;
                    }
                  }),
                };
              }
            );
          }}
          isLoading={isFetching}
        />
      </Section>
    </Box>
  );
};
