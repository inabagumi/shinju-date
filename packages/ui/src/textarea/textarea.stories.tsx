import preview from "#.storybook/preview";

import { Input } from "../input/input";
import { Textarea } from "./textarea";

const meta = preview.meta({
  argTypes: {
    disabled: {
      control: "boolean",
    },
    inputSize: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
    variant: {
      control: "select",
      options: ["default", "danger"],
    },
  },
  component: Textarea,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  title: "Components/Textarea",
});

export const Default = meta.story({
  args: {
    placeholder: "Enter text...",
    rows: 4,
    variant: "default",
  },
});

export const WithValue = meta.story({
  args: {
    rows: 4,
    value:
      "This is a sample text content in a textarea. You can edit this text.",
    variant: "default",
  },
});

export const ErrorState = meta.story({
  args: {
    placeholder: "Enter text...",
    rows: 4,
    value: "This content has an error",
    variant: "danger",
  },
});

export const Disabled = meta.story({
  args: {
    disabled: true,
    placeholder: "Disabled textarea",
    rows: 4,
  },
});

export const ManyRows = meta.story({
  args: {
    placeholder: "Textarea with many rows",
    rows: 8,
  },
});

export const FewRows = meta.story({
  args: {
    placeholder: "Textarea with few rows",
    rows: 2,
  },
});

export const Sizes = meta.story({
  render: () => (
    <div className="flex w-96 flex-col gap-4">
      <Textarea inputSize="sm" placeholder="Small" rows={2} />
      <Textarea inputSize="md" placeholder="Medium (default)" rows={2} />
      <Textarea inputSize="lg" placeholder="Large" rows={2} />
    </div>
  ),
});

/** `Input` と並べ、余白・枠・角丸が同じであることを確かめる */
export const WithInput = meta.story({
  render: () => (
    <div className="flex w-96 flex-col gap-4">
      <Input placeholder="Input" />
      <Textarea placeholder="Textarea" rows={3} />
      <Input placeholder="Input (danger)" variant="danger" />
      <Textarea placeholder="Textarea (danger)" rows={3} variant="danger" />
    </div>
  ),
});

export const WithLabel = meta.story({
  args: {
    placeholder: "Enter your feedback",
    rows: 5,
  },
  render: (args) => (
    <div className="flex w-96 flex-col gap-2">
      <label className="text-meta font-medium" htmlFor="textarea-with-label">
        Feedback
      </label>
      <Textarea {...args} id="textarea-with-label" />
    </div>
  ),
});

export const WithErrorMessage = meta.story({
  args: {
    rows: 4,
    value: "Too short",
    variant: "danger",
  },
  render: (args) => (
    <div className="flex w-96 flex-col gap-2">
      <label className="text-meta font-medium" htmlFor="textarea-error">
        Description
      </label>
      <Textarea {...args} id="textarea-error" />
      <p className="text-meta text-danger">
        Description must be at least 20 characters long
      </p>
    </div>
  ),
});

export const WithCounter = meta.story({
  args: {
    maxLength: 200,
    placeholder: "Enter up to 200 characters",
    rows: 5,
  },
  render: (args) => {
    const value = args.value as string | undefined;
    const count = value?.length || 0;
    const maxLength = args.maxLength || 0;

    return (
      <div className="flex w-96 flex-col gap-2">
        <label className="text-meta font-medium" htmlFor="textarea-counter">
          Comment
        </label>
        <Textarea {...args} id="textarea-counter" />
        <p className="text-right text-meta text-muted">
          {count}/{maxLength}
        </p>
      </div>
    );
  },
});
