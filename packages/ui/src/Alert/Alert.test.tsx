import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Alert, type AlertTone } from "./Alert";

describe("Alert", () => {
  it("renders only the body by default", () => {
    const { container } = render(<Alert>同期できません。</Alert>);

    expect(screen.getByRole("status")).toHaveTextContent("同期できません。");
    expect(container.firstElementChild?.childElementCount).toBe(1);
  });

  it("renders the title and the action when given", () => {
    render(
      <Alert
        action={<a href="/system">履歴を確認する</a>}
        title="削除された動画"
      >
        この動画は削除されています。
      </Alert>
    );

    expect(screen.getByText("削除された動画")).toHaveClass("font-semibold");
    expect(screen.getByRole("link", { name: "履歴を確認する" })).toBeVisible();
  });

  it.each<[AlertTone, string, string]>([
    ["danger", "alert", "bg-danger/10"],
    ["warning", "alert", "bg-warning/10"],
    ["success", "status", "bg-success/10"],
    ["neutral", "status", "bg-muted"],
  ])("uses the %s tone with the %s role", (tone, role, background) => {
    render(<Alert tone={tone}>本文</Alert>);

    const alert = screen.getByRole(role);

    expect(alert).toHaveClass(background, "text-foreground");
    expect(alert.className).not.toMatch(/\btext-(?:danger|success|warning)\b/);
  });

  it("lets the role be overridden", () => {
    render(
      <Alert aria-label="失敗したアカウント" role="region" tone="danger">
        本文
      </Alert>
    );

    expect(
      screen.getByRole("region", { name: "失敗したアカウント" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("merges the given class names", () => {
    render(<Alert className="mb-6">本文</Alert>);

    expect(screen.getByRole("status")).toHaveClass("mb-6", "p-4");
  });
});
