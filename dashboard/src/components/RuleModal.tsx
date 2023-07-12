import {
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { Button, Heading } from "@chakra-ui/react";
import { useMemo } from "react";
import { InfoIcon } from "lucide-react";
import { Highlight, themes } from "prism-react-renderer";
import { PREFIX, SUFFIX } from "~/components/editor/constants";
import { type RuleSnapshot } from "@prisma/client";

export function RuleModal(props: { ruleSnapshot: RuleSnapshot }) {
  const { ruleSnapshot } = props;

  const { isOpen, onOpen, onClose } = useDisclosure();

  const realCode = useMemo(() => {
    return `${PREFIX}\n${ruleSnapshot.tsCode ?? ""}\n${SUFFIX}`;
  }, [ruleSnapshot.tsCode]);

  return (
    <>
      <Button
        onClick={(e) => {
          e.preventDefault();
          onOpen();
        }}
        color="gray.400"
        bg="transparent"
        as="button"
        m={-3}
        p={3}
        _hover={{
          color: "black",
        }}
        _active={{
          color: "black",
        }}
      >
        <InfoIcon height={16} width={16} />
      </Button>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent maxW="56rem">
          <ModalHeader>Rule: {ruleSnapshot.name}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={8}>
            <Heading mt={4} mb={2} size="sm">
              Description
            </Heading>
            <Text>{ruleSnapshot.description || "None"}</Text>

            <Heading mt={8} mb={2} size="sm">
              Code
            </Heading>
            <Highlight
              theme={themes.vsDark}
              code={realCode}
              language="typescript"
            >
              {({ className, style, tokens, getLineProps, getTokenProps }) => (
                <pre
                  style={{
                    ...style,
                    padding: "12px",
                    fontSize: "14px",
                    overflowX: "auto",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {tokens.map((line, i) => (
                    <div key={i} {...getLineProps({ line })} style={{}}>
                      {/* <span>{i + 1}</span> */}
                      {line.map((token, key) => (
                        <span key={key} {...getTokenProps({ token })} />
                      ))}
                    </div>
                  ))}
                </pre>
              )}
            </Highlight>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
