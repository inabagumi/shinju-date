import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./button";
import type { ButtonProps } from "./button";

const BASE_CLASSES = [
  "inline-flex",
  "items-center",
  "justify-center",
  "rounded-control",
  "font-medium",
  "transition-colors",
  "focus-ring",
  "disabled:cursor-not-allowed",
  "disabled:opacity-50",
];

describe(Button, () => {
  it("renders a primary, medium button by default", () => {
    render(<Button>保存</Button>);

    const button = screen.getByRole("button", { name: "保存" });

    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveClass(
      ...BASE_CLASSES,
      "bg-accent",
      "text-accent-foreground",
      "hover:bg-accent/90",
      "px-4",
      "py-2",
      "text-meta",
      "leading-5"
    );
  });

  it.each<[NonNullable<ButtonProps["variant"]>, string[]]>([
    ["primary", ["bg-accent", "text-accent-foreground", "hover:bg-accent/90"]],
    [
      "secondary",
      [
        "border",
        "border-border",
        "bg-surface",
        "text-foreground",
        "hover:bg-muted",
      ],
    ],
    [
      "danger",
      ["border", "border-danger", "text-danger", "hover:bg-danger/10"],
    ],
    ["ghost", ["hover:bg-muted"]],
  ])("uses the classes of the %s variant", (variant, classes) => {
    render(<Button variant={variant}>保存</Button>);

    expect(screen.getByRole("button")).toHaveClass(...BASE_CLASSES, ...classes);
  });

  it.each<[NonNullable<ButtonProps["size"]>, string[]]>([
    ["sm", ["px-3", "py-1", "text-meta", "leading-5"]],
    ["md", ["px-4", "py-2", "text-meta", "leading-5"]],
    ["lg", ["px-6", "py-3", "text-body", "leading-normal"]],
  ])("uses the classes of the %s size", (size, classes) => {
    render(<Button size={size}>保存</Button>);

    expect(screen.getByRole("button")).toHaveClass(...BASE_CLASSES, ...classes);
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn<() => void>();

    render(<Button onClick={onClick}>保存</Button>);

    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not call onClick while disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn<() => void>();

    render(
      <Button disabled onClick={onClick}>
        保存
      </Button>
    );

    const button = screen.getByRole("button", { name: "保存" });

    await user.click(button);

    expect(button).toBeDisabled();
    expect(onClick).not.toHaveBeenCalled();
  });

  it("keeps the given type", () => {
    render(<Button type="submit">送信</Button>);

    expect(screen.getByRole("button", { name: "送信" })).toHaveAttribute(
      "type",
      "submit"
    );
  });

  it("renders the child element with asChild", () => {
    render(
      <Button asChild variant="secondary">
        <a href="/videos">動画の一覧</a>
      </Button>
    );

    const link = screen.getByRole("link", { name: "動画の一覧" });

    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "/videos");
    expect(link).not.toHaveAttribute("type");
    expect(link).toHaveClass(...BASE_CLASSES, "border-border", "bg-surface");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("lets className win over the default classes", () => {
    render(<Button className="px-8">保存</Button>);

    const button = screen.getByRole("button");

    expect(button).toHaveClass("px-8", "py-2");
    expect(button).not.toHaveClass("px-4");
  });
});
