/**
 * The fixtures of the tests. A line that ends with `// report` must be
 * reported, and the other lines must not.
 */

const REPORT_MARKER = "// report";

export const TIME_ZONE_FIXTURE = `import { TIME_ZONE } from '@shinju-date/constants'

export const a = 'Asia/Tokyo' // report
export const b = "Asia/Tokyo" // report
export const c = \`Asia/Tokyo\` // report
export const d = \`\${TIME_ZONE}\`
export const e = '2026-01-01T00:00:00+09:00[Asia/Tokyo]' // report
export const f = <time data-time-zone="Asia/Tokyo" /> // report
export const g = Temporal.Now.zonedDateTimeISO(TIME_ZONE)
// Asia/Tokyo in a comment is not reported
export const h = 'Europe/London'
`;

export const TAILWIND_FIXTURE = `import { cva } from 'class-variance-authority'
import { twMerge } from '@shinju-date/ui'

export const a = <div className="text-sm rounded-md" /> // report
export const b = <div className="dark:bg-black" /> // report
export const c = <div class="shadow-lg" /> // report
export const d = <div className={'text-base'} /> // report
export const e = <div className={\`flex \${x} rounded-xl\`} /> // report
export const f = <div className={cond ? 'p-2' : 'hover:shadow-md'} /> // report
export const g = twMerge('flex', cond && 'sm:text-sm') // report
export const h = twMerge('text-lg/7') // report
export const i = twMerge('md:dark:text-white') // report
export const j = twMerge('rounded') // report
export const k = twMerge('shadow') // report
export const l = twMerge('rounded-t-lg') // report
export const m = twMerge('text-2xl') // report
export const n = twMerge('text-sm!') // report
export const o = twMerge('!text-sm') // report
export const p = cva('rounded-lg') // report
export const q = cva('p-2', {
  variants: {
    size: {
      md: 'p-4',
      sm: 'text-xs', // report
    },
  },
})
export const r = <div className="text-body rounded-control shadow-overlay" />
export const s = <div className="rounded-full rounded-none shadow-none" />
export const t = <div className="text-meta text-caption rounded-t-container" />
export const u = <div className="text-muted bg-surface hover:text-foreground" />
export const v = twMerge('text-title', cond && 'sm:text-display')
export const w = cva('rounded-container', { variants: { size: { sm: 'p-2' } } })
export const x = <div data-class="text-sm" title="dark:" />
export const y = 'text-sm rounded-md shadow-lg dark:bg-black'
export const z = format('text-sm')
`;

/** The lines (1-based) that end with the report marker */
export function getReportedLines(source: string): number[] {
  return source
    .split("\n")
    .flatMap((line, index) =>
      line.trimEnd().endsWith(REPORT_MARKER) ? [index + 1] : []
    );
}
