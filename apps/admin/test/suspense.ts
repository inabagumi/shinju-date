import {
  isValidElement,
  type ReactElement,
  type ReactNode,
  Suspense,
} from 'react'

/**
 * サーバーコンポーネントの戻り値をたどり、最初の `<Suspense>` の子を返す。
 * ページが Suspense の中で描く部品を、レンダリングせずに取り出すために使う
 */
export function findSuspenseChildren(node: ReactNode): unknown {
  if (!isValidElement(node)) {
    return undefined
  }

  const { children } = (node as ReactElement<{ children?: ReactNode }>).props

  if (node.type === Suspense) {
    return children
  }

  for (const child of Array.isArray(children) ? children : [children]) {
    const found = findSuspenseChildren(child)

    if (found !== undefined) {
      return found
    }
  }

  return undefined
}

/**
 * 非同期のサーバーコンポーネントの要素を、関数として呼んで実行する
 */
export async function runServerComponent(element: unknown): Promise<ReactNode> {
  if (!isValidElement(element) || typeof element.type !== 'function') {
    throw new Error('The element is not a function component.')
  }

  const component = element.type as (props: unknown) => Promise<ReactNode>

  return component(element.props)
}
