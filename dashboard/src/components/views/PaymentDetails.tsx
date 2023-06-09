import {
  Box,
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
import { PaymentsTable, usePaymentsTableProps } from "../PaymentsTable";
import { type Address, type IpAddress } from "@prisma/client";
import { handleError } from "~/lib/handleError";

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
        <Text w={200} color="subtle">
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
    .filter((item) => item.show !== false && !!item.value)
    .map((item) => ({
      label: item.label,
      value: item.value,
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
  const { isLoading, data } = api.dashboard.paymentAttempts.get.useQuery({
    id: paymentId,
  });

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
  } = usePaymentsTableProps({
    linkedPaymentAttemptId: paymentId,
  });

  if (!data) return null;

  const paymentDetails = getLabelValuePairs([
    {
      label: "Price",
      value: (data.amount / 100).toLocaleString("en-US", {
        style: "currency",
        currency: data.currency,
      }),
    },
    { label: "Description", value: data.description },

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

  const paymentMethod = data.paymentMethod;
  const paymentMethodData = getLabelValuePairs([
    { label: "ID", value: paymentMethod.id },
    { label: "Fingerprint", value: paymentMethod.card?.fingerprint },
    {
      label: "Card",
      value: (
        <CardWithIcon
          brand={paymentMethod.card?.brand}
          last4={paymentMethod.card?.last4}
          wallet={paymentMethod.cardWallet}
        />
      ),
    },
    {
      label: "Type",
      value: `${startCase(paymentMethod.card?.brand || "")} ${
        paymentMethod.card?.funding || ""
      }`,
    },
    { label: "Issuer", value: paymentMethod.card?.issuer },
    { label: "Country", value: paymentMethod.card?.country },
    { label: "Owner", value: paymentMethod.name },
    { label: "Email", value: paymentMethod.email },
    {
      label:
        paymentMethod.address?.line1 ||
        paymentMethod.address?.line2 ||
        paymentMethod.address?.city ||
        paymentMethod.address?.state ||
        paymentMethod.address?.country
          ? "Address"
          : "Postal code",
      value: getAddressString(paymentMethod.address),
    },
    {
      label: "CVC Check",
      value: paymentMethod.cvcCheck === "pass" && (
        <HStack spacing={1}>
          <Icon color="green" as={IoCheckmarkCircle} />
          <Text>Passed</Text>
        </HStack>
      ),
    },
    {
      label: "ZIP Check",
      show: !!paymentMethod.address?.postalCode,
      value: (
        <HStack spacing={1}>
          {paymentMethod.postalCodeCheck === "pass" ? (
            <>
              <Icon color="green" as={IoCheckmarkCircle} />
              <Text>Passed</Text>
            </>
          ) : (
            <Text>{startCase(paymentMethod.postalCodeCheck ?? "")}</Text>
          )}
        </HStack>
      ),
    },
    {
      label: "Address Check",
      show: !!paymentMethod.address?.line1,
      value: paymentMethod.addressLine1Check && (
        <HStack spacing={1}>
          {paymentMethod.addressLine1Check === "pass" ? (
            <>
              <Icon color="green" as={IoCheckmarkCircle} />
              <Text>Passed</Text>
            </>
          ) : (
            <Text>{startCase(paymentMethod.addressLine1Check)}</Text>
          )}
        </HStack>
      ),
    },
  ]);

  const deviceSnapshot = data.checkoutSession.deviceSnapshot;
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
      value: deviceSnapshot?.ipAddress.ipAddress,
    },
    {
      label: "Static IP Score",
      value: "WIP",
      // value: deviceSnapshot?.ipAddress,
    },
    {
      label: "ISP",
      // value: data.session.ipAddress.isp,
      value: "WIP",
    },
    {
      label: "Anonymous",
      value: "WIP",
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
      value: data.checkoutSession.deviceSnapshot?.fingerprint,
    },
  ]);

  const locationData: { label: string; value: ReactNode }[] = [
    // { label: "City", value: deviceSnapshot?.ipAddress.address.cityName },
    // { label: "Subdivision", value: deviceSnapshot?.ipAddress.address.subdivisionName },
    // { label: "Country", value: deviceSnapshot?.ipAddress.address.countryName },
    // { label: "IP Timezone", value: deviceSnapshot?.ipAddress.address.timezone },
  ];

  const markers = [
    ...(data.checkoutSession.deviceSnapshot?.ipAddress.location
      ? [
          {
            longitude:
              data.checkoutSession.deviceSnapshot.ipAddress.location.longitude,
            latitude:
              data.checkoutSession.deviceSnapshot.ipAddress.location.latitude,
            type: "device" as const,
          },
        ]
      : []),
    ...(data.paymentMethod.address?.location
      ? [
          {
            longitude: data.paymentMethod.address.location.longitude,
            latitude: data.paymentMethod.address.location.latitude,
            type: "card" as const,
          },
        ]
      : []),
  ];

  console.log(markers);
  return (
    <Box>
      <Section title="Product">
        <List data={paymentDetails} />
      </Section>

      <Section title="Location">
        <Grid templateColumns="repeat(2, 1fr)" gap={8}>
          <GridItem>
            <List data={locationData} />
          </GridItem>
          <GridItem h={250}>
            <PaymentMap markers={markers} />
          </GridItem>
        </Grid>
      </Section>

      <Section title="Payment method">
        <Grid templateColumns="repeat(2, 1fr)" gap={8}>
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
        <Grid templateColumns="repeat(2, 1fr)" gap={8}>
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
