import { SimpleManipulator, type SqrlEntity } from "sqrl";

type Entity = {
  id: string;
  type: string;
};

const EXCLUDED_ENTITIES = ["RateLimit", "Counter", "UniqueCounter"];

export class SqrlManipulator extends SimpleManipulator {
  public entities: Entity[] = [];

  trackEntity(entity: SqrlEntity) {
    if (!EXCLUDED_ENTITIES.includes(entity.type)) {
      this.entities.push({
        id: entity.entityId.key,
        type: entity.type,
      });
    }
  }
}
