import clsx from 'clsx'
import React, { DetailedHTMLProps, FC, HTMLAttributes } from 'react'

type Props = DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>

const Row: FC<Props> = ({ children, className }) => (
  <div className={clsx('row', className)}>{children}</div>
)

export default Row
