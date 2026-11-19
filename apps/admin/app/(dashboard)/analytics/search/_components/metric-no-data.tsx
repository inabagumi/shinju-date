import { StatTile } from "@shinju-date/ui";

interface Props {
  description: string;
  /** 指標の名前。値があるときの `StatTile` と同じ位置に表示する */
  label: string;
}

/**
 * Neutral placeholder for a metric that has nothing to measure against
 * (e.g. no session was recorded in the period). It deliberately carries no
 * rating so that "no data" is not mistaken for a low score.
 */
export const MetricNoData = ({ description, label }: Props) => (
  <StatTile
    change={
      <>
        <span className="font-semibold text-foreground">データなし</span>
        <span className="block">{description}</span>
      </>
    }
    label={label}
    value={<span aria-hidden="true">—</span>}
  />
);
