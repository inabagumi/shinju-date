import type { ESTree, Rule } from "@oxlint/plugins";

const CACHE_FUNCTIONS = new Set(["cacheLife", "cacheTag"]);

const BLANK_LINE_PATTERN = /\n[ \t]*\r?\n/u;

const LINE_BREAK_PATTERN = /\r?\n/u;

type Statement = ESTree.Directive | ESTree.Statement;

/**
 * Whether the statement is a `'use cache'` directive (including
 * `'use cache: remote'` and `'use cache: private'`)
 */
const isCacheDirective = (statement: Statement): boolean =>
  statement.type === "ExpressionStatement" &&
  statement.expression.type === "Literal" &&
  typeof statement.expression.value === "string" &&
  statement.expression.value.startsWith("use cache");

/** Whether the statement is a call of `cacheLife()` or `cacheTag()` */
const isCacheFunctionCall = (statement: Statement): boolean => {
  if (statement.type !== "ExpressionStatement") {
    return false;
  }

  const { expression } = statement;

  return (
    expression.type === "CallExpression" &&
    expression.callee.type === "Identifier" &&
    CACHE_FUNCTIONS.has(expression.callee.name)
  );
};

/**
 * Reports the statement that follows a `'use cache'` directive, or a run of
 * `cacheLife()` and `cacheTag()` calls, without a blank line (AGENTS.md の
 * 「キャッシュのディレクティブ」). Nothing is required when the directive or
 * the run ends the block. A comment between them does not count as a blank
 * line.
 *
 * The fix adds a line break at the end of the line where the directive or the
 * run ends, so that a comment after it stays on its line.
 */
export const cacheDirectiveBlankLine = {
  create(context) {
    const { sourceCode } = context;

    const requireBlankLine = (
      statement: Statement,
      next: Statement,
      messageId: "cacheFunctions" | "directive"
    ) => {
      const between = sourceCode.text.slice(statement.end, next.start);

      if (BLANK_LINE_PATTERN.test(between)) {
        return;
      }

      const lineBreak = LINE_BREAK_PATTERN.exec(between);

      context.report({
        fix: (fixer) => {
          if (!lineBreak) {
            return fixer.insertTextAfter(statement, "\n\n");
          }

          const position = statement.end + lineBreak.index;

          return fixer.insertTextAfterRange([position, position], lineBreak[0]);
        },
        messageId,
        node: next,
      });
    };

    const checkStatements = (statements: readonly Statement[]) => {
      for (const [index, statement] of statements.entries()) {
        const next = statements[index + 1];

        if (!next) {
          break;
        }

        if (isCacheDirective(statement)) {
          requireBlankLine(statement, next, "directive");
        } else if (
          isCacheFunctionCall(statement) &&
          !isCacheFunctionCall(next)
        ) {
          requireBlankLine(statement, next, "cacheFunctions");
        }
      }
    };

    return {
      BlockStatement: (node) => checkStatements(node.body),
      Program: (node) => checkStatements(node.body),
      StaticBlock: (node) => checkStatements(node.body),
      SwitchCase: (node) => checkStatements(node.consequent),
      TSModuleBlock: (node) => checkStatements(node.body),
    };
  },
  meta: {
    docs: {
      description:
        "Require a blank line after 'use cache' and after cacheLife() and cacheTag()",
    },
    fixable: "whitespace",
    messages: {
      cacheFunctions:
        "cacheLife() と cacheTag() の並びの後に空行を入れてください。AGENTS.md の「キャッシュのディレクティブ」を参照。",
      directive:
        "'use cache' のディレクティブの後に空行を入れてください。AGENTS.md の「キャッシュのディレクティブ」を参照。",
    },
    type: "layout",
  },
} satisfies Rule;
