import { countBy, groupBy, uniq } from "lodash";
import { LeftItem, LinkItem, RawLeft, RawLinks, RightItem } from "./types";

export const INTERNAL_LIMIT = 1000;
export const GROUP_THRESHOLD = 3;
export const HIDE_LINKS_THRESHOLD = 20;
export const MAX_ENTITIES_PER_GROUP = 10;

type ProcessInput = {
  rawLeft: RawLeft;
  rawLinks: RawLinks;
  shouldGroup: boolean;
};

type ProcessOutput = {
  left: LeftItem[];
  right: RightItem[];
  links: LinkItem[];
};

export const processQueryOutput = ({
  rawLeft,
  rawLinks,
  shouldGroup,
}: ProcessInput): ProcessOutput => {
  // split this up into two parts:
  // - entities that are not groups
  // - entities that are groups

  // 1. figure out what's grouped and what's not
  const entitiesPerType = countBy(rawLeft, (e) => e.type);
  const isGrouped = (type: string) =>
    shouldGroup && entitiesPerType[type]! > GROUP_THRESHOLD;

  const notGrouped = rawLeft.filter((e) => !isGrouped(e.type));
  const notGroupedLinks = rawLinks.filter((l) => !isGrouped(l.from_type));

  const groupedTypes = Object.entries(entitiesPerType)
    .filter(([_, val]) => shouldGroup && val > GROUP_THRESHOLD)
    .map(([key]) => key);
  const groupedLinks = rawLinks.filter((l) => isGrouped(l.from_type));

  // UNGROUPED, 1: get right entity ids
  const linksPerUngroupedLeft = countBy(notGroupedLinks, (l) => l.from_id);
  const nonHiddenLinks = notGroupedLinks.filter(
    (l) => linksPerUngroupedLeft[l.from_id]! <= HIDE_LINKS_THRESHOLD
  );
  const rightSide = uniq(nonHiddenLinks.map((l) => l.to_id));

  // GROUPED, 1: get right entity ids
  const linksPerGroupedLeft = countBy(groupedLinks, (l) => l.from_type);
  // TODO: for right side, only get the top 20 per type by link count
  const groupLinks = Object.entries(
    groupBy(groupedLinks, (l) => l.from_type)
  ).flatMap(([type, links]) => {
    const countedLinks = Object.entries(countBy(links, (l) => l.to_id));
    const topLinks = countedLinks
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_ENTITIES_PER_GROUP);
    return topLinks.map((l) => ({
      from_type: type,
      to_id: l[0],
      count: l[1],
    }));
  });

  // calculate all right side entities
  const rightSideEntities = uniq([
    ...rightSide,
    ...groupLinks.map((l) => l.to_id),
  ]);

  // get final links
  const ungroupedLinks = notGroupedLinks.filter((l) =>
    rightSideEntities.includes(l.to_id)
  );

  // put everything together

  const linkItems: LinkItem[] = [
    ...ungroupedLinks.map((l) => {
      const isHidden = linksPerUngroupedLeft[l.from_id]! > HIDE_LINKS_THRESHOLD;
      return {
        itemType: isHidden ? ("hiddenLink" as const) : ("link" as const),
        from: l.from_id,
        to: l.to_id,
      };
    }),
    ...groupLinks.map((l) => ({
      itemType: "weightedLink" as const,
      from: l.from_type,
      to: l.to_id,
      weight: l.count,
      reference: linksPerGroupedLeft[l.from_type] ?? 1,
    })),
  ];

  const leftItems: LeftItem[] = [
    ...notGrouped.map((e) => {
      const linkCount = linksPerUngroupedLeft[e.id] ?? 0;
      return {
        itemType: "entity" as const,
        id: e.id,
        type: e.type,
        name: e.name,
        linkCount: linkCount,
        isHidden: linkCount > HIDE_LINKS_THRESHOLD,
      };
    }),
    ...groupedTypes.map((type) => ({
      itemType: "group" as const,
      id: type,
      type: type,
      linkCount: linksPerGroupedLeft[type] ?? 0,
      entityCount: entitiesPerType[type]!,
    })),
  ];

  const rightItems: RightItem[] = rightSideEntities.map((id) => {
    const theEntity = rawLinks.find((e) => e.to_id === id)!;
    return {
      itemType: "entity" as const,
      id: id,
      name: theEntity.to_name,
      type: theEntity.to_type,
      linkCount: 0, // TODO
    };
  });

  const ret = {
    left: leftItems,
    right: rightItems,
    links: linkItems,
  };
  return ret;
};
