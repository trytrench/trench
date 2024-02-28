import { countBy, groupBy, mapValues, sum, sumBy, uniq, uniqBy } from "lodash";
import {
  EntityWithName,
  LeftItem,
  LinkItem,
  RawLeft,
  RawLinks,
  RightGroup,
  RightItem,
  WeightedLink,
} from "./types";
import { Entity } from "event-processing";
import { prisma } from "databases";

export const INTERNAL_LIMIT = 100;
export const GROUP_THRESHOLD = 5;
export const HIDE_LINKS_THRESHOLD = 30;
export const RIGHT_LIMIT = 10;
export const MAX_ENTITIES_PER_GROUP = 10;

type ProcessInput = {
  rawLeft: EntityWithName[];
  rawLinks: {
    from: EntityWithName;
    to: EntityWithName;
  }[];
  shouldGroup: boolean;
};

type ProcessOutput = {
  left: LeftItem[];
  right: RightItem[];
  links: WeightedLink[];
};

export const processQueryOutput = ({
  rawLeft,
  rawLinks,
  shouldGroup,
}: ProcessInput): ProcessOutput => {
  const entityTypeCounts = mapValues(
    groupBy(rawLinks, (l) => l.from.type),
    (links) => sumBy(links, (l) => l.from.numLinks)
  );

  const entityTypeRightCounts = mapValues(
    groupBy(rawLinks, (l) => l.from.type),
    (links) => sumBy(links, (l) => l.to.numLinks)
  );

  const leftEntityCounts = mapValues(
    groupBy(rawLinks, (l) => l.from.id),
    (links) => sumBy(links, (l) => l.to.numLinks)
  );
  const rightEntityCounts = mapValues(
    groupBy(rawLinks, (l) => l.to.id),
    (links) => sumBy(links, (l) => l.to.numLinks)
  );

  const leftEntityFirstLinkCounts = mapValues(
    groupBy(rawLeft, (l) => l.id),
    (links) => sumBy(links, (l) => l.numLinks)
  );
  const totalFirstDegreeCounts = sumBy(rawLeft, (l) => l.numLinks);
  // split this up into two parts:
  // - entities that are not groups
  // - entities that are groups

  // 1. figure out what's grouped and what's not
  const entitiesPerType = countBy(rawLeft, (e) => e.type);

  // If a left entity has +2 z score in terms of link count, it should not be grouped
  const entityTypeLinkCountAvg = mapValues(
    groupBy(rawLinks, (l) => l.from.type),
    (links) => sumBy(links, (l) => l.to.numLinks) / links.length
  );
  const entityTypeLinkCountStdDev = mapValues(
    groupBy(rawLinks, (l) => l.from.type),
    (links) =>
      Math.sqrt(
        sumBy(links, (l) =>
          Math.pow(l.to.numLinks - entityTypeLinkCountAvg[l.from.type]!, 2)
        ) / links.length
      )
  );
  const linksPerEntity = mapValues(
    groupBy(rawLinks, (l) => l.from.id),
    (links) => sumBy(links, (l) => l.to.numLinks)
  );

  const jaccardSimsMap = Object.fromEntries(
    rawLeft.map((e) => {
      const togetherCount = e.numLinks;
      const rightCount = leftEntityCounts[e.id] ?? 0;
      const leftCount = totalFirstDegreeCounts;
      const jaccardSimilarity =
        togetherCount / (leftCount + rightCount - togetherCount);
      return [
        e.id,
        {
          type: e.type,
          sim: rightCount === 0 ? 0 : jaccardSimilarity,
        },
      ];
    })
  );

  const jaccardSimsAvgs = mapValues(
    groupBy(rawLeft, (l) => l.type),
    (links) =>
      sumBy(links, (l) => jaccardSimsMap[l.id]?.sim ?? 0) / links.length
  );

  const jaccardSimsStdDevs = mapValues(
    groupBy(rawLeft, (l) => l.type),
    (links) =>
      Math.sqrt(
        sumBy(links, (l) =>
          Math.pow(jaccardSimsMap[l.id]?.sim ?? 0 - jaccardSimsAvgs[l.type]!, 2)
        ) / links.length
      )
  );

  const shouldNotGroup = (entity: {
    id: string;
    type: string;
    jaccardSimilarity: number;
  }) => {
    if (!shouldGroup) {
      return true;
    }
    if (!entityTypeRightCounts[entity.type]) {
      return false;
    }
    if (entitiesPerType[entity.type]! <= GROUP_THRESHOLD) {
      return true;
    }

    const linkAvg = entityTypeLinkCountAvg[entity.type]!;
    const linkStdDev = entityTypeLinkCountStdDev[entity.type]!;
    const linkCount = linksPerEntity[entity.id] ?? 0;

    const outlierLinkCount = linkCount > linkAvg + 3 * linkStdDev;

    const jaccardAvg = jaccardSimsAvgs[entity.type]!;
    const jaccardStdDev = jaccardSimsStdDevs[entity.type]!;
    const jaccardSim = entity.jaccardSimilarity;

    const outlierJaccardSim = jaccardSim > jaccardAvg + 3 * jaccardStdDev;

    return outlierJaccardSim && outlierLinkCount;
  };

  const createArg = (e: EntityWithName) => {
    return {
      id: e.id,
      type: e.type,
      jaccardSimilarity: jaccardSimsMap[e.id]?.sim ?? 0,
    };
  };

  const notGroupedLeft = rawLeft.filter((e) => shouldNotGroup(createArg(e)));
  const groupedLeft = rawLeft.filter((e) => !shouldNotGroup(createArg(e)));
  const notGroupedLinks = rawLinks.filter((l) =>
    shouldNotGroup(createArg(l.from))
  );
  const groupedLinks = groupBy(
    rawLinks.filter((l) => !shouldNotGroup(createArg(l.from))),
    (l) => l.from.type
  );

  // // UNGROUPED, 1: get right entity ids
  // const rightSide = uniq(notGroupedLinks.map((l) => l.to.id));

  // // TODO: for right side, only get the top 20 per type by link count
  // const groupLinks = Object.entries(
  //   groupBy(groupedLinks, (l) => l.from.type)
  // ).flatMap(([type, links]) => {
  //   const countedLinks = Object.entries(countBy(links, (l) => l.to.id));
  //   const topLinks = countedLinks
  //     .sort((a, b) => b[1] - a[1])
  //     .slice(0, MAX_ENTITIES_PER_GROUP);
  //   return topLinks.map((l) => ({
  //     from: { type },
  //     to: { id: l[0] },
  //     count: l[1],
  //   }));
  // });

  // // calculate all right side entities
  // const rightSideEntities = uniq([
  //   ...rightSide,
  //   ...groupLinks.map((l) => l.to.id),
  // ]);

  // get final links
  // const ungroupedLinks = notGroupedLinks.filter((l) =>
  //   rightSideEntities.includes(l.to.id)
  // );

  // put everything together
  const ungroupedLinksByLeft = groupBy(notGroupedLinks, (l) => l.from.type);

  const rawLinksByRight = groupBy(rawLinks, (l) => l.to.id);
  const rawLinksByLeftId = groupBy(rawLinks, (l) => l.from.id);
  const rawLinksByLeftType = groupBy(rawLinks, (l) => l.from.type);

  const linkItems: WeightedLink[] = [
    ...notGroupedLinks.map((link) => {
      const leftCount = leftEntityCounts[link.from.id] ?? 0;
      const rightCount = rightEntityCounts[link.to.id] ?? 0;
      const togetherCount = link.to.numLinks;
      const jaccardSimilarity =
        togetherCount / (leftCount + rightCount - togetherCount);
      return {
        itemType: "weightedLink" as const,
        from: link.from.id,
        to: link.to.id,
        weight: jaccardSimilarity,
        reference: 0,
        linkCount: link.to.numLinks,
      };
    }),
    ...Object.entries(groupedLinks)
      .map(([type, typeLinks]) => {
        const leftLinks = rawLinksByLeftType[type] ?? [];

        const groupedByRight = groupBy(typeLinks, (l) => l.to.id);

        return Object.entries(groupedByRight).map(([toId, links]) => {
          const leftSum = sumBy(leftLinks, (l) =>
            l.to.id === toId ? l.to.numLinks : 0
          );

          // Average jaccard similarity
          const typeCount = entityTypeCounts[type] ?? 1;
          const rightCount = rightEntityCounts[toId] ?? 1;
          const togetherCount = sumBy(links, (l) => l.to.numLinks);
          const jaccardSimilarity =
            togetherCount / (typeCount + rightCount - togetherCount);

          return {
            itemType: "weightedLink" as const,
            from: type,
            to: toId,
            weight: jaccardSimilarity,
            reference: 0,
            linkCount: leftSum,
          };
        });
      })
      .flat(),
  ];

  const leftItems: LeftItem[] = [
    ...notGroupedLeft.map((e) => {
      const togetherCount = e.numLinks;
      const rightLinksCount = sumBy(
        rawLinksByLeftId[e.id] ?? [],
        (l) => l.to.numLinks
      );
      const rightCount = rightLinksCount + togetherCount;
      const leftCount = totalFirstDegreeCounts;
      const jaccardSimilarity =
        togetherCount / (leftCount + rightCount - togetherCount);
      // console.log(
      //   e.id,
      //   togetherCount,
      //   leftCount,
      //   rightCount,
      //   jaccardSimilarity
      // );
      return {
        itemType: "entity" as const,
        id: e.id,
        type: e.type,
        name: e.name,
        linkCount: e.numLinks,
        isHidden: false && e.numLinks > HIDE_LINKS_THRESHOLD,
        jaccardSimilarity: jaccardSimilarity * (rightLinksCount === 0 ? 0 : 1),
      };
    }),
    ...Object.entries(groupBy(groupedLeft, (item) => item.type)).map(
      ([type, leftItems]) => {
        const togetherCount = sumBy(leftItems, (e) => e.numLinks);
        // Right count the number of links connected to the grouped entity
        const rightCount =
          sumBy(
            linkItems.filter((l) => l.from === type),
            (l) => l.linkCount
          ) + togetherCount;
        const leftCount = totalFirstDegreeCounts;
        const jaccardSimilarity =
          togetherCount / (leftCount + rightCount - togetherCount);

        const leftLinks = rawLinksByLeftType[type] ?? [];
        const totalLinkCount = sumBy(leftLinks, (e) => e.to.numLinks);

        // console.log(
        //   type,
        //   togetherCount,
        //   leftCount,
        //   rightCount,
        //   jaccardSimilarity
        // );
        return {
          itemType: "group" as const,
          id: type,
          type: type,
          linkCount: sumBy(leftItems, (e) => e.numLinks),
          entityCount: leftItems.length,
          jaccardSimilarity:
            Math.max(
              ...leftItems.map((item) => jaccardSimsMap[item.id]?.sim ?? 0)
            ) * (totalLinkCount === 0 ? 0 : 1),
        };
      }
    ),
  ];

  // Get top N right items
  const linksPerRight = mapValues(
    groupBy(rawLinks, (l) => l.to.id),
    (links) => sumBy(links, (l) => l.to.numLinks)
  );

  // Left item total counts per entity type

  // const leftEntitySims = rawLeft.map((e) => ({
  //   id: e.id,
  //   sim: (leftEntityCounts[e.id] ?? 0) / (entityTypeCounts[e.type] ?? 1),
  // }));

  const linkItemsByRight = groupBy(rawLinks, (l) => l.to.id);

  const rightItems: RightItem[] = Object.entries(linkItemsByRight).map(
    ([id, linkItems]) => {
      const theEntity = rawLinks.find((e) => e.to.id === id)!;

      const leftLinks = groupBy(linkItems, (l) => l.from.id);
      const scores: number[] = [];
      for (const [leftId, links] of Object.entries(leftLinks)) {
        const leftFirstLinkCount = leftEntityFirstLinkCounts[leftId] ?? 0;
        const leftCount = (leftEntityCounts[leftId] ?? 0) + leftFirstLinkCount;
        const rightCount = rightEntityCounts[id] ?? 0;
        const seenTogetherCount = sumBy(links, (l) => l.to.numLinks);
        const jaccardSimilarity =
          seenTogetherCount / (leftCount + rightCount - seenTogetherCount);

        const firstJaccardSimilarity =
          leftFirstLinkCount /
          (leftCount + totalFirstDegreeCounts - leftFirstLinkCount);

        scores.push(jaccardSimilarity * firstJaccardSimilarity);
      }

      return {
        itemType: "entity" as const,
        id: id,
        name: theEntity.to.name,
        type: theEntity.to.type,
        linkCount: linksPerRight[id] ?? 0,
        similarityIndex: sum(scores),
      };
    }
  );

  const avgWeight =
    rightItems.reduce((acc, item) => acc + item.similarityIndex, 0) /
    rightItems.length;
  const stdDev = Math.sqrt(
    rightItems.reduce(
      (acc, item) => acc + Math.pow(item.similarityIndex - avgWeight, 2),
      0
    ) / rightItems.length
  );

  const outlierThreshold = avgWeight + 3 * stdDev;

  // const initialShouldNotGroupRightItem = (item: RightItem, idx: number) => {
  //   return item.similarityIndex > outlierThreshold && idx < RIGHT_LIMIT;
  // }
  // const initialGroupedRightItems = rightItems.filter(
  //   (item, idx) => !initialShouldNotGroupRightItem(item, idx)
  // );

  // const initialGroupedRightItems =

  const rightItemNumUniqueEntities = mapValues(
    groupBy(rawLinks, (l) => l.to.id),
    (links) => uniqBy(links, (l) => l.from.id).length
  );
  const medianUniqueEntities =
    Object.values(rightItemNumUniqueEntities).sort()[
      Math.floor(Object.values(rightItemNumUniqueEntities).length / 2)
    ] ?? 0;
  const averageUniqueEntities =
    sum(Object.values(rightItemNumUniqueEntities)) /
    Object.values(rightItemNumUniqueEntities).length;

  // Calculate how many unique entitties are in each fromKey group
  const ogUniqueRight = mapValues(
    groupBy(linkItems, (link) => link.to),
    (links) => {
      const fromIds = links.map((link) => link.from).sort();
      let weight = 0;
      for (const link of links) {
        weight += link.weight;
      }
      return {
        fromIds: fromIds,
        fromKey: fromIds.toString(),
        weight: weight / links.length,
        links,
      };
    }
  );
  // const fromKeyCounts = mapValues(
  //   groupBy(Object.values(ogUniqueRight), (link) => link.fromKey),
  //   (links) => links.length
  // );

  const shouldNotGroupRightItem = (item: RightItem, idx: number) => {
    const uniqueEntities = rightItemNumUniqueEntities[item.id] ?? 0;

    const fromKey = ogUniqueRight[item.id]?.fromKey ?? "";
    // const fromKeyCount = fromKeyCounts[fromKey] ?? 0;
    // if (fromKeyCount < 5) {
    //   return true;
    // }

    return (
      // item.similarityIndex > outlierThreshold &&
      // uniqueEntities > averageUniqueEntities &&
      item.similarityIndex > 0.001 && idx < RIGHT_LIMIT
    );
    // return idx < RIGHT_LIMIT;
  };
  const sortedRightItems = rightItems.sort(
    (a, b) => b.similarityIndex - a.similarityIndex
  );

  // const topWeight = sortedRightItems[0]?.similarityIndex ?? 0;
  // const prefilteredRightItems = sortedRightItems.filter(
  //   (item) => true || item.similarityIndex > topWeight * 0.01
  // );
  const singleRightItems = sortedRightItems.filter(shouldNotGroupRightItem);
  const groupedRightItems = sortedRightItems.filter(
    (item, idx) => !shouldNotGroupRightItem(item, idx)
  );

  const rightItemsSet = new Set(singleRightItems.map((item) => item.id));

  const linksToSet = linkItems.filter((link) => rightItemsSet.has(link.to));
  const linksOutsideSet = linkItems.filter(
    (link) => !rightItemsSet.has(link.to)
  );

  const uniqueRightItems = Object.values(
    mapValues(
      groupBy(linksOutsideSet, (link) => link.to),
      (links) => {
        const fromIds = links.map((link) => link.from).sort();
        let weight = 0;
        for (const link of links) {
          weight += link.weight;
        }
        return {
          fromIds: fromIds,
          fromKey: fromIds.toString(),
          weight: weight / links.length,
          links,
        };
      }
    )
  );

  const groupedUniqueRightItems = groupBy(
    uniqueRightItems,
    (link) => link.fromKey
  );

  const groupedLinksOutsideSet: Record<string, WeightedLink[]> = mapValues(
    groupedUniqueRightItems,
    (rightItems, fromKey) => {
      const fromIds = rightItems[0]!.fromIds;
      return fromIds.map((fromId) => ({
        itemType: "weightedLink" as const,
        from: fromId,
        to: `grouped_${fromKey}`,
        weight: 0.000000000001,
        reference: 0,
        linkCount: sumBy(
          rightItems.flatMap((r) => r.links).filter((l) => l.from === fromId),
          (l) => l.linkCount
        ),
      }));
    }
  );

  const entityCount = groupedRightItems.length;

  // Calculate groupItems, grouping groupedRightItems by the left side items that link to them
  const groupItems: RightGroup[] = Object.entries(groupedUniqueRightItems)
    .map(([fromKey, items]) => {
      const weight = sumBy(items, (item) => item.weight);
      const linkCount = sumBy(items, (item) =>
        sumBy(item.links, (l) => l.linkCount)
      );

      const uniqueEntityIds = uniq(
        items.flatMap((item) => item.links.map((l) => l.to))
      );
      return {
        itemType: "group" as const,
        type: "",
        id: `grouped_${fromKey}`,
        name: `From (${weight} entities)`,
        linkCount: linkCount,
        entityCount: items.length,
        similarityIndex: 0,
        fromIds: items[0]!.fromIds,
        entities:
          uniqueEntityIds.length < 10
            ? uniqueEntityIds.map((entId) => {
                const theEntity = rawLinks.find((e) => e.to.id === entId)!;
                return {
                  itemType: "entity" as const,
                  id: entId,
                  name: theEntity.to.name,
                  type: theEntity.to.type,
                  linkCount: linksPerRight[entId] ?? 0,
                  similarityIndex: 0,
                };
              })
            : [],
      };
    })
    .sort((a, b) => b.fromIds.length - a.fromIds.length);

  const finalRightItems = [
    ...singleRightItems,
    ...(entityCount > 0 ? groupItems : []),
  ];

  // Normalize similarity index to be between 0 and 1
  const maxSim = Math.max(
    ...finalRightItems.map((item) => item.similarityIndex)
  );
  finalRightItems.forEach((item) => {
    item.similarityIndex = item.similarityIndex / maxSim;
  });

  // Normalize weight to be between 0 and 1

  const allLinks = [
    ...linksToSet,
    ...(entityCount > 0 ? Object.values(groupedLinksOutsideSet).flat() : []),
  ];
  const maxWeight = Math.max(...allLinks.map((link) => link.weight));
  allLinks.forEach((link) => {
    link.weight = Math.max(link.weight / maxWeight, 0.15);
  });

  // Sort left items by average weight of links
  const allLinksByLeft = groupBy(allLinks, (link) => link.from);
  const leftItemWeights = mapValues(
    allLinksByLeft,
    (links) => sumBy(links, (link) => link.weight) / links.length
  );

  const sortedLeftItems = leftItems.sort(
    (a, b) => b.jaccardSimilarity - a.jaccardSimilarity
  );

  const ret = {
    left: sortedLeftItems,
    right: finalRightItems,
    links: allLinks,
  };
  return ret;
};
