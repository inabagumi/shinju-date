import clsx from 'clsx'
import React, { AnchorHTMLAttributes, HTMLAttributes } from 'react'

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { as: 'a' }
type DivProps = HTMLAttributes<HTMLDivElement> & { as?: 'div' }

function Card(linkProps: LinkProps): JSX.Element
function Card(buttonProps: DivProps): JSX.Element
function Card(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { className, as: Component = 'div', ...props }: any
): JSX.Element {
  return <Component className={clsx('card', className)} {...props} />
}

export default Card
