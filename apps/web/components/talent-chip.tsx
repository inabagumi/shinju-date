import type { ReactNode } from 'react'

/** チップの「外す」に使うボタンやリンクのクラス */
export const TALENT_CHIP_REMOVE_CLASS_NAME =
  'inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

interface TalentChipProps {
  /** 「外す」のボタンやリンク */
  children: ReactNode
  name: string
}

/**
 * 選んでいるタレントのチップ。リストの項目（`li`）として使う。
 */
export default function TalentChip({ children, name }: TalentChipProps) {
  return (
    <li className="inline-flex h-8 max-w-full items-center gap-1 rounded-full border border-border pr-1 pl-3 text-meta text-foreground">
      <span className="truncate">{name}</span>
      {children}
    </li>
  )
}
