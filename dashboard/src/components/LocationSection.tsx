import { Center, Grid, GridItem, Text } from "@chakra-ui/react";
import { type IpAddress } from "@prisma/client";
import { getLabelValuePairs } from "~/utils/getLabelValuePairs";
import { Section } from "./views/PaymentDetails";
import { List } from "./List";
import { env } from "~/env.mjs";
import { PaymentMap } from "./payment-map/PaymentMap";

interface Props {
  ipAddress: IpAddress;
  markers: any;
}

export const LocationSection = ({ ipAddress, markers }: Props) => {
  const locationData = getLabelValuePairs([
    { label: "City", value: ipAddress.location?.cityName },
    {
      label: "Subdivision",
      value: ipAddress.location?.regionName,
    },
    {
      label: "Country",
      value: ipAddress.location?.countryName,
    },
    // { label: "IP Timezone", value: deviceSnapshot?.ipAddress?.location.ip },
  ]);

  return (
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
              <Text>Set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to view this map</Text>
            </Center>
          )}
        </GridItem>
      </Grid>
    </Section>
  );
};
