import { Grid, GridItem } from "@chakra-ui/react";
import { getLabelValuePairs } from "~/utils/getLabelValuePairs";
import { List } from "./List";
import { Section } from "./views/PaymentDetails";
import { DeviceSnapshot } from "@prisma/client";

interface Props {
  deviceSnapshot: DeviceSnapshot;
}

export const DeviceSection = ({ deviceSnapshot }: Props) => {
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
      value: deviceSnapshot?.fingerprint,
    },
  ]);

  return (
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
          <List data={deviceData.slice(0, Math.ceil(deviceData.length / 2))} />
        </GridItem>
        <GridItem>
          <List data={deviceData.slice(Math.ceil(deviceData.length / 2))} />
        </GridItem>
      </Grid>
    </Section>
  );
};
