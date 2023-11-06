import { formatDistance, formatRelative } from "date-fns";
import { api } from "../../utils/api";
import { RenderCodeHash } from "./RenderCodeHash";

export function RenderBacktest(props: { backtestId: bigint }) {
  const { backtestId } = props;

  const { data: backtestData } = api.backtests.get.useQuery({
    id: backtestId,
  });

  if (!backtestData) {
    return null;
  }
  return (
    <div>
      <div className="flex justify-between">
        <span className="font-bold">{backtestData.message}</span>{" "}
        <span className="italic text-muted-foreground">
          {formatDistance(backtestData.createdAt, Date.now(), {
            addSuffix: true,
          })}{" "}
        </span>
      </div>
      <div className="h-2"></div>
      <div className="flex items-center">
        {backtestData?.eventHandler && (
          <RenderCodeHash size="xs" hashHex={backtestData.eventHandler.hash} />
        )}
      </div>
    </div>
  );
}
