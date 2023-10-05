import { countBy, groupBy, uniqBy } from "lodash";
import { DisplayEntityData, EntityData, Link } from "./types";
import pluralize from "pluralize";

// if there are more than GROUP_THRESHOLD entities of the same type,
// we group them
const GROUP_THRESHOLD = 3;

// TODO: (somewhere) filter out entities that dont have any links

export interface createGroupsOutput {
  entities: EntityData[];
  links: Link[];
}

export const createGroups = (
  entities: EntityData[],
  links: Link[]
): createGroupsOutput => {
  const typeCounts = countBy(entities, (e) => e.type);

  const notGrouped = entities
    .filter((e) => typeCounts[e.type]! <= GROUP_THRESHOLD)
    .sort((a, b) => a.type.localeCompare(b.type));
  const grouped = Object.entries(typeCounts)
    .filter(([key, val]) => val > GROUP_THRESHOLD)
    .map(([key, val]) => ({
      type: key,
      count: val,
    }))
    .sort((a, b) => a.type.localeCompare(b.type));

  const newLinks = links.map((l) => {
    const fromType = entities.find((e) => e.id === l.from)?.type;
    if (grouped.find((g) => g.type === fromType)) {
      return {
        from: fromType!,
        to: l.to,
        weight: l.weight,
      };
    }
    return l;
  });

  return {
    entities: [
      ...notGrouped,
      ...grouped.map((g) => ({
        id: g.type,
        name: `${g.count} ${pluralize(g.type)}`,
        type: "###GROUP###",
        count: g.count,
      })),
    ],
    links: newLinks,
  };
};

export interface ProcessEverythingOptions {
  leftTypeFilter: string;
  leftSelection: string;
  rightSelection: string;
  explicitlyVisibleLeft: string[];
}

export interface ProcessEverythingResult {
  left: DisplayEntityData[];
  right: DisplayEntityData[];
  links: Link[];
  selectedLinks: Link[];
  hiddenEntities: string[];
}

// filters and sorts all the data.
// some of this logic will be moved to the query

const HIDE_LINKS_THRESHOLD = 40;

export const processEverything = (
  left: EntityData[],
  right: EntityData[],
  links: Link[],
  options: ProcessEverythingOptions
): ProcessEverythingResult => {
  // dedupe links
  links = uniqBy(links, (l) => `${l.from}-${l.to}`);

  // right filter defaults to left filter
  const lFilter = options.leftTypeFilter;
  let rFilter = "";

  // step 1: filter out entities that are not of the selected type
  let leftFiltered: EntityData[] = [];
  let rightFiltered: EntityData[] = right;
  let linksFiltered = links;

  if (lFilter !== "") {
    leftFiltered = left.filter((e) => e.type === lFilter);
  } else {
    const res = createGroups(left, links);
    leftFiltered = res.entities;
    linksFiltered = res.links;
  }
  if (rFilter !== "") {
    rightFiltered = right.filter((e) => e.type === rFilter);
  }

  // step 2: filter out links that are not between the selected entities
  const leftIds = leftFiltered.map((e) => e.id);
  const rightIds = right.map((e) => e.id);
  linksFiltered = linksFiltered.filter(
    (l) => leftIds.includes(l.from) && rightIds.includes(l.to)
  );

  // step 3: if a left entity or left group has more than HIDE_LINKS_THRESHOLD, assume that we want them hidden
  const leftIdsToNotShowLinksFor = leftFiltered
    .filter((e) => {
      if (options.explicitlyVisibleLeft.includes(e.id)) return false;
      const linksFrom = linksFiltered.filter((l) => l.from === e.id);
      return linksFrom.length > HIDE_LINKS_THRESHOLD;
    })
    .map((e) => e.id);

  // step 4: remove links only connected hidden entities
  linksFiltered = linksFiltered.filter(
    (l) =>
      !(
        leftIdsToNotShowLinksFor.includes(l.from) &&
        linksFiltered
          .filter((l2) => l2.to === l.to)
          .filter((l2) => !leftIdsToNotShowLinksFor.includes(l2.from)).length <=
          1
      )
  );
  // remaining links involved with those entities are still visible, but faded.
  linksFiltered = linksFiltered.map((l) => {
    if (leftIdsToNotShowLinksFor.includes(l.from)) {
      return {
        ...l,
        weight: 0,
      };
    }
    return l;
  });

  // and remove right side entities that are not connected to any left side entities
  const visibleRightIds = new Set(linksFiltered.map((l) => l.to));
  rightFiltered = rightFiltered.filter((e) => visibleRightIds.has(e.id));

  // step 5: for links connected to groups, determine weight by number of links/number of entities in group'
  const leftGroups = leftFiltered.filter((e) => e.type === "###GROUP###");
  const displayLinks = Object.values(
    groupBy(linksFiltered, (l) => `${l.from}-${l.to}`)
  ).flatMap((linksArr) => {
    const group = leftGroups.find((g) => g.id === linksArr[0]!.from);
    if (!group) return linksArr;
    const weight = linksArr.length / (group.count ?? 1);
    return [{ ...linksArr[0]!, weight }];
  });

  // last: sort left and right entities by some metric (TODO)
  // Sort by number of outward links
  leftFiltered = leftFiltered.sort((a, b) => {
    const aLinks = linksFiltered.filter((l) => l.from === a.id).length;
    const bLinks = linksFiltered.filter((l) => l.from === b.id).length;
    return bLinks - aLinks;
  });

  return {
    left: leftFiltered.map((e) => ({
      id: e.id,
      name: e.name,
      type: e.type,
      linkCount: links.filter((l) => l.from === e.id).length,
    })),
    right: rightFiltered.map((e) => ({
      id: e.id,
      name: e.name,
      type: e.type,
      linkCount: links.filter((l) => l.to === e.id).length,
    })),
    links: displayLinks,
    selectedLinks: displayLinks.filter(
      (l) => l.from === options.leftSelection || l.to === options.rightSelection
    ),
    hiddenEntities: leftIdsToNotShowLinksFor,
  };
};

// 1: filter left and right entities by type
// 2: filter links by left and right entities
// - if no filter, create groups.
// 3: if a left entity or left group has more than HIDE_LINKS_THRESHOLD, assume that we want them hidden
//    - i.e. remove those links
//    - then remove right side entities that are not connected to any left side entities
// 4: re-filter links?
// 5: for links connected to groups, determine weight by number of links/number of entities in group
// last: sort left and right entities by some metric (TODO)
