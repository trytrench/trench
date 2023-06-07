import { ArrowBackIcon } from "@chakra-ui/icons";
import {
  Flex,
  IconButton,
  TableContainer,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  Text,
  Box,
  Heading,
} from "@chakra-ui/react";
import { format } from "date-fns";

import router from "next/router";
import { IoEllipsisHorizontal } from "react-icons/io5";
import { api } from "../../lib/api";
import { JSONObject, type JSONValue } from "superjson/dist/types";
import dynamic from "next/dynamic";
const DynamicReactJson = dynamic(import("react-json-view"), { ssr: false });

// interface ObjectViewProps {
//   name: string;
//   value: JSONValue;
// }

// function ObjectView(props: ObjectViewProps) {
//   const { value, name } = props;

//   const count = value ? Object.keys(value).length : 0;

//   if (["string", "number"].includes(typeof value)) {
//     return (
//       <Text>
//         {name}: {value}
//       </Text>
//     );
//   }
//   return (
//     <Box fontSize="small" fontFamily="mono">
//       <Text>{name}</Text>
//       <Box pl={4}>
//         {typeof value === "object" ? (
//           value ? (
//             Object.entries(value).map(([key, value]) => (
//               <ObjectView key={key} name={key} value={value} />
//             ))
//           ) : (
//             <Text>{value}</Text>
//           )
//         ) : (
//           <Text>{value}</Text>
//         )}
//       </Box>
//     </Box>
//   );
// }

interface ViewSessionProps {
  sessionId: string;
}
export function ViewSession(props: ViewSessionProps) {
  const { sessionId } = props;

  const { isLoading, data } = api.dashboard.getSession.useQuery({
    id: sessionId,
  });

  if (isLoading) return <Text>Loading...</Text>;

  if (!data) return <Text>Session not found</Text>;

  const deviceData = [
    { name: "Timezone", value: data.device.timezone.value },
    { name: "Languages", value: data.device.languages.value },
    { name: "Platform", value: data.device.platform.value },
    { name: "IP Address", value: data.ipAddress.ipAddress },
    { name: "Static IP Score", value: data.ipAddress.staticIPScore },
    { name: "ISP", value: data.ipAddress.isp },
    { name: "VPN", value: data.ipAddress.isAnonymous ? "High" : "Low" },
  ];

  const locationData = [
    { name: "City", value: data.ipAddress.cityName },
    { name: "Subdivision", value: data.ipAddress.subdivisionName },
    { name: "Country", value: data.ipAddress.countryName },
    { name: "IP Timezone", value: data.ipAddress.timezone },
  ];

  return (
    <Box px={4} overflowY="scroll">
      <Heading>Data</Heading>
      <DynamicReactJson
        src={data}
        collapsed={true}
        displayDataTypes={false}
        enableClipboard={false}
      />
    </Box>
  );
}
