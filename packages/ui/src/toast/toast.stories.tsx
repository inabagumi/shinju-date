import { useState } from "react";

import preview from "#.storybook/preview";

import { Button } from "../button/button";
import {
  Toast,
  ToastClose,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "./toast";

const meta = preview.meta({
  component: Toast,
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
        <ToastViewport />
      </ToastProvider>
    ),
  ],
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  title: "Components/Toast",
});

const SuccessToastDemo = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Show Success Toast</Button>
      <Toast
        duration={5000}
        onOpenChange={setOpen}
        open={open}
        variant="success"
      >
        <ToastTitle>動画を表示に変更しました。</ToastTitle>
        <ToastClose />
      </Toast>
    </>
  );
};

export const Success = meta.story({
  render: () => <SuccessToastDemo />,
});

const DangerToastDemo = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="danger">
        Show Error Toast
      </Button>
      <Toast
        duration={5000}
        onOpenChange={setOpen}
        open={open}
        variant="danger"
      >
        <ToastTitle>操作に失敗しました。</ToastTitle>
        <ToastClose />
      </Toast>
    </>
  );
};

export const Danger = meta.story({
  render: () => <DangerToastDemo />,
});

const WarningToastDemo = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="secondary">
        Show Warning Toast
      </Button>
      <Toast
        duration={5000}
        onOpenChange={setOpen}
        open={open}
        variant="warning"
      >
        <ToastTitle>一部の動画は更新できませんでした。</ToastTitle>
        <ToastClose />
      </Toast>
    </>
  );
};

export const Warning = meta.story({
  render: () => <WarningToastDemo />,
});

const DefaultToastDemo = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="secondary">
        Show Default Toast
      </Button>
      <Toast duration={5000} onOpenChange={setOpen} open={open}>
        <ToastTitle>通知メッセージ</ToastTitle>
        <ToastClose />
      </Toast>
    </>
  );
};

export const Default = meta.story({
  render: () => <DefaultToastDemo />,
});
