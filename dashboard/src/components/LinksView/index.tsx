import useResizeObserver from "@react-hook/resize-observer";
import { Card, Icon, Text } from "@tremor/react";
import clsx from "clsx";
import {
  BoxesIcon,
  BoxIcon,
  EyeOff,
  EyeOffIcon,
  ListFilterIcon,
  LogInIcon,
  Maximize2Icon,
  MaximizeIcon,
  MoreHorizontal,
  MoreHorizontalIcon,
} from "lucide-react";
import { useState, useRef, useLayoutEffect, Fragment, useEffect } from "react";
import { processEverything } from "./helpers";
import { EntityData, Link } from "./types";
import { FirstLinkSVG, LinkSVG } from "./LinkSvg";

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
  };
  leftTypeFilter: string;
  onLeftTypeFilterChange?: (value: string) => void;
}

function LinksView({
  data,
  leftTypeFilter,
  onLeftTypeFilterChange,
}: LinksViewProps) {
  const { left: ogLeft, right: ogRight, links: ogLinks } = data;

  const [leftFilter, setLeftFilter] = useState("");
  const [lastLeftFilter, setLastLeftFilter] = useState("");
  const [rightFilter, setRightFilter] = useState("");

  const EVERYTHING = processEverything(
    ogLeft ?? [],
    ogRight ?? [],
    ogLinks ?? [],
    {
      leftTypeFilter,
      leftSelection: leftFilter,
      rightSelection: rightFilter,
      explicitlyVisibleLeft: [],
    }
  );

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

  useLayoutEffect(computeHeights, [leftFilter, leftTypeFilter]);
  useResizeObserver(linksRef, computeHeights);

  useEffect(() => {
    setLeftFilter("");
    setRightFilter("");
  }, [leftTypeFilter]);

  return (
    <div className="flex items-stretch">
      <div id="leftLeft" className="w-[40px] shrink-0 relative">
        <svg className="w-full h-full">
          {EVERYTHING.left
            .toSorted((a, b) =>
              a.id === leftFilter
                ? 1
                : a.id === lastLeftFilter && b.id !== leftFilter
                ? 1
                : -1
            )
            .map((entity, index) => {
              return (
                <FirstLinkSVG
                  y={lHeights[entity.id] ?? 0}
                  x={40}
                  key={`${entity.id}-left`}
                  active={leftFilter === "" || leftFilter === entity.id}
                />
              );
            })}
        </svg>
      </div>
      <div id="left" className="flex-1 relative">
        <div className="p-0 mt-4">
          {EVERYTHING.left.map((item, idx) => (
            <Fragment key={item.id}>
              <Card
                className={clsx({
                  "group flex gap-4 justify-between transition cursor-pointer relative px-4 py-3 mb-2":
                    true,
                  "opacity-30":
                    (leftFilter !== "" && leftFilter !== item.id) ||
                    (rightFilter !== "" &&
                      EVERYTHING.links.findIndex(
                        (link) => link.from === item.id
                      ) === -1),
                  "bg-blue-100": leftFilter === item.id,
                })}
                ref={(element) => (leftDivs.current[item.id] = element)}
                onClick={() => {
                  if (item.type === "###GROUP###" && false) {
                    onLeftTypeFilterChange?.(item.id);
                  } else {
                    setLastLeftFilter(leftFilter);
                    setLeftFilter((old) => (old === item.id ? "" : item.id));
                    setRightFilter("");
                  }
                }}
              >
                {item.type === "###GROUP###" ? (
                  <div className="flex gap-4">
                    <BoxesIcon className="my-auto text-blue-400" size={18} />
                    <div className="min-w-0">
                      <Text className="text-gray-400 font-semibold italic">
                        {item.name}
                      </Text>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-4">
                    <BoxIcon className="my-auto text-blue-400" size={18} />
                    <div className="min-w-0">
                      <Text className="font-semibold text-black">
                        {item.type}
                      </Text>
                      <a
                        href={`/entity/${item.id}?tab=1`}
                        className="hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <Text className="">{item.name}</Text>
                      </a>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 text-gray-400">
                  {item.type === "###GROUP###" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onLeftTypeFilterChange?.(item.id);
                      }}
                    >
                      <ListFilterIcon
                        className="my-auto text-gray-400 hover:text-gray-500 transition"
                        size={18}
                      />
                    </button>
                  )}

                  <MoreHorizontalIcon
                    className="my-auto hover:text-gray-500 transition"
                    size={18}
                  />
                </div>

                {EVERYTHING.hiddenEntities.includes(item.id) && (
                  <div className="absolute left-[calc(100%+6px)] top-0 bottom-0 flex items-center">
                    <div className="my-auto rounded-[200px] p-1 bg-white flex items-center">
                      <Icon
                        icon={EyeOffIcon}
                        size="md"
                        color="gray"
                        className={`p-0 m-0 ${
                          leftFilter === item.id ? "" : "opacity-30"
                        }`}
                      />
                    </div>
                  </div>
                )}

                {/* the link number indicator (right side) */}
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
              </Card>
            </Fragment>
          ))}
        </div>
      </div>
      <div id="links" className="flex-1" ref={linksRef}>
        <svg className="w-full h-full">
          {EVERYTHING.links.map((link, index) => {
            return (
              <LinkSVG
                y1={lHeights[link.from] ?? 0}
                y2={rHeights[link.to] ?? 0}
                x={linkWidth}
                w={
                  EVERYTHING.links.filter(
                    (l) => l.from === link.from && l.to === link.to
                  ).length
                }
                opacity={
                  leftFilter === "" && rightFilter === ""
                    ? 0.1 + 0.9 * (link.weight ?? 1)
                    : link.from !== leftFilter && link.to !== rightFilter
                    ? 0.1
                    : 1
                }
                key={`${link.from}-${link.to}`}
              />
            );
          })}
        </svg>
      </div>
      <div id="right" className="flex-1 flex flex-col gap-2 relative pt-4">
        {/* className "relative" used for svg positioning ^ */}
        {EVERYTHING.right.map((item) => (
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
                EVERYTHING.links.findIndex(
                  (link) => link.to === item.id && link.from === leftFilter
                ) === -1
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
                  <a
                    href={`/entity/${item.id}?tab=1`}
                    className="hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <Text className="font-semibold text-black">
                      {item.name}
                    </Text>
                  </a>
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

// Only show the component after it has been mounted,
// to avoid SSR issues with useLayoutEffect

function Wrapped(props: LinksViewProps) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    setShown(true);
  }, []);

  if (!shown) return null;
  return <LinksView {...props} />;
}

export default Wrapped;
