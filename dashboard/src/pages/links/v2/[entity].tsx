import { Navbar } from "~/components/Navbar";
import {
  Title,
  Text,
  Badge,
  BadgeProps,
  Select,
  SelectItem,
  NumberInput,
} from "@tremor/react";
import { useEffect, useState } from "react";
import { api } from "~/utils/api";
import { useRouter } from "next/router";
import { dummyUserLabels } from "../dummy";
import LinksView from "~/components/LinksView";

function LinksPage() {
  // wait for the page to load before showing the view, since
  // useLayoutEffect in LinksView does not play well with SSR
  const [viewShown, setViewShown] = useState(false);
  useEffect(() => {
    setViewShown(true);
  }, []);

  const [leftFilter, setLeftFilter] = useState("");

  const router = useRouter();
  const entityId = router.query.entity as string | undefined;

  const { data } = api.links.relatedEntities.useQuery(
    {
      id: entityId ?? "",
    },
    { enabled: !!entityId }
  );
  const { data: entityInfo } = api.links.entityInfo.useQuery(
    {
      id: entityId ?? "",
    },
    { enabled: !!entityId }
  );

  const leftSide = data?.leftSide ?? [];
  const rightSide = data?.rightSide ?? [];
  const links = data?.links ?? [];

  const leftSideTypes = [...new Set(leftSide.map((item) => item.type))];

  // const leftSide = dummyLeft;
  // const rightSide = dummyRight;
  // const links = dummyLinks;
  // const entityInfo = dummyUser;
  const labels = dummyUserLabels;

  return (
    <div className="min-h-full bg-white absolute inset-0 overflow-auto py-0">
      <div className="p-8">
        <div className="mb-8">
          <Text className="font-semibold">{entityInfo?.type}</Text>
          <Title className="mb-2 font-bold">{entityInfo?.name ?? ""}</Title>
          <div className="flex flex-wrap gap-1">
            {labels.map((label) => (
              <Badge
                key={label.value}
                color={label.color as BadgeProps["color"]}
              >
                {label.value}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex justify-between mb-2">
          <div className="flex justify-between gap-2 mb-1 w-[24rem]">
            <div>
              <Text className="font-semibold">Entity Type</Text>
              <Select value={leftFilter} onValueChange={setLeftFilter}>
                <SelectItem value="">Any</SelectItem>
                <>
                  {leftSideTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </>
              </Select>
            </div>
            <div>
              <Text className="font-semibold">Limit</Text>
              <NumberInput />
            </div>
          </div>
          <div className="flex justify-between gap-2 mb-1 w-[24rem]">
            <div>
              <Text className="font-semibold">Limit</Text>
              <NumberInput />
            </div>
          </div>
        </div>

        {viewShown && (
          <LinksView
            data={{
              left: leftSide,
              right: rightSide,
              links: links,
              entityInfo,
              entityLabels: labels,
            }}
            leftTypeFilter={leftFilter}
            onLeftTypeFilterChange={setLeftFilter}
          />
        )}
      </div>
    </div>
  );
}

function Page() {
  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      <div className="grow overflow-hidden relative">
        <LinksPage />
      </div>
    </div>
  );
}

export default Page;
