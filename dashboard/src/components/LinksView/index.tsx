import useResizeObserver from "@react-hook/resize-observer";
import clsx from "clsx";
import {
  BoxesIcon,
  BoxIcon,
  ChevronDown,
  ExpandIcon,
  ExternalLinkIcon,
  EyeOffIcon,
  ListFilterIcon,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/router";
import pluralize, { plural } from "pluralize";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api } from "~/utils/api";
import { HIDE_LINKS_THRESHOLD, INTERNAL_LIMIT } from "./helpers";
import { FirstLinkSVG, LinkSVG } from "./LinkSvg";
import { sortedForLeftSvgs } from "./sortedForLeftSvgs";
import type { LeftItem, RightItem } from "./types";
import { useEntityName } from "../../hooks/useEntityName";
import { customEncodeURIComponent } from "../../lib/uri";
import { LoadingPlaceholder } from "../LoadingPlaceholder";
import { useEntityPageSubject } from "../../hooks/useEntityPageSubject";
import { sumBy } from "lodash";

interface LinksViewProps {
  entityId: string;
  entityType: string;
  leftTypeFilter: string;
  onLeftTypeFilterChange?: (value: string) => void;
  eventType?: string;
}

function LinksView({
  entityId,
  entityType,
  leftTypeFilter,
  onLeftTypeFilterChange,
  eventType,
}: LinksViewProps) {
  const [joinKeysToExpand, setJoinKeysToExpand] = useState<string[]>([]);

  const { data: entityTypes } = api.entityTypes.list.useQuery();
  const { data, isLoading } = api.links.relatedEntities.useQuery(
    {
      entityId: entityId ?? "",
      entityType: entityType,
      leftSideType: leftTypeFilter,
      limit: leftTypeFilter ? 20 : undefined,
      skip: leftTypeFilter ? 0 : undefined,
      eventType,
    },
    { enabled: !!entityId && !!entityType }
  );

  const left = useMemo(() => data?.left ?? [], [data]);
  const right = data?.right ?? [];
  const links = useMemo(() => data?.links ?? [], [data]);

  //

  const [leftSelection, setLSelection] = useState<string | null>(null);
  const [lastLeftSelection, setLastLeftSelection] = useState<string | null>(
    null
  );
  const [rightSelection, setRSelection] = useState<string | null>(null);

  useEffect(() => {
    setLSelection(null);
    setRSelection(null);
  }, [leftTypeFilter]);

  const selectionExists = leftSelection ?? rightSelection;

  //

  const leftDivs = useRef({} as Record<string, HTMLDivElement | null>);
  const rightDivs = useRef({} as Record<string, HTMLDivElement | null>);
  const linksRef = useRef<HTMLDivElement>(null);

  const [linkWidth, setLinkWidth] = useState(0);
  const [lHeights, setLHeights] = useState({} as Record<string, number>);
  const [rHeights, setRHeights] = useState({} as Record<string, number>);
  const computeHeights = useCallback(() => {
    if (!linksRef.current || !leftDivs.current || !rightDivs.current) {
      console.log("early return");
      return;
    }

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
  }, [leftDivs, rightDivs, linksRef]);

  useLayoutEffect(computeHeights, [
    leftSelection,
    leftTypeFilter,
    links,
    computeHeights,
  ]);
  useResizeObserver(linksRef, computeHeights);

  const activeIds = useMemo(() => {
    const ids = new Set<string>();
    if (leftSelection) {
      ids.add(leftSelection);
      for (const link of links) {
        if (link.from === leftSelection) ids.add(link.to);
      }
    } else if (rightSelection) {
      ids.add(rightSelection);
      for (const link of links) {
        if (link.to === rightSelection) ids.add(link.from);
      }
    }
    return ids;
  }, [links, leftSelection, rightSelection]);

  const leftItemMap = useMemo(() => {
    return new Map(left.map((item) => [item.id, item]));
  }, [left]);

  if (isLoading) {
    return (
      <div className="flex items-center p-4 gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading...</span>
      </div>
    );
  }
  return (
    <div className="flex items-stretch">
      <div id="leftLeft" className="w-[60px] shrink-0 relative">
        <svg className="w-full h-full">
          {sortedForLeftSvgs(left, leftSelection, lastLeftSelection).map(
            (entity) => {
              return (
                <FirstLinkSVG
                  y={lHeights[entity.id] ?? 0}
                  x={60}
                  key={`${entity.id}-left`}
                  active={leftSelection === "" || leftSelection === entity.id}
                />
              );
            }
          )}
        </svg>
      </div>
      <div id="left" className="flex-1 relative">
        <div className="p-0 mt-4">
          {left.map((item) => {
            const isSelected = leftSelection === item.id;
            const isActive = !selectionExists || activeIds.has(item.id);

            const entType = entityTypes?.find((et) => et.id === item.type);

            const showRightLinksCount = isActive && !!rightSelection;
            const linksFromLeftToRight = sumBy(
              links.filter(
                (link) => link.from === item.id && link.to === rightSelection
              ),
              (link) => link.linkCount
            );

            const showTotalLinksCount = leftSelection === item.id;
            const totalLinksCount = sumBy(
              links.filter((link) => link.from === item.id),
              (link) => link.linkCount
            );

            return (
              <div
                className="relative"
                key={item.id}
                ref={(element) => (leftDivs.current[item.id] = element)}
              >
                <div className="absolute left-[calc(100%+4px)] bottom-[calc(50%+2px)] pointer-events-none select-none">
                  <div
                    color="gray"
                    className={clsx({
                      "text-xs text-muted-foreground": true,
                      "opacity-100": showRightLinksCount,
                      "opacity-0": !showRightLinksCount,
                    })}
                  >
                    {linksFromLeftToRight}
                  </div>
                </div>
                <div className="absolute left-[calc(100%+4px)] bottom-[calc(50%+2px)] pointer-events-none select-none">
                  <div
                    color="gray"
                    className={clsx({
                      "text-xs text-muted-foreground": true,
                      "opacity-100": showTotalLinksCount,
                      "opacity-0": !showTotalLinksCount,
                    })}
                  >
                    {totalLinksCount}
                  </div>
                </div>
                <LeftSideCard
                  key={item.id}
                  item={item}
                  isActive={isActive}
                  isSelected={isSelected}
                  onClick={() => {
                    setLastLeftSelection(leftSelection);
                    setLSelection((old) => (old === item.id ? null : item.id));
                    setRSelection(null);
                  }}
                  onFilterClick={() => {
                    onLeftTypeFilterChange?.(item.type);
                  }}
                  href={`/entity/${customEncodeURIComponent(
                    entType?.type
                  )}/${customEncodeURIComponent(item.id)}?tab=links`}
                />
              </div>
            );
          })}
        </div>
      </div>
      <div id="links" className="flex-1" ref={linksRef}>
        <svg className="w-full h-full">
          {links.map((link, idx) => (
            <LinkSVG
              y1={lHeights[link.from] ?? -10}
              y2={rHeights[link.to] ?? -10}
              x={linkWidth}
              linkItem={link}
              leftSelection={leftSelection}
              rightSelection={rightSelection}
              key={`${link.from}-${link.to}-${idx}`}
            />
          ))}
        </svg>
      </div>
      <div id="right" className="flex-1 flex flex-col gap-2 relative pt-4">
        {/* className "relative" used for svg positioning ^ */}
        {right.map((item) => {
          const isSelected = rightSelection === item.id;
          const isActive = !selectionExists || activeIds.has(item.id); // TODO: active when linked to right selection.
          const entType = entityTypes?.find((et) => et.id === item.type);

          const showLeftLinksCount = isActive && !!leftSelection;
          const linksFromRightToLeft = sumBy(
            links.filter(
              (link) => link.to === item.id && link.from === leftSelection
            ),
            (link) => link.linkCount
          );
          return (
            <div
              key={item.id}
              className="relative"
              ref={(element) => (rightDivs.current[item.id] = element)}
            >
              <div className="absolute right-[calc(100%+4px)] bottom-[calc(50%+2px)] pointer-events-none select-none">
                <div
                  color="gray"
                  className={clsx({
                    "text-xs  text-muted-foreground": true,
                    "opacity-100": isSelected,
                    "opacity-0": !isSelected,
                  })}
                >
                  {item.linkCount}
                </div>
              </div>
              <div className="absolute right-[calc(100%+4px)] bottom-[calc(50%+2px)] pointer-events-none select-none">
                <div
                  color="gray"
                  className={clsx({
                    "text-xs  text-muted-foreground": true,
                    "opacity-100": showLeftLinksCount,
                    "opacity-0": !showLeftLinksCount,
                  })}
                >
                  {linksFromRightToLeft}
                </div>
              </div>

              <RightSideCard
                key={item.id}
                item={item}
                isActive={isActive}
                isSelected={isSelected}
                onClick={() => {
                  setRSelection((old) => (old === item.id ? null : item.id));
                  setLSelection(null);
                }}
                // divRef={(element) => (rightDivs.current[item.id] = element)}
                href={`/entity/${customEncodeURIComponent(
                  entType?.type
                )}/${customEncodeURIComponent(item.id)}?tab=links`}
                leftItemMap={leftItemMap}
                onExpandClick={() => {
                  computeHeights();
                }}
              />
            </div>
          );
        })}
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

// Helper components

// Cards on the left side

interface LeftSideCardProps {
  item: LeftItem;
  isActive: boolean;
  isSelected: boolean;
  onClick: () => void;
  onFilterClick: () => void;
  divRef?: React.Ref<HTMLDivElement>;
  href: string;
}

function LeftSideCard(props: LeftSideCardProps) {
  const { item, isActive, isSelected, onClick, onFilterClick, divRef, href } =
    props;

  const { data: entityTypes } = api.entityTypes.list.useQuery();
  const entityTypesMap = useMemo(() => {
    return new Map(entityTypes?.map((et) => [et.id, et.type]) ?? []);
  }, [entityTypes]);

  const isGroup = item.itemType === "group";

  const entityTypeName = entityTypesMap.get(item.type) ?? item.type;

  let entityCountStr = "";
  if (isGroup) {
    if (item.entityCount >= INTERNAL_LIMIT) {
      entityCountStr = `${INTERNAL_LIMIT}+ ${pluralize(entityTypeName)}`;
    } else {
      entityCountStr = `${item.entityCount} ${pluralize(entityTypeName)}`;
    }
  }

  let linkCountStr = "";
  if (item.linkCount >= INTERNAL_LIMIT) {
    linkCountStr = `${INTERNAL_LIMIT}+`;
  } else {
    linkCountStr = `${item.linkCount}`;
  }

  return (
    <div
      className={clsx({
        "group flex gap-4 justify-between transition cursor-pointer relative px-4 py-3 mb-2 border rounded-lg shadow-sm":
          true,
        "opacity-30": !isActive,
        "bg-accent border-primary-foreground": isSelected,
      })}
      ref={divRef}
      onClick={onClick}
    >
      {isGroup ? (
        <div className="flex gap-4">
          <BoxesIcon className="my-auto text-accent-foreground" size={18} />
          <div className="min-w-0 text-sm">
            <div className="text-muted-foreground font-semibold italic">
              {entityCountStr}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex gap-4">
          <BoxIcon className="my-auto text-accent-foreground" size={18} />
          <div className="min-w-0 text-sm">
            <div className="font-semibold text-emphasis-foreground">
              {entityTypesMap.get(item.type)}
            </div>
            <div className="">{item.name}</div>
          </div>
        </div>
      )}

      <div className="flex gap-3 ">
        {isGroup ? (
          <button onClick={onFilterClick}>
            <ListFilterIcon
              className="my-auto text-foreground opacity-30 hover:opacity-70 transition"
              size={18}
            />
          </button>
        ) : (
          <a
            className="my-auto"
            href={href}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <ExternalLinkIcon
              className="my-auto text-foreground opacity-30 hover:opacity-70 transition"
              size={18}
            />
          </a>
        )}
      </div>

      {/* the link number indicator (right side) */}
      <div className="absolute right-[calc(100%+4px)] bottom-[calc(50%+4px)] pointer-events-none select-none">
        <div
          color="gray"
          className={`text-xs  text-muted-foreground ${
            isSelected ? "opacity-100" : "opacity-0"
          }`}
        >
          {linkCountStr}
        </div>
      </div>

      {!isGroup && item.isHidden && (
        <div className="absolute left-[calc(100%+6px)] top-0 bottom-0 flex items-center">
          <div
            className="my-auto rounded-[200px] p-1 bg-background flex items-center group/eyeicon relative"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          >
            <EyeOffIcon
              size={18}
              className={`text-muted-foreground p-0 m-0 ${
                isSelected ? "" : "opacity-30"
              }`}
            />

            <div
              className="absolute text-xs w-[8rem] text-center text-white font-semibold bg-[rgba(0,0,0,0.7)] rounded-md 
                p-0.5 bottom-full left-1/2 -translate-x-1/2 opacity-0 group-hover/eyeicon:opacity-100 transition-opacity pointer-events-none"
            >
              Too many links—not all are shown.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Cards on the right side

interface RightSideCardProps {
  item: RightItem;
  isActive: boolean;
  isSelected: boolean;
  onClick: () => void;
  divRef?: React.Ref<HTMLDivElement>;
  href: string;
  leftItemMap?: Map<string, LeftItem>;
  onExpandClick?: (joinKey: string) => void;
}

function RightSideCard(props: RightSideCardProps) {
  const {
    item,
    isActive,
    isSelected,
    onClick,
    divRef,
    href,
    leftItemMap,
    onExpandClick,
  } = props;
  const { type } = useEntityPageSubject();
  const { data: entityTypes } = api.entityTypes.list.useQuery();

  const entityTypeName = entityTypes?.find((et) => et.id === type)?.type;
  const [expanded, setExpanded] = useState(false);
  return (
    <div key={item.id} ref={divRef}>
      <div
        className={clsx({
          "p-2 px-3 cursor-pointer transition rounded-lg border shadow-sm":
            true,
          "opacity-40": !isActive,
          "bg-accent border-primary-foreground": isSelected,
        })}
        style={{
          // based on weight, darken the background. weight is a number between 0 and 1.
          backgroundColor: `rgba(200, 220, 255, ${1 * item.similarityIndex})`,
        }}
        onClick={onClick}
      >
        {item.itemType === "entity" ? (
          <div className="flex justify-between">
            <div className="min-w-0 flex gap-2 text-sm">
              <div className="font-semibold text-emphasis-foreground">
                {item.name}
              </div>
            </div>
            <a
              className="my-auto"
              href={href}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <ExternalLinkIcon
                className="my-auto text-foreground opacity-30 hover:opacity-70 transition"
                size={18}
              />
            </a>
          </div>
        ) : (
          <div>
            <div className="flex justify-between">
              <div className="min-w-0 gap-2 text-sm">
                <div className="font-semibold text-emphasis-foreground italic">
                  {item.entityCount} {plural(entityTypeName ?? "")}
                </div>
                <div className="text-xs mt-0.5 text-gray-400 italic">
                  Linked via{" "}
                  {item.fromIds
                    .map((id) => {
                      const leftItem = leftItemMap?.get(id);
                      if (leftItem?.itemType === "entity") {
                        return leftItem.name;
                      } else {
                        const entityType = entityTypes?.find(
                          (et) => et.id === leftItem?.type
                        );
                        return plural(`${entityType?.type ?? ""}`);
                      }
                    })
                    .join(", ")}
                </div>
              </div>
              {item.entities.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded((prev) => !prev);
                    onExpandClick?.(item.fromIds.join(","));
                  }}
                >
                  <ChevronDown
                    className={clsx({
                      "text-foreground opacity-30 hover:opacity-70 transition":
                        true,
                      "rotate-180": expanded,
                    })}
                    size={18}
                  />
                </button>
              )}
            </div>
            {expanded && (
              <div className="mt-4 text-sm flex flex-col gap-2">
                {item.entities.map((entity) => (
                  <div key={entity.id} className="flex justify-between">
                    <div className="flex gap-2">
                      <div className="font-semibold">{entity.name}</div>
                      <div className="text-gray-400 italic">
                        {entity.linkCount} links
                      </div>
                    </div>
                    <a
                      href={`/entity/${customEncodeURIComponent(
                        entityTypeName
                      )}/${customEncodeURIComponent(entity.id)}?tab=links`}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <ExternalLinkIcon
                        className="my-auto text-foreground opacity-30 hover:opacity-70 transition"
                        size={18}
                      />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
