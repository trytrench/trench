export interface EntityData {
  id: string;
  type: string;
  name: string;
  count?: number;
}
export type Link = {
  from: string;
  to: string;
  weight?: number;
};

// for v2

export type DisplayEntityData = {
  id: string;
  name: string;
  type: string;
  linkCount: number;
};

export type DisplayLink = {
  from: string;
  to: string;
  weight: number;
};

//
