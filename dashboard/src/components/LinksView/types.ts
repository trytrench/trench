// Query output

import { Entity } from "event-processing";

export type EntityWithName = Entity & {
  name: string;
  numLinks: number;
};

export type RawLeft = {
  id: string;
  type: string;
  name: string;
}[];
export type RawLinks = {
  from_id: string;
  from_type: string;
  to_id: string;
  to_type: string;
  to_name: string;
}[];

// Left

export type LeftEntity = {
  itemType: "entity";
  id: string;
  type: string;
  linkCount: number;
  name: string;
  isHidden: boolean;
  jaccardSimilarity: number;
};

export type LeftGroup = {
  itemType: "group";
  id: string;
  type: string;
  linkCount: number;
  entityCount: number;
  jaccardSimilarity: number;
};

export type LeftItem = LeftEntity | LeftGroup;

// Links

export type SingleLink = {
  itemType: "link";
  from: string;
  to: string;
};

export type HiddenLink = {
  itemType: "hiddenLink";
  from: string;
  to: string;
};

export type WeightedLink = {
  itemType: "weightedLink";
  from: string;
  to: string;
  weight: number;
  reference: number;
  linkCount: number;
};

export type LinkItem = SingleLink | HiddenLink | WeightedLink;

// Right

export type RightEntity = {
  itemType: "entity";
  id: string;
  name: string;
  type: string;
  linkCount: number;
  similarityIndex: number;
};

export type RightGroup = {
  itemType: "group";
  id: string;
  name: string;
  type: string;
  linkCount: number;
  entityCount: number;
  similarityIndex: number;
  fromIds: string[];
  entities: RightEntity[];
};

export type RightItem = RightEntity | RightGroup;
