export interface EntityData {
  id: string;
  type: string;
  name: string;
}
export type Link = {
  from: string;
  to: string;
};

// for v2

export type GroupedEntityData = {
  type: string;
  count: number;
};

export type Side = {
  entities: EntityData[];
  grouped: GroupedEntityData[];
};
