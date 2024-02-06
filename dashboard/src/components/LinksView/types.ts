// Query output

import { Entity } from "event-processing";

export type EntityWithName = Entity & {
  name: string;
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
};

export type LeftGroup = {
  itemType: "group";
  id: string;
  type: string;
  linkCount: number;
  entityCount: number;
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
};

export type LinkItem = SingleLink | HiddenLink | WeightedLink;

// Right

export type RightItem = {
  itemType: "entity";
  id: string;
  name: string;
  type: string;
};
