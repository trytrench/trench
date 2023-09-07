import { api } from "../utils/api";
import { Badge, BarList, Card, List, ListItem, Title } from "@tremor/react";
import { useEntityFilters, useEventFilters } from "./Filters";
import { type FindTopEntitiesArgs } from "../shared/validation";
import { RenderName } from "./RenderEntityName";

export function TopList(props: {
  title: string;
  entityTitle: string;
  countTitle: string;
  args: FindTopEntitiesArgs;
}) {
  const { title, entityTitle, countTitle, args } = props;

  const eventFilters = useEventFilters(args.eventFilters);
  const entityFilters = useEntityFilters(args.entityFilters);

  const { data } = api.entities.findTop.useQuery(
    {
      ...args,
      eventFilters,
      entityFilters,
    },
    {
      enabled: true,
      keepPreviousData: false,
    }
  );

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <Card className="">
      <Title className="shrink-0">{title}</Title>
      <div className="h-4"></div>
      <BarList
        data={data.map((row, idx) => ({
          key: idx.toString(),
          name: row.name,
          value: row.count,
          href: `/entity/${row.id}`,
        }))}
      />
    </Card>
  );
}
