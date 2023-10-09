import {
  SimpleManipulator,
  type WhenCause,
  type SqrlEntity,
  type Execution,
} from "sqrl";

type Entity = {
  id: string;
  type: string;
  relation: string;
};

type EntityLabel = {
  label: string;
  labelType: string;
  entityId: string;
  entityType: string;
  action: "add" | "remove";
  cause: WhenCause;
};

type EntityFeature = {
  entityId: string;
  name: string;
  value: string;
};

type EventLabel = {
  type: string;
  label: string;
  cause: WhenCause;
};

type EventFeature = {
  name: string;
  value: string;
};

function getEntityTypeAndIdFromString(entityId: string) {
  const idArr = entityId.split("/");
  const typeStr = idArr[0] ?? "";
  const id = idArr.slice(1).join("/");

  const typeArr = typeStr.split("::");
  const type = typeArr[0] ?? "";
  const relation = typeArr[1] ?? "";

  return { type, relation, id };
}
function getEntityTypeAndId(entity: SqrlEntity) {
  return getEntityTypeAndIdFromString(entity.entityId.getIdString());
}

const EXCLUDED_ENTITIES = ["RateLimit", "Counter", "UniqueCounter"];

export class SqrlManipulator extends SimpleManipulator {
  public entities: Entity[] = [];
  public entityLabels: EntityLabel[] = [];
  public eventLabels: EventLabel[] = [];
  public entityFeatures: EntityFeature[] = [];
  public eventFeatures: EventFeature[] = [];

  trackEntity(entity: SqrlEntity) {
    const { id, type, relation } = getEntityTypeAndId(entity);

    if (!EXCLUDED_ENTITIES.includes(type)) {
      this.entities.push({
        id,
        type,
        relation,
      });
    }
  }

  addEventFeature(name: string, value: string) {
    this.eventFeatures.push({ name, value });
  }

  addEntityFeature(entity: SqrlEntity, name: string, value: string) {
    const { id } = getEntityTypeAndId(entity);

    this.entityFeatures.push({
      entityId: id,
      name,
      value,
    });
  }

  addEntityLabel(
    cause: WhenCause,
    entity: SqrlEntity,
    labelType: string,
    label: string
  ) {
    const { id, type } = getEntityTypeAndId(entity);

    this.entityLabels.push({
      action: "add",
      label,
      labelType,
      entityId: id,
      entityType: type,
      cause,
    });
  }

  removeEntityLabel(
    cause: WhenCause,
    entity: SqrlEntity,
    labelType: string,
    label: string
  ) {
    const { id, type } = getEntityTypeAndId(entity);

    this.entityLabels.push({
      action: "remove",
      label,
      labelType,
      entityId: id,
      entityType: type,
      cause,
    });
  }

  addEventLabel(type: string, label: string, cause: WhenCause) {
    this.eventLabels.push({ type, label, cause });
  }
}
