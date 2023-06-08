import {
  Box,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Flex,
  Heading,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from "@chakra-ui/react";
import { Sidebar } from "../Sidebar";
import { useRouter } from "next/router";
import { handleError } from "../../lib/handleError";
import { useFullPath } from "../hooks/useFullPath";
import { ChevronRightIcon } from "lucide-react";
import { RxCaretRight } from "react-icons/rx";
import { useMemo } from "react";

const tabMap = ["transactions"];

interface Props {
  children: React.ReactNode;
}

export const ViewNavLayout = ({ children }: Props) => {
  const router = useRouter();

  const { pathArray } = useFullPath();

  const parent = router.query.parent ?? "";
  const currentTab = tabMap.findIndex((el) => parent.includes(el));

  const groupedPathArray = useMemo(() => {
    if (pathArray.length < 2) {
      return [];
    }
    const arr = [];
    for (let i = 0; i < pathArray.length; i += 2) {
      // remove s from end of string
      let typeName = pathArray[i];
      if (typeName && typeName[typeName.length - 1] === "s") {
        typeName = typeName.slice(0, typeName.length - 1);
      }
      arr.push({
        type: pathArray[i] ?? "",
        typeName: typeName ?? "",
        id: pathArray[i + 1] ?? "",
      });
    }
    return arr;
  }, [pathArray]);

  return (
    <Box>
      <Heading p={4} pb={0}>
        Transactions
      </Heading>
      {children}
    </Box>
  );
};
