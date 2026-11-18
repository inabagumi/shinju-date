"use client";

import {
  Toast,
  ToastClose,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@shinju-date/ui";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

/** トーストの色。`Toast` のバリアントの名前と同じにし、そのまま渡す */
export type ActionToastType = "success" | "warning" | "danger";

export type ShowActionToast = (type: ActionToastType, text: string) => void;

interface ActionToastMessage {
  /** 同じ文言が続いても別のトーストとして出せるよう、表示のたびに変える */
  id: number;
  open: boolean;
  text: string;
  type: ActionToastType;
}

interface ActionToastContextValue {
  showToast: ShowActionToast;
}

const ActionToastContext = createContext<ActionToastContextValue | null>(null);

interface ActionToastProps {
  message: ActionToastMessage;
  onOpenChange: (open: boolean) => void;
}

/** 操作の結果を知らせるトースト1件。`ActionToastProvider` だけが描く */
function ActionToast({ message, onOpenChange }: ActionToastProps) {
  return (
    <Toast
      duration={5000}
      onOpenChange={onOpenChange}
      open={message.open}
      variant={message.type}
    >
      <ToastTitle className="whitespace-pre-line">{message.text}</ToastTitle>
      <ToastClose />
    </Toast>
  );
}

interface ActionToastProviderProps {
  children: ReactNode;
}

/**
 * 操作の結果を知らせるトーストを、画面に1か所だけ描く。ルートのレイアウトに置き、
 * 各部品は `useActionToast()` の `showToast` で知らせる。
 */
export function ActionToastProvider({ children }: ActionToastProviderProps) {
  const [messages, setMessages] = useState<ActionToastMessage[]>([]);
  const nextId = useRef(0);

  const showToast = useCallback<ShowActionToast>((type, text) => {
    nextId.current += 1;
    const id = nextId.current;

    // 閉じたトーストは、閉じるアニメーションのために残しておき、次に出すときに消す
    setMessages((prev) => [
      ...prev.filter((message) => message.open),
      { id, open: true, text, type },
    ]);
  }, []);

  const close = (id: number) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === id ? { ...message, open: false } : message
      )
    );
  };

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ActionToastContext value={value}>
      <ToastProvider>
        {children}
        {messages.map((message) => (
          <ActionToast
            key={message.id}
            message={message}
            onOpenChange={(open) => {
              if (!open) {
                close(message.id);
              }
            }}
          />
        ))}
        <ToastViewport />
      </ToastProvider>
    </ActionToastContext>
  );
}

/**
 * 操作の結果をトーストで知らせる関数を返す。`ActionToastProvider` の中で使う。
 */
export function useActionToast(): ActionToastContextValue {
  const context = useContext(ActionToastContext);

  if (!context) {
    throw new Error(
      "useActionToast must be used within an ActionToastProvider."
    );
  }

  return context;
}
