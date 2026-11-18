import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageHeader } from "./PageHeader";

describe("PageHeader", () => {
  it("renders the title as the page heading", () => {
    render(<PageHeader title="動画管理" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "動画管理" })
    ).toHaveClass("text-title", "font-bold");
  });

  it("renders the description and actions when given", () => {
    render(
      <PageHeader
        actions={<button type="button">追加</button>}
        description="動画の一覧です。"
        title="動画管理"
      />
    );

    expect(screen.getByText("動画の一覧です。")).toHaveClass("text-muted");
    expect(screen.getByRole("button", { name: "追加" })).toBeInTheDocument();
  });

  it("leaves out the actions container without actions", () => {
    const { container } = render(<PageHeader title="動画管理" />);

    expect(container.firstElementChild?.childElementCount).toBe(1);
  });
});
