import type { ESTree } from "@oxlint/plugins";

/**
 * Returns the text of a string literal (including the value of a JSX
 * attribute) or a chunk of a template literal, or `null` when the node is not
 * a string.
 */
export const getStringValue = (node: ESTree.Node): string | null => {
  if (node.type === "Literal") {
    return typeof node.value === "string" ? node.value : null;
  }

  if (node.type === "TemplateElement") {
    return node.value.cooked ?? node.value.raw;
  }

  return null;
};
