import { twMerge } from "@shinju-date/ui";
import type { MDXComponents } from "mdx/types";
import NextLink from "next/link";
import type { LinkProps } from "next/link";
import type { ComponentPropsWithoutRef } from "react";

const Link = ({
  children,
  className,
  href,
  onMouseEnter,
  onTouchStart,
  onClick,
  ...props
}: ComponentPropsWithoutRef<"a">) => {
  const linkClassName = twMerge(
    "text-accent underline underline-offset-2 hover:decoration-2",
    className
  );

  if (href?.startsWith("/")) {
    const linkProps: Partial<LinkProps> = {};

    if (typeof onMouseEnter === "function") {
      linkProps.onMouseEnter = onMouseEnter;
    }

    if (typeof onTouchStart === "function") {
      linkProps.onTouchStart = onTouchStart;
    }

    if (typeof onClick === "function") {
      linkProps.onClick = onClick;
    }

    return (
      <NextLink className={linkClassName} href={href} {...props} {...linkProps}>
        {children}
      </NextLink>
    );
  }

  return (
    <a className={linkClassName} href={href} {...props}>
      {children}
    </a>
  );
};

/**
 * 文書ページ（とは・利用規約・プライバシーポリシー）の本文の要素。
 * 文字サイズは docs/design-guidelines.md の役割ごとの組み合わせに合わせる。
 */
const documentComponents: MDXComponents = {
  a: Link,
  h2: ({ className, ...props }) => (
    <h2
      className={twMerge(
        "mt-12 mb-4 text-heading font-bold first:mt-0",
        className
      )}
      {...props}
    />
  ),
  h3: ({ className, ...props }) => (
    <h3
      className={twMerge(
        "mt-8 mb-2 text-body leading-normal font-semibold first:mt-0",
        className
      )}
      {...props}
    />
  ),
  hr: ({ className, ...props }) => (
    <hr className={twMerge("my-12 border-border", className)} {...props} />
  ),
  li: ({ className, ...props }) => (
    <li className={twMerge("pl-1", className)} {...props} />
  ),
  ol: ({ className, ...props }) => (
    <ol
      className={twMerge("my-4 list-decimal space-y-2 pl-6", className)}
      {...props}
    />
  ),
  p: ({ className, ...props }) => (
    <p className={twMerge("my-4", className)} {...props} />
  ),
  strong: ({ className, ...props }) => (
    <strong className={twMerge("font-bold", className)} {...props} />
  ),
  ul: ({ className, ...props }) => (
    <ul
      className={twMerge("my-4 list-disc space-y-2 pl-6", className)}
      {...props}
    />
  ),
};

export const useMDXComponents = (components: MDXComponents): MDXComponents => ({
  ...documentComponents,
  ...components,
});
