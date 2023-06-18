import {
  Box,
  Center,
  Divider,
  Grid,
  GridItem,
  HStack,
  Icon,
  Stack,
  Text,
} from "@chakra-ui/react";
import { api } from "~/lib/api";
import { PaymentMap } from "../payment-map/PaymentMap";
import { startCase } from "lodash";
import { CardWithIcon } from "../card-with-icon/CardWithIcon";
import { IoCheckmarkCircle } from "react-icons/io5";
import { type ReactNode, useMemo, useState } from "react";
import {
  PaymentsTable,
  useEvaluableActionProps,
} from "../EvaluableActionsTable";
import { type Address, type IpAddress } from "@prisma/client";
import { handleError } from "~/lib/handleError";
import { env } from "../../env.mjs";

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

const List = ({
  data,
}: {
  data: { label: string; value: React.ReactNode }[];
}) => (
  <Stack>
    {data.map((item) => (
      <HStack key={item.label} fontSize="sm">
        <Text w={180} color="subtle" flexShrink={0}>
          {item.label}
        </Text>
        <Text>{item.value}</Text>
      </HStack>
    ))}
  </Stack>
);

function getLabelValuePairs(
  data: { label: string; value?: string | null | ReactNode; show?: boolean }[]
) {
  return data
    .filter((item) => item.show !== false && typeof item.value !== "undefined")
    .map((item) => ({
      label: item.label,
      value: item.value ?? "--",
    }));
}

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

  const deviceData = getLabelValuePairs([
    {
      label: "Browser",
      show: !!deviceSnapshot,
      value: `${deviceSnapshot?.browserName ?? ""} ${
        deviceSnapshot?.browserVersion ?? ""
      }`,
    },
    {
      label: "OS",
      show: !!deviceSnapshot,
      value: `${deviceSnapshot?.osName ?? ""} ${
        deviceSnapshot?.osVersion ?? ""
      }`,
    },

    {
      label: "Device",
      show: !!(deviceSnapshot?.deviceVendor || deviceSnapshot?.deviceModel),
      value: [deviceSnapshot?.deviceVendor, deviceSnapshot?.deviceModel]
        .filter(Boolean)
        .join(" "),
    },

    {
      label: "Resolution",
      show: !!deviceSnapshot?.screenResolution,
      value: deviceSnapshot?.screenResolution,
    },
    {
      label: "Engine",
      value: [deviceSnapshot?.engineName, deviceSnapshot?.engineVersion]
        .filter(Boolean)
        .join(" "),
    },

    {
      label: "CPU",
      show: !!(deviceSnapshot?.cpuArchitecture || deviceSnapshot?.deviceModel),
      value: [deviceSnapshot?.cpuArchitecture, deviceSnapshot?.deviceModel]
        .filter(Boolean)
        .join(" "),
    },

    // {
    //   label: "Bot",
    //   value: deviceSnapshot.bot ? "True" : "False",
    // },

    {
      label: "Timezone",
      value: deviceSnapshot?.timezone,
    },
    // {
    //   label: "OS",
    //   value: data.session.device.components.os.value,
    // },
    {
      label: "IP Address",
      value: deviceSnapshot?.ipAddress?.ipAddress,
    },
    {
      label: "Static IP Score",
      value: deviceSnapshot?.ipAddress?.metadata?.staticIPScore,
    },
    {
      label: "ISP",
      // value: data.session.ipAddress.isp,
      value: deviceSnapshot?.ipAddress?.metadata?.isp,
    },
    {
      label: "Anonymous",
      value: deviceSnapshot?.ipAddress?.metadata?.isAnonymous
        ? "True"
        : "False",
      // value: data.session.ipAddress.isAnonymous ? "True" : "False",
    },
    // ...(data.session.ipAddress.isAnonymous
    //   ? [
    //       {
    //         label: "Anonymizer",
    //         value: getAnonymizers(data.session.ipAddress).join(", "),
    //       },
    //     ]
    //   : []),
    // {
    //   label: "User type",
    //   value: startCase(data.session.ipAddress.userType),
    // },
    // {
    //   label: "User count",
    //   value: data.session.ipAddress.userCount,
    // },
    {
      label: "Fingerprint",
      value: evaluableAction.session.deviceSnapshot?.fingerprint,
    },
  ]);

  const locationData = getLabelValuePairs([
    { label: "City", value: deviceSnapshot?.ipAddress?.location?.cityName },
    {
      label: "Subdivision",
      value: deviceSnapshot?.ipAddress?.location?.regionName,
    },
    {
      label: "Country",
      value: deviceSnapshot?.ipAddress?.location?.countryName,
    },
    // { label: "IP Timezone", value: deviceSnapshot?.ipAddress?.location.ip },
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

      <Section title="Location">
        <Grid
          templateColumns={{
            md: "repeat(2, 1fr)",
            base: "repeat(1, 1fr)",
          }}
          gap={8}
        >
          <GridItem>
            <List data={locationData} />
          </GridItem>
          <GridItem h={250}>
            {!!env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ? (
              <PaymentMap markers={markers} />
            ) : (
              <Center height="full" width="full" bg="gray.100" p={4}>
                <Text>
                  Set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to view this map
                </Text>
              </Center>
            )}
          </GridItem>
        </Grid>
      </Section>

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

      <Section title="Device">
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
              data={deviceData.slice(0, Math.ceil(deviceData.length / 2))}
            />
          </GridItem>
          <GridItem>
            <List data={deviceData.slice(Math.ceil(deviceData.length / 2))} />
          </GridItem>
        </Grid>
      </Section>

      <Section title="Related payments">
        <PaymentsTable
          paymentsData={relatedData || []}
          count={count}
          pagination={pagination}
          onPaginationChange={setPagination}
          selectedOptions={selectedOptions}
          onSelectedOptionsChange={setSelectedOptions}
          allowMarkAsFraud
          onMarkSelectedAsFraud={() => {
            refetch().catch(handleError);
          }}
          isLoading={isFetching}
        />
      </Section>
    </Box>
  );
};
