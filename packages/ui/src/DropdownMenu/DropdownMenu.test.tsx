import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./DropdownMenu";

function renderMenu({
  onEdit = vi.fn<() => void>(),
  onDelete = vi.fn<() => void>(),
}: {
  onEdit?: () => void;
  onDelete?: () => void;
} = {}) {
  render(
    <>
      <button type="button">メニューの外</button>
      <DropdownMenu>
        <DropdownMenuTrigger aria-label="操作">︙</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem asChild>
            <a href="https://example.com/">外部で見る</a>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onEdit}>編集</DropdownMenuItem>
          <DropdownMenuItem disabled>複製</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onDelete} variant="danger">
            削除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );

  return { onDelete, onEdit };
}

describe("<DropdownMenu>", () => {
  it("opens with the trigger", async () => {
    const user = userEvent.setup();

    renderMenu();

    const trigger = screen.getByRole("button", { name: "操作" });

    expect({
      expanded: trigger.getAttribute("aria-expanded"),
      haspopup: trigger.getAttribute("aria-haspopup"),
    }).toStrictEqual({ expanded: "false", haspopup: "menu" });
    expect(trigger).toHaveClass("rounded-control", "focus-ring");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    await user.click(trigger);

    const menu = screen.getByRole("menu");

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(menu).toHaveClass(
      "rounded-container",
      "border-border",
      "bg-surface",
      "shadow-overlay"
    );
  });

  it("animates opening and closing from the side of the trigger", async () => {
    const user = userEvent.setup();

    renderMenu();

    await user.click(screen.getByRole("button", { name: "操作" }));

    const menu = screen.getByRole("menu");

    expect(menu).toHaveAttribute("data-state", "open");
    expect(menu).toHaveClass(
      "origin-(--radix-dropdown-menu-content-transform-origin)",
      "motion-safe:data-[state=open]:animate-scale-in",
      "motion-safe:data-[state=closed]:animate-scale-out"
    );
  });

  it("moves between the items with the arrow keys and skips disabled ones", async () => {
    const user = userEvent.setup();

    renderMenu();

    screen.getByRole("button", { name: "操作" }).focus();
    await user.keyboard("{Enter}");

    const link = screen.getByRole("menuitem", { name: "外部で見る" });
    const edit = screen.getByRole("menuitem", { name: "編集" });
    const remove = screen.getByRole("menuitem", { name: "削除" });

    expect(link).toHaveFocus();

    await user.keyboard("{ArrowDown}");

    expect(edit).toHaveFocus();
    expect(edit).toHaveAttribute("data-highlighted");

    // 無効な「複製」を飛ばす
    await user.keyboard("{ArrowDown}");

    expect(remove).toHaveFocus();

    await user.keyboard("{ArrowUp}");

    expect(edit).toHaveFocus();
  });

  it("moves to the item by typing its first character", async () => {
    const user = userEvent.setup();

    renderMenu();

    screen.getByRole("button", { name: "操作" }).focus();
    await user.keyboard("{Enter}");
    await user.keyboard("削");

    expect(screen.getByRole("menuitem", { name: "削除" })).toHaveFocus();
  });

  it("runs the item with the Enter key and returns the focus to the trigger", async () => {
    const user = userEvent.setup();
    const { onDelete, onEdit } = renderMenu();

    const trigger = screen.getByRole("button", { name: "操作" });

    trigger.focus();
    await user.keyboard("{Enter}");
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{Enter}");

    expect(onEdit).toHaveBeenCalledOnce();
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes with the Escape key and returns the focus to the trigger", async () => {
    const user = userEvent.setup();
    const { onEdit } = renderMenu();

    const trigger = screen.getByRole("button", { name: "操作" });

    await user.click(trigger);
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(onEdit).not.toHaveBeenCalled();
  });

  it("closes when clicking outside", async () => {
    // 開いている間は外側の要素が `pointer-events: none` になるため、検査を外す
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    renderMenu();

    await user.click(screen.getByRole("button", { name: "操作" }));
    await user.click(screen.getByText("メニューの外"));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("runs the item with a click", async () => {
    const user = userEvent.setup();
    const { onDelete } = renderMenu();

    await user.click(screen.getByRole("button", { name: "操作" }));
    await user.click(screen.getByRole("menuitem", { name: "削除" }));

    expect(onDelete).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("renders the child link as an item", async () => {
    const user = userEvent.setup();

    renderMenu();

    await user.click(screen.getByRole("button", { name: "操作" }));

    const link = screen.getByRole("menuitem", { name: "外部で見る" });

    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "https://example.com/");
    expect(link).toHaveClass("rounded-control", "text-meta", "leading-5");
  });

  it("styles the items by their variant", async () => {
    const user = userEvent.setup();

    renderMenu();

    await user.click(screen.getByRole("button", { name: "操作" }));

    expect(screen.getByRole("menuitem", { name: "編集" })).toHaveClass(
      "text-foreground"
    );
    expect(screen.getByRole("menuitem", { name: "削除" })).toHaveClass(
      "text-danger"
    );
    expect(screen.getByRole("menuitem", { name: "複製" })).toHaveAttribute(
      "aria-disabled",
      "true"
    );
    expect(screen.getByRole("separator")).toHaveClass("bg-border");
  });

  it("keeps the look of the child when the trigger uses asChild", () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger asChild className="custom">
          <button className="own" type="button">
            データ管理
          </button>
        </DropdownMenuTrigger>
      </DropdownMenu>
    );

    const trigger = screen.getByRole("button", { name: "データ管理" });

    expect(trigger).toHaveClass("own", "custom");
    expect(trigger).not.toHaveClass("text-muted");
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
  });
});
