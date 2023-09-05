type Entity = {
  id: string;
  name: string;
  type?: string;
  data?: string;
};

export function getEntityName(entity: Entity) {
  return entity.name;
}

export function RenderEntity(props: {
  entity: {
    id: string;
    name: string;
    type?: string;
    data?: string;
  };
}) {
  const { entity } = props;

  switch (entity.type) {
    default: {
      return (
        <a className="underline" href={`/entity/${entity.id}`}>
          {entity.type}: {getEntityName(entity)}
        </a>
      );
    }
  }
}
