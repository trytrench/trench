import { Navbar } from "~/components/Navbar";
import { EntityData, Link } from "./types";
import {
  Card,
  Title,
  Text,
  Divider,
  Badge,
  DatePicker,
  BadgeProps,
} from "@tremor/react";
import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import useResizeObserver from "@react-hook/resize-observer";
import { api } from "~/utils/api";
import { useRouter } from "next/router";
import { DateRangePicker } from "~/components/Filters";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { MoreHorizontalIcon } from "lucide-react";
import {
  dummyLeft,
  dummyLinks,
  dummyRight,
  dummyUser,
  dummyUserLabels,
} from "./dummy";
import { link } from "fs";

interface LinksViewProps {
  data: {
    left: EntityData[];
    right: EntityData[];
    links: Link[];
    entityInfo?: {
      id: string;
      name: string;
      type: string;
    };
    entityLabels: {
      value: string;
      color: string;
    }[];
  };
}

interface LinkSVGProps {
  y1: number;
  y2: number;
  x: number;
  w: number;
  opacity?: string;
}

function LinkSVG({ y1, y2, x, w, opacity }: LinkSVGProps) {
  const REACH = 0.65 * x;
  const logW = Math.log(w + 1);
  // bezier curve
  return (
    <path
      d={`M 0 ${y1} C ${REACH} ${y1} ${x - REACH} ${y2} ${x} ${y2}`}
      fill="transparent"
      stroke="currentColor"
      strokeWidth={logW > 2 ? logW : 2}
      className={`text-gray-500 transition ${opacity}`}
    />
  );
}

