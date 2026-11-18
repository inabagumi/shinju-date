import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ContactFormState } from "../_lib/actions";

const { submitContactForm } = vi.hoisted(() => ({
  submitContactForm:
    vi.fn<
      (prevState: unknown, formData: FormData) => Promise<ContactFormState>
    >(),
}));

vi.mock(import("../_lib/actions"), () => ({ submitContactForm }));

import { ContactForm } from "./contact-form";

function failWithSubmittedValues() {
  submitContactForm.mockImplementation(async (_, formData) => ({
    error: "送信中にエラーが発生しました。",
    success: false,
    values: Object.fromEntries(
      [...formData].filter(
        (entry): entry is [string, string] => typeof entry[1] === "string"
      )
    ),
  }));
}

function getTypeSelect() {
  return screen.getByLabelText(/お問い合わせ種別/) as HTMLSelectElement;
}

function getNameInput() {
  return screen.getByLabelText("お名前（任意）") as HTMLInputElement;
}

function getReplyCheckbox() {
  return screen.getByLabelText("返信を希望する") as HTMLInputElement;
}

function queryEmailInput() {
  return screen.queryByLabelText(/メールアドレス/) as HTMLInputElement | null;
}

function getMessageTextarea() {
  return screen.getByLabelText(/お問い合わせ内容/) as HTMLTextAreaElement;
}

/** The values of the fields, with `email` undefined when it is not shown. */
function getFormValues() {
  return {
    email: queryEmailInput()?.value,
    message: getMessageTextarea().value,
    name: getNameInput().value,
    type: getTypeSelect().value,
    wantsReply: getReplyCheckbox().checked,
  };
}

function fillForm() {
  fireEvent.change(getTypeSelect(), { target: { value: "bug" } });
  fireEvent.change(getNameInput(), { target: { value: "山田花子" } });
  fireEvent.click(getReplyCheckbox());
  fireEvent.change(queryEmailInput() as HTMLInputElement, {
    target: { value: "hanako@example.com" },
  });
  fireEvent.change(getMessageTextarea(), {
    target: { value: "動画が表示されません" },
  });
}

async function submit(container: HTMLElement) {
  await act(async () => {
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);
  });
}

describe(ContactForm, () => {
  beforeEach(() => {
    submitContactForm.mockReset();
  });

  it("keeps the entered values when the submission fails", async () => {
    failWithSubmittedValues();

    const { container } = render(<ContactForm />);

    fillForm();
    await submit(container);

    expect(screen.getByText("送信中にエラーが発生しました。")).toBeVisible();
    expect(getFormValues()).toStrictEqual({
      email: "hanako@example.com",
      message: "動画が表示されません",
      name: "山田花子",
      type: "bug",
      wantsReply: true,
    });
  });

  it("keeps the values changed after a failed submission", async () => {
    failWithSubmittedValues();

    const { container } = render(<ContactForm />);

    fillForm();
    await submit(container);

    fireEvent.change(getTypeSelect(), { target: { value: "other" } });
    fireEvent.click(getReplyCheckbox());
    await submit(container);

    expect(getTypeSelect().value).toBe("other");
    expect(getReplyCheckbox().checked).toBeFalsy();
    expect(queryEmailInput()).toBeNull();
    expect(getMessageTextarea().value).toBe("動画が表示されません");
  });

  it("clears the form when the submission succeeds", async () => {
    submitContactForm.mockResolvedValue({
      message: "お問い合わせを受け付けました。ありがとうございます。",
      success: true,
    });

    const { container } = render(<ContactForm />);

    fillForm();
    await submit(container);

    expect(
      screen.getByText("お問い合わせを受け付けました。ありがとうございます。")
    ).toBeVisible();
    expect(queryEmailInput()).toBeNull();
    expect(getFormValues()).toStrictEqual({
      email: undefined,
      message: "",
      name: "",
      type: "",
      wantsReply: false,
    });
  });
});
