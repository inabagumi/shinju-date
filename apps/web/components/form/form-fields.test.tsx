import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { InputField, SelectField, TextareaField } from "./form-fields";

describe("form fields", () => {
  it("InputField passes required to the input", () => {
    render(<InputField label="メールアドレス" name="email" required />);

    expect(screen.getByLabelText(/メールアドレス/u)).toBeRequired();
  });

  it("TextareaField passes required to the textarea", () => {
    render(<TextareaField label="機能要望" name="message" required />);

    expect(screen.getByLabelText(/機能要望/u)).toBeRequired();
  });

  it("SelectField passes required to the select", () => {
    render(
      <SelectField label="お問い合わせ種別" name="type" required>
        <option value="">選択してください</option>
      </SelectField>
    );

    expect(screen.getByLabelText(/お問い合わせ種別/u)).toBeRequired();
  });

  it("fields are not required by default", () => {
    render(<TextareaField label="機能要望" name="message" />);

    expect(screen.getByLabelText("機能要望")).not.toBeRequired();
  });

  it("associates the error message with the field", () => {
    render(
      <TextareaField
        error="機能要望を入力してください"
        label="機能要望"
        name="message"
        required
      />
    );

    const textarea = screen.getByLabelText(/機能要望/u);

    expect(textarea).toBeInvalid();
    expect(textarea).toHaveAccessibleDescription("機能要望を入力してください");
  });
});
