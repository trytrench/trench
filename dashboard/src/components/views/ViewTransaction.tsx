import {
  Box,
  Checkbox,
  HStack,
  Heading,
  IconButton,
  Link,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Skeleton,
  Text,
} from "@chakra-ui/react";
import { type RouterOutputs, api } from "../../lib/api";
import { DataTable } from "../DataTable";
import {
  createColumnHelper,
  type ColumnDef,
  type PaginationState,
} from "@tanstack/react-table";
import { useCallback, useMemo, useState } from "react";
import { format } from "date-fns";
import { IoEllipsisHorizontal } from "react-icons/io5";
import { RxArrowRight } from "react-icons/rx";
import { MastercardIcon, VisaIcon } from "../CardWithIcon/icons";
import dynamic from "next/dynamic";
import {
  BiUser,
  BiCreditCard,
  BiMobile,
  BiDesktop,
  BiTransfer,
  BiTime,
} from "react-icons/bi";
import { type Node } from "../../server/api/routers/dashboard/paymentAttempts";
import { type ForceGraphProps } from "react-force-graph-2d";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

const DynamicReactJson = dynamic(import("react-json-view"), { ssr: false });

function getImgSrc(
  node: RouterOutputs["dashboard"]["transactions"]["getGraph"]["nodes"][string]
) {
  switch (node.type) {
    case "customer":
      return "/icons/user.svg";
    case "card":
      return "/icons/credit-card.svg";
    case "device":
      if (node.data.platform?.toString().toLowerCase().includes("linux")) {
        return "/icons/desktop.svg";
      } else {
        return "/icons/mobile.svg";
      }
    case "transaction":
      return "/icons/transfer.svg";
    case "session":
      return "/icons/time.svg";
  }
}

const renderCanvas: ForceGraphProps["nodeCanvasObject"] = (node, ctx) => {
  if (!node) return ctx;

  const img = new Image();
  node.img = img;

  const x = node.x ?? 0;
  const y = node.y ?? 0;
  const size = 15;

  img.src = getImgSrc(node);
  ctx.drawImage(img, x - size / 2, y - size / 2, size + 1, size);

  // ctx.beginPath();
  // const label = node.value;
  // const height = 6;
  // const textWidth = ctx.measureText(label).width;
  // const bgDimensions = [textWidth, height].map((n) => n + 10 * 0.2); // for padding
  // ctx.fillStyle = "#2d343c"; //background color for tag
  // const fillY = node.current_case
  //   ? node.y - bgDimensions[1] / 2 + 10.5
  //   : node.y - bgDimensions[1] / 2 + 9.5;
  // ctx.fillRect(
  //   node.x - bgDimensions[0] / 2 + 1.3,
  //   fillY,
  //   ...bgDimensions
  // );
  // const translateY = node.current_case ? node.y + 11.1 : node.y + 10.1;
  // // for text styling
  // ctx.font = `3px`;
  // ctx.textAlign = "center";
  // ctx.textBaseline = "middle";
  // ctx.fillStyle = "#d3d3d3"; //node.color;
  // ctx.fillText(label, node.x + 1.3, translateY);

  return ctx;
};

function transformNode(node: Node) {
  switch (node.type) {
    case "transaction":
      return {
        ...node,
        label: "Transaction",
      };
    case "customer":
      return {
        ...node,
        label: node.data.email,
      };
    case "session":
      return {
        ...node,
        label: "Session",
      };
    case "card":
      return {
        ...node,
        label: `Card ${node.data.last4}`,
      };
    case "device":
      return {
        ...node,
        label: "Device",
      };
  }
}

interface RenderFocusedNodeProps {
  node: Node | null;
}

function RenderFocusedNode(props: RenderFocusedNodeProps) {
  const { node } = props;

  if (!node) return null;

  return (
    <Box height="full" width="full">
      <Heading>{node.type}</Heading>
      <DynamicReactJson
        src={node ?? {}}
        collapsed={true}
        displayDataTypes={false}
        enableClipboard={false}
      />
    </Box>
  );
}
interface ViewTransactionProps {
  transactionId: string;
}
export function ViewTransaction(props: ViewTransactionProps) {
  const { transactionId } = props;

  const { isLoading, data: graph } =
    api.dashboard.transactions.getGraph.useQuery(
      { transactionId },
      { keepPreviousData: true }
    );

  const transactionData = useMemo(() => {
    const node = graph?.nodes[transactionId];
    if (node?.type === "transaction") {
      return node.data;
    } else {
      return undefined;
    }
  }, [graph?.nodes, transactionId]);

  const graphData = useMemo(() => {
    return {
      nodes: Object.values(graph?.nodes ?? {}).map(transformNode),
      links: graph?.edges ?? [],
    };
  }, [graph]);

  const [focusedNode, setFocusedNode] = useState<Node | null>(null);
  const handleNodeClick = useCallback((node: Node) => {
    setFocusedNode(node);
  }, []);

  if (isLoading) return <Skeleton />;
  return (
    <Box>
      <HStack align="start">
        <ForceGraph2D
          // d3VelocityDecay={1}
          warmupTicks={50}
          graphData={graphData}
          nodeLabel="label"
          nodeAutoColorBy="group"
          onNodeClick={handleNodeClick}
          height={400}
          width={400}
          nodeCanvasObject={renderCanvas}
        />
        <Box p={4} flex={1}>
          <RenderFocusedNode node={focusedNode} />
        </Box>
      </HStack>
      <DynamicReactJson
        src={transactionData ?? {}}
        collapsed={true}
        displayDataTypes={false}
        enableClipboard={false}
      />
    </Box>
  );
}
