import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { Input } from "../Input/Input";
import { Textarea } from "./Textarea";

describe("Textarea", () => {
  it("lets the user type multiple lines", async () => {
    const user = userEvent.setup();

    render(<Textarea aria-label="内容" />);

    const textarea = screen.getByRole("textbox", { name: "内容" });

    await user.type(textarea, "1行目{enter}2行目");

    expect(textarea).toHaveValue("1行目\n2行目");
  });

  it.each([
    { inputSize: "sm", variant: "default" },
    { inputSize: "md", variant: "danger" },
    { inputSize: "lg", variant: "danger" },
  ] as const)(
    "shares the classes of Input ($inputSize, $variant)",
    ({ inputSize, variant }) => {
      render(
        <>
          <Input aria-label="件名" inputSize={inputSize} variant={variant} />
          <Textarea aria-label="内容" inputSize={inputSize} variant={variant} />
        </>
      );

      const input = screen.getByRole("textbox", { name: "件名" });
      const textarea = screen.getByRole("textbox", { name: "内容" });

      expect(textarea).toHaveClass(...input.className.split(" "));
      expect(textarea).toHaveClass("block");
    }
  );

  it("merges className and forwards the ref", () => {
    const ref = createRef<HTMLTextAreaElement>();

    render(<Textarea aria-label="内容" className="min-h-32" ref={ref} />);

    const textarea = screen.getByRole("textbox", { name: "内容" });

    expect(textarea).toHaveClass("min-h-32");
    expect(ref.current).toBe(textarea);
  });

  it("lets className win over the default classes", () => {
    render(<Textarea aria-label="内容" className="py-4" />);

    const textarea = screen.getByRole("textbox", { name: "内容" });

    expect(textarea).toHaveClass("px-4", "py-4");
    expect(textarea).not.toHaveClass("py-2");
  });
});
