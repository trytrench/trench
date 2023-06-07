import { type CustomPage } from "../types/Page";
import { Center } from "@chakra-ui/react";

const Home: CustomPage = () => {
  return (
    <Center width="full" height="100dvh" bg="blue.100">
      {/* <SignIn /> */}
    </Center>
  );
};

Home.isPublicPage = true;

export default Home;
