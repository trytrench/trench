import { Box, useBreakpointValue } from "@chakra-ui/react";
import { MainNav } from "../Navbar";

interface Props {
  children: React.ReactNode;
}

export const Layout = ({ children }: Props) => {
  const isDesktop = useBreakpointValue({ base: false, lg: true });

  return (
    <Box
      display="flex"
      flexDirection="column"
      style={{
        height: "100vh",
      }}
    >
      <MainNav />

      <Box
        as="main"
        flex={1}
        maxW="1200px"
        w="full"
        mx="auto"
        px={isDesktop ? 8 : 4}
        pt={6}
        overflowY="auto"
      >
        {children}
      </Box>
    </Box>
  );
};
