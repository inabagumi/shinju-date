import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FeedbackFormState } from "../_lib/actions";
import { FeedbackForm } from "./feedback-form";

const { submitFeedback } = vi.hoisted(() => ({
  submitFeedback:
    vi.fn<
      (prevState: unknown, formData: FormData) => Promise<FeedbackFormState>
    >(),
}));

vi.mock(import("../_lib/actions"), () => ({ submitFeedback }));

const getMessageTextarea = () =>
  screen.getByLabelText(/機能要望/u) as HTMLTextAreaElement;

const submitMessage = async (container: HTMLElement, message: string) => {
  fireEvent.change(getMessageTextarea(), { target: { value: message } });

  // Returning a promise makes `act` wait for the submission as well
  await act(() => {
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);

    return Promise.resolve();
  });
};

describe(FeedbackForm, () => {
  beforeEach(() => {
    submitFeedback.mockReset();
  });

  it("keeps the entered message when the submission fails", async () => {
    submitFeedback.mockImplementation((_, formData) =>
      Promise.resolve({
        error: "送信中にエラーが発生しました。",
        success: false,
        values: { message: String(formData.get("message")) },
      })
    );

    const { container } = render(<FeedbackForm />);

    await submitMessage(container, "検索機能がほしい");

    expect(screen.getByText("送信中にエラーが発生しました。")).toBeVisible();
    expect(getMessageTextarea().value).toBe("検索機能がほしい");
  });

  it("clears the message when the submission succeeds", async () => {
    submitFeedback.mockResolvedValue({
      message: "機能要望を受け付けました。ありがとうございます。",
      success: true,
    });

    const { container } = render(<FeedbackForm />);

    await submitMessage(container, "検索機能がほしい");

    expect(
      screen.getByText("機能要望を受け付けました。ありがとうございます。")
    ).toBeVisible();
    expect(getMessageTextarea().value).toBe("");
  });
});
