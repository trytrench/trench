import Head from "next/head";
import Image from "next/image";
import { Inter } from "next/font/google";
import { Sidebar } from "~/components/Sidebar";
import { api } from "~/lib/api";
import { type CustomPage } from "../types/Page";
import { Layout } from "../components/layouts/Layout";
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
} from "@chakra-ui/react";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

const Home: CustomPage = () => {
  return (
    <Box width="50%" flexDir="column" gap={4} display="flex">
      <Heading mb={4}>Home</Heading>

      <Link href="/transactions">
        <Card
          transition={"all 0.2s ease-in-out"}
          size="sm"
          variant="outline"
          _hover={{
            backgroundColor: "gray.100",
          }}
        >
          <CardHeader>
            <Heading size="md">See Transactions</Heading>
          </CardHeader>
          <CardBody>
            <Text>Search, assess, and block fraudent transactions.</Text>
          </CardBody>
        </Card>
      </Link>
      <Link href="/lists">
        <Card
          transition={"all 0.2s ease-in-out"}
          size="sm"
          variant="outline"
          _hover={{
            backgroundColor: "gray.100",
          }}
        >
          <CardHeader>
            <Heading size="md">Manage Blocklists</Heading>
          </CardHeader>
          <CardBody>
            <Text>
              Manage blocklists to block transactions from specific users.
            </Text>
          </CardBody>
        </Card>
      </Link>
      <Link href="/transactions">
        <Card
          transition={"all 0.2s ease-in-out"}
          size="sm"
          variant="outline"
          _hover={{
            backgroundColor: "gray.100",
          }}
        >
          <CardHeader>
            <Heading size="md">Set Rules</Heading>
          </CardHeader>
          <CardBody>
            <Text>Set rules to assign risk levels to transactions.</Text>
          </CardBody>
        </Card>
      </Link>
    </Box>
  );
};
Home.getLayout = (page) => <Layout>{page}</Layout>;

export default Home;
