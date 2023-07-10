import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  useColorModeValue,
} from "@chakra-ui/react";

import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from "next";
import { getCsrfToken, signIn } from "next-auth/react";
import { handleError } from "../lib/handleError";
import { IoLogoGoogle } from "react-icons/io5";
import { env } from "../env.mjs";

export default function SignIn({
  csrfToken,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <Flex
      minH={"100vh"}
      align={"center"}
      justify={"center"}
      bg={useColorModeValue("gray.50", "gray.800")}
    >
      <Stack spacing={8} mx={"auto"} maxW={"lg"} py={12} px={6}>
        <Stack align={"center"}>
          <Heading fontSize={"4xl"}>Sign in to your account</Heading>
          {/* <Text fontSize={"lg"} color={"gray.600"}>
            to enjoy all of our cool <Link color={"blue.400"}>features</Link> ✌️
          </Text> */}
        </Stack>

        {env.NEXT_PUBLIC_ENABLE_GOOGLE_LOGIN === "true" && (
          <Button
            onClick={() => {
              signIn("google", {
                callbackUrl: "/",
              }).catch(handleError);
            }}
            display="flex"
            alignItems="center"
          >
            <Box mr={2}>
              <IoLogoGoogle />
            </Box>
            Sign in with Google
          </Button>
        )}
        <Box
          rounded={"lg"}
          bg={useColorModeValue("white", "gray.700")}
          boxShadow={"lg"}
          p={8}
          as="form"
          method="post"
          action="/api/auth/callback/credentials"
        >
          <Stack spacing={4}>
            <input name="csrfToken" type="hidden" defaultValue={csrfToken} />
            <FormControl id="username">
              <FormLabel>Username</FormLabel>
              <Input name="username" />
            </FormControl>
            <FormControl id="password">
              <FormLabel>Password</FormLabel>
              <Input name="password" type="password" />
            </FormControl>
          </Stack>
          <Button
            bg={"blue.400"}
            color={"white"}
            _hover={{
              bg: "blue.500",
            }}
            type="submit"
            width="full"
            mt={10}
          >
            Sign in
          </Button>
        </Box>
      </Stack>
    </Flex>
  );
}

SignIn.isPublicPage = true;

export async function getServerSideProps(context: GetServerSidePropsContext) {
  return {
    props: {
      csrfToken: await getCsrfToken(context),
    },
  };
}
