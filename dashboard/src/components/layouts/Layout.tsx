import {
  Box,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Text,
  useBreakpointValue,
} from "@chakra-ui/react";
import { MainNav } from "../Navbar";
import { useRouter } from "next/router";
import { IoChevronBack } from "react-icons/io5";

function RouteBreadcrumbs() {
  const router = useRouter();
  const pathItems = router.asPath.split("/").filter((item) => item !== "");
  return (
    <Breadcrumb userSelect="none">
      <Text mr={2}>/</Text>
      {pathItems.map((item, index) => {
        const builtPath = `/${pathItems.slice(0, index + 1).join("/")}`;
        const isCurrent = builtPath === router.asPath;

        if (isCurrent) {
          return (
            <BreadcrumbItem>
              <Text fontWeight="bold">{item}</Text>
            </BreadcrumbItem>
          );
        } else {
          return (
            <BreadcrumbItem>
              <BreadcrumbLink href={builtPath}>{item}</BreadcrumbLink>
            </BreadcrumbItem>
          );
        }
      })}
    </Breadcrumb>
  );
}
interface Props {
  children: React.ReactNode;
}

export const Layout = ({ children }: Props) => {
  const isDesktop = useBreakpointValue({ base: false, lg: true });

  return (
    <>
      <MainNav />

      <Box as="main" maxW="1200px" mx="auto" px={isDesktop ? 8 : 4} pt={6}>
        {children}
      </Box>
    </>
  );
};
