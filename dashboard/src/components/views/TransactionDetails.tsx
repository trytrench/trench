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
import { TransactionMap } from "../TransactionMap/TransactionMap";
import { startCase } from "lodash";
import { CardWithIcon } from "../CardWithIcon/CardWithIcon";
import { IoCheckmarkCircle } from "react-icons/io5";
import { type ReactNode, useMemo, useState } from "react";
import { PaymentsTable, usePaymentsTableProps } from "../TransactionsTable";
import { type IpAddress } from "@prisma/client";
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

interface Props {
  transactionId: string;
}

export const TransactionDetails = ({ transactionId }: Props) => {
  const { isLoading, data } = api.dashboard.transactions.get.useQuery({
    id: transactionId,
  });

  const getAnonymizers = (ipAddress: IpAddress) => {
    const anonymizers = [];

    if (ipAddress.isAnonymousVpn) anonymizers.push("VPN");
    if (ipAddress.isHostingProvider) anonymizers.push("Hosting provider");
    if (ipAddress.isPublicProxy) anonymizers.push("Public proxy");
    if (ipAddress.isResidentialProxy) anonymizers.push("Residential proxy");
    if (ipAddress.isTorExitNode) anonymizers.push("Tor exit node");

    return anonymizers;
  };

  const {
    pagination,
    setPagination,
    selectedOptions,
    setSelectedOptions,
    transactionsData: relatedData,
    count,
    refetchTransactions,
  } = usePaymentsTableProps({
    linkedTransactionId: transactionId,
  });

  if (!data) return null;

  const paymentDetails = [
    {
      label: "Price",
      value: (data.amount / 100).toLocaleString("en-US", {
        style: "currency",
        currency: data.currency,
      }),
    },
    {
      label: "Description",
      value: data.description,
    },
    {
      label: "Seller",
      value: data.sellerName,
    },
    {
      label: "Wallet address",
      value: data.walletAddress,
    },
    // {
    //   label: "Created",
    //   value: format(new Date(data.createdAt), "dd/MM/yyyy HH:mm:ss"),
    // },
    // {
    //   label: "Updated",
    //   value: format(new Date(data.updatedAt), "dd/MM/yyyy HH:mm:ss"),
    // },
  ];

  const paymentMethodData = [
    {
      label: "ID",
      value: data.paymentMethod.id,
    },
    {
      label: "Fingerprint",
      value: data.paymentMethod.card?.fingerprint,
    },
    {
      label: "Card",
      value: (
        <CardWithIcon
          brand={data.paymentMethod.card?.brand}
          last4={data.paymentMethod.card?.last4}
          wallet={data.paymentMethod.card?.wallet}
        />
      ),
    },
    {
      label: "Type",
      value:
        startCase(data.paymentMethod.card?.brand || "") +
        " " +
        (data.paymentMethod.card?.funding || ""),
    },
    {
      label: "Issuer",
      value: data.paymentMethod.card?.issuer,
    },
    {
      label: "Country",
      value: data.paymentMethod.card?.country,
    },
    {
      label: "Owner",
      value: data.paymentMethod.name,
    },
    {
      label: "Email",
      value: data.paymentMethod.email,
    },
    {
      label:
        data.paymentMethod.line1 ||
        data.paymentMethod.line2 ||
        data.paymentMethod.city ||
        data.paymentMethod.state ||
        data.paymentMethod.country
          ? "Address"
          : "Postal code",
      value:
        [
          data.paymentMethod.line1,
          data.paymentMethod.line2,
          data.paymentMethod.city,
          data.paymentMethod.state,
          data.paymentMethod.country,
          data.paymentMethod.postalCode,
        ]
          .filter(Boolean)
          .join(", ") || "No address",
    },
    {
      label: "CVC Check",
      value: data.paymentMethod.cvcCheck === "pass" && (
        <HStack spacing={1}>
          <Icon color="green" as={IoCheckmarkCircle} />
          <Text>Passed</Text>
        </HStack>
      ),
    },
    ...(data.paymentMethod.postalCode
      ? [
          {
            label: "ZIP Check",
            value: data.paymentMethod.postalCodeCheck && (
              <HStack spacing={1}>
                {data.paymentMethod.postalCodeCheck === "pass" ? (
                  <>
                    <Icon color="green" as={IoCheckmarkCircle} />
                    <Text>Passed</Text>
                  </>
                ) : (
                  <Text>{startCase(data.paymentMethod.postalCodeCheck)}</Text>
                )}
              </HStack>
            ),
          },
        ]
      : []),
    ...(data.paymentMethod.line1
      ? [
          {
            label: "Address Check",
            value: data.paymentMethod.addressLine1Check && (
              <HStack spacing={1}>
                {data.paymentMethod.addressLine1Check === "pass" ? (
                  <>
                    <Icon color="green" as={IoCheckmarkCircle} />
                    <Text>Passed</Text>
                  </>
                ) : (
                  <Text>{startCase(data.paymentMethod.addressLine1Check)}</Text>
                )}
              </HStack>
            ),
          },
        ]
      : []),
    ,
  ];

  const deviceData = [
    // {
    //   label: "Platform",
    //   value: data.session.device.components.platform.value,
    // },
    ...(fp2Data
      ? [
          {
            label: "Browser",
            value: userAgent.browser.name + " " + userAgent.browser.version,
          },
          {
            label: "OS",
            value:
              userAgent.os.name +
              " " +
              userAgent.os.version +
              " " +
              (fp2Data.hasLiedOs ? "(Lied)" : ""),
          },
          ...(userAgent.device.vendor ||
          userAgent.device.model ||
          fp2Data.hasLiedDevice
            ? [
                {
                  label: "Device",
                  value:
                    [userAgent.device.vendor, userAgent.device.model]
                      .filter(Boolean)
                      .join(" ") +
                    " " +
                    (fp2Data.hasLiedDevice ? "(Lied)" : ""),
                },
              ]
            : []),
          {
            label: "Resolution",
            value:
              data.session.device.components.screenResolution.value.join("x") +
              " " +
              (fp2Data.hasLiedResolution ? "(Lied)" : ""),
          },
          {
            label: "Engine",
            value: [userAgent.engine.name, userAgent.engine.version]
              .filter(Boolean)
              .join(" "),
          },
          ...(userAgent.cpu.architecture
            ? [
                {
                  label: "CPU",
                  value: [userAgent.cpu.architecture, userAgent.cpu.model]
                    .filter(Boolean)
                    .join(" "),
                },
              ]
            : []),
          {
            label: "Bot",
            value: fp2Data.isBot ? "True" : "False",
          },
        ]
      : []),

    {
      label: "Timezone",
      value: data.session.device.components.timezone.value,
    },
    // {
    //   label: "OS",
    //   value: data.session.device.components.os.value,
    // },
    {
      label: "IP Address",
      value: data.session.ipAddress.ipAddress,
    },
    {
      label: "Static IP Score",
      value: data.session.ipAddress.staticIPScore,
    },
    {
      label: "ISP",
      value: data.session.ipAddress.isp,
    },
    {
      label: "Anonymous",
      value: data.session.ipAddress.isAnonymous ? "True" : "False",
    },
    ...(data.session.ipAddress.isAnonymous
      ? [
          {
            label: "Anonymizer",
            value: getAnonymizers(data.session.ipAddress).join(", "),
          },
        ]
      : []),
    {
      label: "User type",
      value: startCase(data.session.ipAddress.userType),
    },
    {
      label: "User count",
      value: data.session.ipAddress.userCount,
    },
    {
      label: "Fingerprint",
      value: data.session.device.fingerprint,
    },
  ];

  const locationData = [
    { label: "City", value: data.session.ipAddress.cityName },
    { label: "Subdivision", value: data.session.ipAddress.subdivisionName },
    { label: "Country", value: data.session.ipAddress.countryName },
    { label: "IP Timezone", value: data.session.ipAddress.timezone },
  ];

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
            <TransactionMap
              markers={[
                {
                  latitude: data.session.ipAddress.latitude,
                  longitude: data.session.ipAddress.longitude,
                  radius: data.session.ipAddress.accuracyRadius,
                  type: "device",
                },
                ...(data.paymentMethod.geocode
                  ? [
                      {
                        longitude: data.paymentMethod.geocode.center[0],
                        latitude: data.paymentMethod.geocode.center[1],
                        type: "card",
                      },
                    ]
                  : []),
              ]}
            />
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

      <Section title="Related transactions">
        {/* <ViewTransactions linkedTransactionId={transactionId} /> */}
        <PaymentsTable
          paymentsData={relatedData || []}
          count={count}
          pagination={pagination}
          onPaginationChange={setPagination}
          selectedOptions={selectedOptions}
          onSelectedOptionsChange={setSelectedOptions}
          allowMarkAsFraud
          onMarkSelectedAsFraud={() => {
            refetchTransactions().catch(handleError);
          }}
        />
      </Section>
    </Box>
  );
};
