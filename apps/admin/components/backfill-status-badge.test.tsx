import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BackfillStatusBadge } from "./backfill-status-badge";

describe("BackfillStatusBadge", () => {
  it.each([
    ["pending", "待機中"],
    ["running", "取り込み中"],
    ["done", "完了"],
    ["failed", "失敗"],
    ["interrupted", "中断"],
  ] as const)("labels %s as %s", (status, label) => {
    render(<BackfillStatusBadge status={status} />);

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("tells that an account was never backfilled", () => {
    render(<BackfillStatusBadge status={null} />);

    expect(screen.getByText("未実行")).toBeInTheDocument();
  });
});
