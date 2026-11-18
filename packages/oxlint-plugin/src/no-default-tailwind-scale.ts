import type { ESTree, Rule } from "@oxlint/plugins";

import { getStringValue } from "./strings.ts";

/** The JSX attributes whose values are class names */
const CLASS_ATTRIBUTES = new Set(["class", "className"]);

/** The functions whose arguments are class names */
const CLASS_FUNCTIONS = new Set(["cva", "twMerge"]);

/**
 * The class names that are not allowed. Each pattern is matched against one
 * class name, so that `sm:text-sm` and `hover:shadow-md`, which have
 * variants, and `text-sm!` and `!text-sm`, which are important, are also
 * reported.
 */
const DENIED_CLASS_PATTERNS = [
  // 文字サイズ（text-xs から text-9xl。text-sm/6 のような行の高さ付きを含む）
  /^(?:\S*:)?!?text-(?:xs|sm|base|lg|[2-9]?xl)(?:\/\S*)?!?$/u,
  // 角丸（rounded、rounded-md、rounded-t-lg など。rounded-none と rounded-full は除く）
  /^(?:\S*:)?!?rounded(?:-(?:s|e|t|r|b|l|ss|se|ee|es|tl|tr|br|bl))?(?:-(?:xs|sm|md|lg|[2-4]?xl))?!?$/u,
  // 影（shadow、shadow-sm、shadow-lg など。shadow-none は除く）
  /^(?:\S*:)?!?shadow(?:-(?:2xs|xs|sm|md|lg|2?xl))?!?$/u,
  // dark: のバリアント（md:dark:bg-black のように、ほかのバリアントの後ろも含む）
  /(?:^|:)dark:/u,
];

const hasDeniedClass = (value: string): boolean =>
  value
    .split(/\s+/u)
    .some((className) =>
      DENIED_CLASS_PATTERNS.some((pattern) => pattern.test(className))
    );

const getAttributeName = (node: ESTree.JSXAttribute): string =>
  node.name.type === "JSXIdentifier"
    ? node.name.name
    : `${node.name.namespace.name}:${node.name.name.name}`;

/**
 * Whether the node is in the value of `class` or `className`, or in the
 * arguments of `twMerge()` or `cva()`.
 */
const isInClassNames = (node: ESTree.Node): boolean => {
  let child: ESTree.Node = node;

  for (let parent = node.parent; parent; parent = parent.parent) {
    if (
      parent.type === "JSXAttribute" &&
      CLASS_ATTRIBUTES.has(getAttributeName(parent))
    ) {
      return true;
    }

    if (
      parent.type === "CallExpression" &&
      parent.callee.type === "Identifier" &&
      CLASS_FUNCTIONS.has(parent.callee.name) &&
      parent.callee !== child
    ) {
      return true;
    }

    child = parent;
  }

  return false;
};

/**
 * Reports the default font sizes, border radii and shadows of Tailwind and
 * the `dark:` variant (docs/design-guidelines.md). Checks the strings in the
 * values of `class` and `className`, and in the arguments of `twMerge()` and
 * `cva()`.
 */
export const noDefaultTailwindScale = {
  create(context) {
    const check = (node: ESTree.Node) => {
      const value = getStringValue(node);

      if (value !== null && hasDeniedClass(value) && isInClassNames(node)) {
        context.report({ messageId: "defaultTailwindScale", node });
      }
    };

    return {
      Literal: check,
      TemplateElement: check,
    };
  },
  meta: {
    docs: {
      description:
        "Use the font sizes, border radii, shadows and semantic colors of theme.css instead of the defaults of Tailwind",
    },
    messages: {
      defaultTailwindScale:
        "Tailwind の既定の文字サイズ（text-sm など）、角丸（rounded-md など）、影（shadow-lg など）と dark: は使わず、text-body、rounded-control、shadow-overlay とセマンティックカラーを使ってください。docs/design-guidelines.md を参照。",
    },
    type: "suggestion",
  },
} satisfies Rule;
