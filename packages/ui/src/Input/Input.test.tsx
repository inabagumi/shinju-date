import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { Input, type InputProps } from "./Input";

const BASE_CLASSES = [
  "w-full",
  "rounded-control",
  "border",
  "bg-surface",
  "text-foreground",
  "transition-colors",
  "placeholder:text-muted",
  "disabled:cursor-not-allowed",
  "disabled:opacity-50",
];

describe("Input", () => {
  it("renders a text field the user can type in", async () => {
    const user = userEvent.setup();

    render(<Input aria-label="件名" />);

    const input = screen.getByRole("textbox", { name: "件名" });

    await user.type(input, "お知らせ");

    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveValue("お知らせ");
  });

  it.each<[NonNullable<InputProps["variant"]>, string[], string[]]>([
    ["default", ["border-border", "field-focus-ring"], ["border-danger"]],
    [
      "danger",
      ["border-danger", "field-focus-ring-danger"],
      ["border-border", "field-focus-ring"],
    ],
  ])("uses the classes of the %s variant", (variant, classes, absent) => {
    render(<Input aria-label="件名" variant={variant} />);

    const input = screen.getByRole("textbox", { name: "件名" });

    expect(input).toHaveClass(...BASE_CLASSES, ...classes);
    expect(input).not.toHaveClass(...absent);
  });

  it.each<[NonNullable<InputProps["inputSize"]>, string[]]>([
    ["sm", ["px-3", "py-1"]],
    ["md", ["px-4", "py-2"]],
    ["lg", ["px-4", "py-3"]],
  ])("uses the padding of the %s size", (inputSize, classes) => {
    render(<Input aria-label="件名" inputSize={inputSize} />);

    expect(screen.getByRole("textbox", { name: "件名" })).toHaveClass(
      ...BASE_CLASSES,
      ...classes,
      // iOS の Safari が拡大しないように、どの大きさでも 16px にする
      "text-body",
      "leading-normal"
    );
  });

  it("keeps the given type", () => {
    render(<Input aria-label="メールアドレス" type="email" />);

    expect(
      screen.getByRole("textbox", { name: "メールアドレス" })
    ).toHaveAttribute("type", "email");
  });

  it("forwards the ref to the input element", () => {
    const ref = createRef<HTMLInputElement>();

    render(<Input aria-label="件名" ref={ref} />);

    expect(ref.current).toBe(screen.getByRole("textbox", { name: "件名" }));
  });

  it("lets className win over the default classes", () => {
    render(<Input aria-label="件名" className="px-2" />);

    const input = screen.getByRole("textbox", { name: "件名" });

    expect(input).toHaveClass("px-2", "py-2");
    expect(input).not.toHaveClass("px-4");
  });
});
