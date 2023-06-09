import Head from "next/head";
import Image from "next/image";
import { Inter } from "next/font/google";
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
    <Box maxW="container.sm" flexDir="column" gap={4} display="flex">
      <Heading mb={4}>Home</Heading>

      <Link href="/payments">
        <Card
          transition={"all 0.2s ease-in-out"}
          size="sm"
          variant="outline"
          _hover={{
            backgroundColor: "gray.100",
          }}
          borderRadius="md"
          p="2"
        >
          <CardHeader pb={0}>
            <Heading size="md">See payments</Heading>
          </CardHeader>
          <CardBody>
            <Text>Search, assess, and flag fraudent payments.</Text>
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
          borderRadius="md"
          p="2"
        >
          <CardHeader pb={0}>
            <Heading size="md">Manage blocklists</Heading>
          </CardHeader>
          <CardBody>
            <Text>
              Manage blocklists to block payment attempts from specific users.
            </Text>
          </CardBody>
        </Card>
      </Link>
      <Link href="/rules">
        <Card
          transition={"all 0.2s ease-in-out"}
          size="sm"
          variant="outline"
          _hover={{
            backgroundColor: "gray.100",
          }}
          borderRadius="md"
          p="2"
        >
          <CardHeader pb={0}>
            <Heading size="md">Set rules</Heading>
          </CardHeader>
          <CardBody>
            <Text>Set rules to assign risk levels to payments.</Text>
          </CardBody>
        </Card>
      </Link>
    </Box>
  );
};
Home.getLayout = (page) => <Layout>{page}</Layout>;

export default Home;
