import { isValidElement, Suspense } from "react";
import type { ReactElement, ReactNode } from "react";

/**
 * サーバーコンポーネントの戻り値をたどり、最初の `<Suspense>` の子を返す。
 * ページが Suspense の中で描く部品を、レンダリングせずに取り出すために使う
 */
export function findSuspenseChildren(node: ReactNode): unknown {
  if (!isValidElement(node)) {
    return undefined;
  }

  const { children } = (node as ReactElement<{ children?: ReactNode }>).props;

  if (node.type === Suspense) {
    return children;
  }

  for (const child of Array.isArray(children) ? children : [children]) {
    const found = findSuspenseChildren(child);

    if (found !== undefined) {
      return found;
    }
  }

  return undefined;
}

/**
 * サーバーコンポーネントの戻り値をたどり、すべての `<Suspense>` の子を、
 * 現れた順に返す。`children` だけでなく、ほかの props（`PageHeader` の
 * `description` など）に渡した要素もたどる
 */
export function findAllSuspenseChildren(node: ReactNode): unknown[] {
  if (Array.isArray(node)) {
    return node.flatMap((child: ReactNode) => findAllSuspenseChildren(child));
  }

  if (!isValidElement(node)) {
    return [];
  }

  const props = node.props as { children?: ReactNode } & Record<
    string,
    unknown
  >;

  if (node.type === Suspense) {
    return [props.children];
  }

  return Object.values(props).flatMap((value) =>
    findAllSuspenseChildren(value as ReactNode)
  );
}

/**
 * 非同期のサーバーコンポーネントの要素を、関数として呼んで実行する
 */
export async function runServerComponent(element: unknown): Promise<ReactNode> {
  if (!isValidElement(element) || typeof element.type !== "function") {
    throw new Error("The element is not a function component.");
  }

  const component = element.type as (props: unknown) => Promise<ReactNode>;

  return component(element.props);
}
