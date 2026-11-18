import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./Button/Button";
import { Input } from "./Input/Input";
import { MultiSelect } from "./MultiSelect/MultiSelect";
import type { MultiSelectProps } from "./MultiSelect/MultiSelect";
import { Select } from "./Select/Select";
import { Textarea } from "./Textarea/Textarea";
import { ToastClose, ToastProvider } from "./Toast/Toast";

describe("focus styles", () => {
  it("gives buttons the focus ring", () => {
    render(<Button>保存</Button>);

    expect(screen.getByRole("button")).toHaveClass("focus-ring");
  });

  it("gives the toast close button the focus ring", () => {
    render(
      <ToastProvider>
        <ToastClose aria-label="閉じる" />
      </ToastProvider>
    );

    expect(screen.getByRole("button")).toHaveClass("focus-ring");
  });

  it("gives every field the same focus ring", () => {
    render(
      <>
        <Input aria-label="入力欄" />
        <Select aria-label="セレクトボックス">
          <option>選択肢</option>
        </Select>
        <Textarea aria-label="複数行の入力欄" />
        <MultiSelect
          onChange={vi.fn<MultiSelectProps["onChange"]>()}
          options={[]}
          value={[]}
        />
      </>
    );

    for (const field of [
      screen.getByRole("textbox", { name: "入力欄" }),
      screen.getByRole("combobox", { name: "セレクトボックス" }),
      screen.getByRole("textbox", { name: "複数行の入力欄" }),
      screen.getByRole("button"),
    ]) {
      expect(field).toHaveClass("field-focus-ring");
      expect(field.className).not.toMatch(/\bfocus:ring-/);
    }
  });

  it("switches the field focus ring to danger for errors", () => {
    render(
      <>
        <Input aria-label="入力欄" variant="danger" />
        <Select aria-label="セレクトボックス" variant="danger">
          <option>選択肢</option>
        </Select>
        <Textarea aria-label="複数行の入力欄" variant="danger" />
      </>
    );

    for (const field of [
      screen.getByRole("textbox", { name: "入力欄" }),
      screen.getByRole("combobox", { name: "セレクトボックス" }),
      screen.getByRole("textbox", { name: "複数行の入力欄" }),
    ]) {
      expect(field).toHaveClass("field-focus-ring-danger");
      expect(field).not.toHaveClass("field-focus-ring");
    }
  });
});
