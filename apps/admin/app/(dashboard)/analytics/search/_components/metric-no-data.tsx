interface Props {
  description: string
}

/**
 * Neutral placeholder for a metric that has nothing to measure against
 * (e.g. no session was recorded in the period). It deliberately carries no
 * rating so that "no data" is not mistaken for a low score.
 */
export function MetricNoData({ description }: Props) {
  return (
    <div className="rounded-lg border-2 border-border bg-muted p-6 text-center">
      <div aria-hidden="true" className="text-4xl font-bold text-muted">
        —
      </div>
      <div className="mt-2 text-meta font-semibold text-foreground">
        データなし
      </div>
      <p className="mt-1 text-meta text-muted">{description}</p>
    </div>
  )
}
