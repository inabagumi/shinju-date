import { useState } from 'react'
import preview from '#.storybook/preview'
import { Button } from '../Button/Button'
import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from './Toast'

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
    layout: 'centered',
  },
  tags: ['autodocs'],
  title: 'Components/Toast',
})

export const Success = meta.story({
  render: () => {
    const [open, setOpen] = useState(false)

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
    )
  },
})

export const Destructive = meta.story({
  render: () => {
    const [open, setOpen] = useState(false)

    return (
      <>
        <Button onClick={() => setOpen(true)} variant="danger">
          Show Error Toast
        </Button>
        <Toast
          duration={5000}
          onOpenChange={setOpen}
          open={open}
          variant="destructive"
        >
          <ToastTitle>操作に失敗しました。</ToastTitle>
          <ToastClose />
        </Toast>
      </>
    )
  },
})

export const Default = meta.story({
  render: () => {
    const [open, setOpen] = useState(false)

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
    )
  },
})

export const WithDescription = meta.story({
  render: () => {
    const [open, setOpen] = useState(false)

    return (
      <>
        <Button onClick={() => setOpen(true)}>
          Show Toast with Description
        </Button>
        <Toast
          duration={5000}
          onOpenChange={setOpen}
          open={open}
          variant="success"
        >
          <div className="grid gap-1">
            <ToastTitle>動画を同期しました</ToastTitle>
            <ToastDescription>
              YouTubeから最新の情報を取得しました。
            </ToastDescription>
          </div>
          <ToastClose />
        </Toast>
      </>
    )
  },
})

export const WithAction = meta.story({
  render: () => {
    const [open, setOpen] = useState(false)

    return (
      <>
        <Button onClick={() => setOpen(true)} variant="secondary">
          Show Toast with Action
        </Button>
        <Toast duration={10000} onOpenChange={setOpen} open={open}>
          <div className="grid gap-1">
            <ToastTitle>変更が保存されました</ToastTitle>
            <ToastDescription>設定の変更を保存しました。</ToastDescription>
          </div>
          <ToastAction
            altText="元に戻す"
            onClick={() => {
              console.log('Undo action')
            }}
          >
            元に戻す
          </ToastAction>
          <ToastClose />
        </Toast>
      </>
    )
  },
})
