'use client'

import * as Sentry from '@sentry/nextjs'
import { Button } from '@shinju-date/ui'
import { AlertTriangle } from 'lucide-react'
import { catchError, type ErrorInfo } from 'next/error'
import { useEffect } from 'react'
import { Panel } from './panel'

interface WidgetErrorBoundaryProps {
  /** Kept on the fallback so that links to the widget still land on it */
  id?: string
  /** The heading of the widget, shown in place of it when it fails */
  title: string
}

interface WidgetErrorFallbackProps extends WidgetErrorBoundaryProps {
  error: unknown
  retry: () => void
}

/**
 * Takes the place of a widget whose data could not be loaded. The heading
 * stays, so that admins can tell which widget failed.
 */
export function WidgetErrorFallback({
  error,
  id,
  retry,
  title,
}: WidgetErrorFallbackProps) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <Panel id={id} role="alert" title={title}>
      <div className="space-y-4">
        <p className="flex items-start gap-2 text-body text-danger">
          <AlertTriangle aria-hidden="true" className="mt-1 size-4 shrink-0" />
          読み込めませんでした。時間をおいて再試行してください。
        </p>
        <Button onClick={() => retry()} size="sm" variant="secondary">
          再試行
        </Button>
      </div>
    </Panel>
  )
}

function renderFallback(
  props: WidgetErrorBoundaryProps,
  { error, retry }: ErrorInfo,
) {
  return <WidgetErrorFallback {...props} error={error} retry={retry} />
}

/**
 * Keeps an error thrown by one widget inside that widget, so that the rest
 * of the page keeps showing. Put it outside the widget's `<Suspense>`.
 */
export const WidgetErrorBoundary = catchError(renderFallback)