function LinksView({ data }: LinksViewProps) {
  const {
    left: ogLeft,
    right: ogRight,
    links: ogLinks,
    entityInfo,
    entityLabels,
  } = data;

  const [leftFilter, setLeftFilter] = useState("");
  const [rightFilter, setRightFilter] = useState("");

  let left: EntityData[] = [];
  let right: EntityData[] = [];
  let links: Link[] = [];

  if (leftFilter !== "") {
    left = ogLeft.sort((a, b) => {
      const aLinks = ogLinks.filter((link) => link.from === a.id).length;
      const bLinks = ogLinks.filter((link) => link.from === b.id).length;
      return bLinks - aLinks;
    });
    links = ogLinks.filter((link) => link.from === leftFilter);

    const leftVal = (id: string) => {
      const link = links.find((link) => link.to === id);
      return link ? link.from : "";
    };

    right = ogRight;
    // .sort((a, b) => {
    //   return leftVal(b.id).localeCompare(leftVal(a.id));
    // });
  } else if (rightFilter !== "") {
    right = ogRight.sort((a, b) => {
      const aLinks = ogLinks.filter((link) => link.to === a.id).length;
      const bLinks = ogLinks.filter((link) => link.to === b.id).length;
      return bLinks - aLinks;
    });
    links = ogLinks.filter((link) => link.to === rightFilter);

    const rightVal = (id: string) => {
      const link = links.find((link) => link.from === id);
      return link ? link.to : "";
    };

    left = ogLeft.sort((a, b) => {
      const aLinks = ogLinks.filter((link) => link.from === a.id).length;
      const bLinks = ogLinks.filter((link) => link.from === b.id).length;
      return bLinks - aLinks;
    });

    // left = ogLeft.sort((a, b) => {
    //   return rightVal(b.id).localeCompare(rightVal(a.id));
    // });
  } else {
    left = ogLeft.sort((a, b) => {
      const aLinks = ogLinks.filter((link) => link.from === a.id).length;
      const bLinks = ogLinks.filter((link) => link.from === b.id).length;
      return bLinks - aLinks;
    });
    // right = ogRight
    // .sort((a, b) => {
    //   const aLinks = ogLinks.filter((link) => link.to === a.id).length;
    //   const bLinks = ogLinks.filter((link) => link.to === b.id).length;
    //   return bLinks - aLinks;
    // });

    right = ogRight.sort((a, b) => {
      const aLinks = ogLinks.filter((link) => link.to === a.id).length;
      const bLinks = ogLinks.filter((link) => link.to === b.id).length;
      return bLinks - aLinks;
    });

    links = ogLinks;
  }

  const leftDivs = useRef({} as Record<string, HTMLDivElement | null>);
  const rightDivs = useRef({} as Record<string, HTMLDivElement | null>);
  const linksRef = useRef<HTMLDivElement>(null);

  const [linkWidth, setLinkWidth] = useState(0);
  const [lHeights, setLHeights] = useState({} as Record<string, number>);
  const [rHeights, setRHeights] = useState({} as Record<string, number>);

  const computeHeights = () => {
    if (!linksRef.current || !leftDivs.current || !rightDivs.current) return;
    console.log("computeHeights");

    const lHeights = Object.fromEntries(
      Object.entries(leftDivs.current).map(([key, value]) => [
        key,
        value ? value.offsetTop + value.offsetHeight / 2 : 0,
      ])
    );
    const rHeights = Object.fromEntries(
      Object.entries(rightDivs.current).map(([key, value]) => [
        key,
        value ? value.offsetTop + value.offsetHeight / 2 : 0,
      ])
    );

    setLHeights(lHeights);
    setRHeights(rHeights);
    setLinkWidth(linksRef.current?.offsetWidth ?? 0);
  };

  useLayoutEffect(computeHeights, [leftFilter]);
  useResizeObserver(linksRef, computeHeights);

  return (
    <div className="flex items-stretch">
      <div id="left" className="w-[24rem] relative">
        <Card className="p-0">
          <div className="p-4">
            <Text className="font-semibold">{entityInfo?.type}</Text>
            <Title className="mb-2 font-bold">{entityInfo?.name ?? ""}</Title>
            <div className="flex flex-wrap gap-1">
              {entityLabels.map((label) => (
                <Badge
                  key={label.value}
                  color={label.color as BadgeProps["color"]}
                >
                  {label.value}
                </Badge>
              ))}
            </div>
          </div>

          {left.map((item, idx) => (
            <Fragment key={item.id}>
              <Divider className="my-0" />
              <div
                className={`group flex justify-between transition cursor-pointer relative px-4 py-3 ${
                  (leftFilter !== "" && leftFilter !== item.id) ||
                  (rightFilter !== "" &&
                    links.findIndex((link) => link.from === item.id) === -1)
                    ? "opacity-30"
                    : ""
                }
                ${leftFilter === item.id ? "bg-blue-100" : ""}
                `}
                ref={(element) => (leftDivs.current[item.id] = element)}
                onClick={() => {
                  setLeftFilter((old) => (old === item.id ? "" : item.id));
                  setRightFilter("");
                }}
              >
                <div className="min-w-0">
                  <Text className="font-semibold text-black">{item.type}</Text>
                  <Text className="">{item.name}</Text>
                </div>

                <DotsHorizontalIcon className="my-auto text-gray-400 hover:text-gray-700" />

                <div className="absolute left-[calc(100%+10px)] pointer-events-none select-none">
                  <div
                    color="gray"
                    className={`text-xs hover:brightness-[102%]  text-gray-700 ${
                      leftFilter === item.id ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    {ogLinks.filter((link) => link.from === item.id).length}
                  </div>
                </div>
              </div>
            </Fragment>
          ))}
        </Card>
      </div>
      <div id="links" className="grow" ref={linksRef}>
        <svg className="w-full h-full">
          {ogLinks.map((link, index) => (
            <LinkSVG
              y1={lHeights[link.from] ?? 0}
              y2={rHeights[link.to] ?? 0}
              x={linkWidth}
              w={
                links.filter((l) => l.from === link.from && l.to === link.to)
                  .length
              }
              opacity={
                links.find((l) => l.from === link.from && l.to === link.to)
                  ? "opacity-100"
                  : "opacity-5"
              }
              key={`${link.from}-${link.to}`}
            />
          ))}
        </svg>
      </div>
      <div id="right" className="w-[24rem] flex flex-col gap-2 relative">
        {/* className "relative" used for svg positioning ^ */}
        {right.map((item) => (
          <div
            key={item.id}
            ref={(element) => (rightDivs.current[item.id] = element)}
            className={` transition
              ${
                rightFilter !== "" && rightFilter !== item.id
                  ? "opacity-30"
                  : ""
              }`}
          >
            <Card
              className={`p-2 px-3 cursor-pointer ${
                leftFilter !== "" &&
                links.findIndex((link) => link.to === item.id) === -1
                  ? "opacity-30"
                  : ""
              }
              ${rightFilter === item.id ? "bg-blue-100" : ""}
              `}
              onClick={() => {
                setRightFilter((old) => (old === item.id ? "" : item.id));
                setLeftFilter("");
              }}
            >
              <div className="flex gap-4">
                <div className="min-w-0 flex gap-2">
                  <Text className="font-semibold text-black">{item.name}</Text>
                </div>
                <MoreHorizontalIcon
                  size={18}
                  className="my-auto text-gray-400 ml-auto mr-0"
                />
              </div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}

function LinksPage() {
  // wait for the page to load before showing the view, since
  // useLayoutEffect in LinksView does not play well with SSR
  const [viewShown, setViewShown] = useState(false);
  useEffect(() => {
    setViewShown(true);
  }, []);

  const router = useRouter();
  const entityId = router.query.entityId as string | undefined;

  const { data } = api.links.relatedEntities.useQuery(
    {
      id: entityId ?? "",
    },
    { enabled: !!entityId }
  );
  const { data: entityInfo } = api.links.entityInfo.useQuery(
    {
      id: entityId ?? "",
    },
    { enabled: !!entityId }
  );

  const { data: TEMP } = api.links.relatedEntities2.useQuery(
    {
      id: entityId ?? "",
    },
    { enabled: !!entityId }
  );
  useEffect(() => {
    console.log(TEMP);
  }, [TEMP]);

  const leftSide = data?.leftSide ?? [];
  const rightSide = data?.rightSide ?? [];
  const links = data?.links ?? [];

  // const leftSide = dummyLeft;
  // const rightSide = dummyRight;
  // const links = dummyLinks;
  // const entityInfo = dummyUser;
  const labels = dummyUserLabels;

  return (
    <div className="min-h-full bg-white absolute inset-0 overflow-auto py-0">
      {/* <div className="px-8 py-4 bg-white flex gap-4 items-center border-b">
        <Title>Showing Links from the past</Title>
        <DateRangePicker />
      </div> */}
      <div className="p-8">
        {viewShown && (
          <LinksView
            data={{
              left: leftSide,
              right: rightSide,
              links: links,
              entityInfo,
              entityLabels: labels,
            }}
          />
        )}
      </div>
    </div>
  );
}

function Page() {
  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      <div className="grow overflow-hidden relative">
        <LinksPage />
      </div>
    </div>
  );
}

export default Page;
