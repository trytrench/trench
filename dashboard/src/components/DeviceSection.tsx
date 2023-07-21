import { Grid, GridItem, Text } from "@chakra-ui/react";
import { getLabelValuePairs } from "~/utils/getLabelValuePairs";
import { List } from "./List";
import { Section } from "./views/PaymentDetails";
import { DeviceSnapshot } from "@prisma/client";
import { startCase } from "lodash";

interface Props {
  deviceSnapshot: DeviceSnapshot;
}

export const DeviceSection = ({ deviceSnapshot }: Props) => {
  const getAnonymizers = (metadata: {
    isAnonymousVpn: boolean;
    isHostingProvider: boolean;
    isPublicProxy: boolean;
    isResidentialProxy: boolean;
    isTorExitNode: boolean;
  }) => {
    const anonymizers = [];

    if (metadata.isAnonymousVpn) anonymizers.push("VPN");
    if (metadata.isHostingProvider) anonymizers.push("Hosting provider");
    if (metadata.isPublicProxy) anonymizers.push("Public proxy");
    if (metadata.isResidentialProxy) anonymizers.push("Residential proxy");
    if (metadata.isTorExitNode) anonymizers.push("Tor exit node");

    return anonymizers;
  };

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
    {
      label: "Anonymizer",
      value: getAnonymizers(deviceSnapshot?.ipAddress?.metadata).join(", "),
      show: !!deviceSnapshot?.ipAddress?.metadata?.isAnonymous,
    },
    {
      label: "User type",
      value: startCase(deviceSnapshot.ipAddress.metadata.userType),
    },
    // {
    //   label: "User count",
    //   value: data.session.ipAddress.userCount,
    // },
    {
      label: "Fingerprint",
      value: deviceSnapshot?.fingerprint,
    },
  ]);

  return (
    <Section title="Device">
      {deviceSnapshot ? (
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
      ) : (
        <Text color="subtle" variant="sm">
          Device data unavailable
        </Text>
      )}
    </Section>
  );
};
