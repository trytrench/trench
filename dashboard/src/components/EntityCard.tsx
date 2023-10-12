import { Box, SimpleGrid } from "@chakra-ui/react";
import { Badge, Card, Text, Title } from "@tremor/react";
import { format } from "date-fns";
import Link from "next/link";
import { type RouterOutputs } from "~/utils/api";

interface Props {
  entity: RouterOutputs["lists"]["getEntitiesList"]["rows"][number];
  relation?: string;
  datasetId: string;
}

export const EntityCard = ({ entity, relation, datasetId }: Props) => {
  const entityFeatures = entity.features ?? {};

  const entityLabels = entity.labels.filter((v) => v !== "") ?? [];

  return (
    <Card>
      <div className="">
        <Link href={`/datasets/${datasetId}/entity/${entity.id}`}>
          <div className="flex">
            <Title className="text-sm">
              {entity.type}: {entity.name}
            </Title>
            {relation && <Badge className="ml-2 self-center">{relation}</Badge>}
          </div>
        </Link>
        {entity.lastSeenAt && (
          <Text>
            Last seen:{" "}
            {format(new Date(entity.lastSeenAt), "MMM d, yyyy h:mm a")}
          </Text>
        )}
        <div className="flex flex-wrap gap-1 mt-3">
          {entityLabels.length > 0 ? (
            entityLabels.map((label) => {
              return (
                <Badge key={label} size="xs">
                  {label}
                </Badge>
              );
            })
          ) : (
            <Badge color="neutral">No labels</Badge>
          )}
        </div>
        <div className="h-4"></div>
        <div className="grid grid-cols-5 gap-x-8 gap-y-4">
          {Object.entries(entityFeatures).map(([key, value], idx) => (
            <Box key={key}>
              <Text className="font-semibold">{key}</Text>
              <Text className="truncate">
                {value === 0
                  ? "0"
                  : value === true
                  ? "True"
                  : value === false
                  ? "False"
                  : (value as string) || "-"}
              </Text>
            </Box>
          ))}
        </div>
      </div>
    </Card>
  );
};
