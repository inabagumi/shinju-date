"use client";

import {
  Alert,
  twMerge,
  Button as UIButton,
  type ButtonProps as UIButtonProps,
  Input as UIInput,
  type InputProps as UIInputProps,
  Select as UISelect,
  type SelectProps as UISelectProps,
  Textarea as UITextarea,
  type TextareaProps as UITextareaProps,
} from "@shinju-date/ui";
import {
  type ChangeEventHandler,
  type ComponentPropsWithoutRef,
  createContext,
  Fragment,
  type SubmitEventHandler,
  startTransition,
  useActionState,
  useCallback,
  useContext,
  useId,
  useState,
} from "react";
import { useFormStatus } from "react-dom";

import type { FormState } from "@/lib/action";

export type { FormState };

const FormContext = createContext<FormState>({});

interface FormFieldContextValue {
  id?: string;
  name?: string;
}

const FormFieldContext = createContext<FormFieldContextValue>({});

interface Props extends Omit<ComponentPropsWithoutRef<"form">, "action"> {
  action: (
    currentState: FormState,
    payload: FormData
  ) => FormState | Promise<FormState>;
  initialState?: Awaited<FormState>;
}

/**
 * `useActionState` のアクションを送信するフォーム。
 *
 * `<form action>` に任せると、React はアクションが終わったあとにフォームを
 * リセットする。検証のエラーなどで失敗したときも、セレクトの選択や、
 * `defaultChecked` / `defaultValue` を使う制御されていない入力欄が初期値に
 * 戻り、送り直すと選んだ内容と違う値が送られる。そのため `onSubmit` で送信を
 * 止めて、トランジションの中で自分でアクションを呼び、リセットさせない。
 * 成功したときもリセットしない（`FormDialog` は、閉じて開き直すときに
 * フォームを作り直す）。`useFormStatus` の送信中の判定は、このトランジションの
 * あいだも働く。
 *
 * `action` は、JavaScript を読み込む前に送信されたとき（Server Action の
 * プログレッシブエンハンスメント）のために残す。
 */
export default function Form({
  action,
  children,
  initialState = {},
  noValidate = true,
  onSubmit,
  ...props
}: Props) {
  const [state, formAction] = useActionState(action, initialState);

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
    onSubmit?.(event);

    if (event.defaultPrevented) {
      return;
    }

    event.preventDefault();

    const formData = new FormData(
      event.currentTarget,
      event.nativeEvent.submitter
    );

    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <FormContext.Provider value={state}>
      <form
        action={formAction}
        noValidate={noValidate}
        onSubmit={handleSubmit}
        {...props}
      >
        <FormError />
        {children}
      </form>
    </FormContext.Provider>
  );
}

interface MessageLinesProps {
  messages: string[];
}

function MessageLines({ messages }: MessageLinesProps) {
  return messages.map((message, i) => (
    <Fragment key={message}>
      {i > 0 && <br />}
      {message}
    </Fragment>
  ));
}

/**
 * 項目に結び付かないエラー（`FormState.error` と `errors.generic`）を出す。
 * 置き忘れないよう、`Form` がフォームの先頭に必ず描く。
 */
function FormError() {
  const { error, errors } = useContext(FormContext);
  const messages = [
    ...new Set([...(error ? [error] : []), ...(errors?.["generic"] ?? [])]),
  ];

  return (
    messages.length > 0 && (
      <Alert tone="danger">
        <MessageLines messages={messages} />
      </Alert>
    )
  );
}

type SubmitButtonProps = Omit<UIButtonProps, "asChild">;

export function SubmitButton({
  disabled,
  type = "submit",
  variant = "primary",
  size = "md",
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <UIButton
      disabled={disabled ?? pending}
      size={size}
      type={type}
      variant={variant}
      {...props}
    />
  );
}

interface ErrorMessageProps extends ComponentPropsWithoutRef<"p"> {}

export function ErrorMessage({
  className,
  role = "alert",
  ...props
}: ErrorMessageProps) {
  const { errors } = useContext(FormContext);
  const { id, name } = useContext(FormFieldContext);
  const errorMessages = (name && errors?.[name]) || [];

  return (
    errorMessages.length > 0 && (
      <p
        className={twMerge("mt-1 text-meta text-danger", className)}
        id={id ? `${id}-error-message` : undefined}
        role={role}
        {...props}
      >
        <MessageLines messages={errorMessages} />
      </p>
    )
  );
}

interface FormFieldProps extends ComponentPropsWithoutRef<"div"> {
  name?: string;
}

export function FormField({ name, ...props }: FormFieldProps) {
  const id = useId();

  return (
    <FormFieldContext.Provider
      value={{
        id,
        ...(name ? { name } : {}),
      }}
    >
      <div {...props} />
    </FormFieldContext.Provider>
  );
}

interface SuccessMessageProps extends ComponentPropsWithoutRef<"p"> {
  message?: string;
}

export function SuccessMessage({
  message = "更新が完了しました。",
  role = "status",
  ...props
}: SuccessMessageProps) {
  const { success } = useContext(FormContext);

  return (
    success && (
      <p role={role} {...props}>
        {message}
      </p>
    )
  );
}

type InputPropsCustom = Omit<UIInputProps, "value" | "onChange" | "variant">;

export function Input({
  defaultValue = "",
  disabled,
  id: newId,
  name: newName,
  type = "text",
  inputSize = "md",
  ...props
}: InputPropsCustom) {
  const [value, setValue] = useState(defaultValue);
  const { pending } = useFormStatus();
  const { errors } = useContext(FormContext);
  const { id, name } = useContext(FormFieldContext);
  const invalid = typeof name !== "undefined" && !!errors?.[name];

  const handleChange = useCallback<ChangeEventHandler<HTMLInputElement>>(
    ({ target }) => {
      setValue(target.value);
    },
    []
  );

  return (
    <UIInput
      aria-describedby={invalid && id ? `${id}-error-message` : undefined}
      aria-invalid={invalid ? true : undefined}
      disabled={disabled ?? (pending ? true : undefined)}
      id={newId ?? id}
      inputSize={inputSize}
      name={newName ?? name}
      onChange={handleChange}
      type={type}
      value={value}
      variant={invalid ? "danger" : "default"}
      {...props}
    />
  );
}

interface CheckboxProps extends Omit<
  ComponentPropsWithoutRef<"input">,
  "checked" | "type"
> {}

/**
 * `FormField` の ID と `name` を付けたチェックボックス。`Label` の `htmlFor`
 * がこの ID を指すので、`Label` の中に入れても外に置いても、ラベルを押すと
 * チェックが切り替わり、ラベルの文がチェックボックスの名前になる。
 *
 * `Form` は送信のあとにフォームをリセットしないので、`defaultChecked` を使う
 * 制御されていない入力欄のままでよい。
 */
export function Checkbox({
  className,
  disabled,
  id: newId,
  name: newName,
  value = "true",
  ...props
}: CheckboxProps) {
  const { pending } = useFormStatus();
  const { errors } = useContext(FormContext);
  const { id, name } = useContext(FormFieldContext);
  const invalid = typeof name !== "undefined" && !!errors?.[name];

  return (
    <input
      aria-describedby={invalid && id ? `${id}-error-message` : undefined}
      aria-invalid={invalid ? true : undefined}
      className={twMerge("size-4 accent-accent", className)}
      disabled={disabled ?? (pending ? true : undefined)}
      id={newId ?? id}
      name={newName ?? name}
      type="checkbox"
      value={value}
      {...props}
    />
  );
}

interface LabelProps extends ComponentPropsWithoutRef<"label"> {}

export function Label({ className, htmlFor, ...props }: LabelProps) {
  const { pending } = useFormStatus();
  const { id } = useContext(FormFieldContext);

  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: ラッパーなので無効に。
    <label
      aria-disabled={pending ? true : undefined}
      className={twMerge(
        "mb-2 block text-meta font-semibold aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
        className
      )}
      htmlFor={htmlFor ?? id}
      {...props}
    />
  );
}

type SelectProps = Omit<UISelectProps, "value" | "variant">;

export function Select({
  defaultValue = "",
  disabled,
  id: newId,
  name: newName,
  ...props
}: SelectProps) {
  const [value, setValue] = useState(defaultValue);
  const { pending } = useFormStatus();
  const { errors } = useContext(FormContext);
  const { id, name } = useContext(FormFieldContext);
  const invalid = typeof name !== "undefined" && !!errors?.[name];

  const handleChange = useCallback<ChangeEventHandler<HTMLSelectElement>>(
    ({ target }) => {
      setValue(target.value);
    },
    []
  );

  return (
    <UISelect
      aria-describedby={invalid && id ? `${id}-error-message` : undefined}
      aria-invalid={invalid ? true : undefined}
      disabled={disabled ?? (pending ? true : undefined)}
      id={newId ?? id}
      name={newName ?? name}
      onChange={handleChange}
      value={value}
      variant={invalid ? "danger" : "default"}
      {...props}
    />
  );
}

type TextareaProps = Omit<UITextareaProps, "value" | "variant">;

export function Textarea({
  defaultValue = "",
  disabled,
  id: newId,
  name: newName,
  ...props
}: TextareaProps) {
  const [value, setValue] = useState(defaultValue);
  const { pending } = useFormStatus();
  const { errors } = useContext(FormContext);
  const { id, name } = useContext(FormFieldContext);
  const invalid = typeof name !== "undefined" && !!errors?.[name];

  const handleChange = useCallback<ChangeEventHandler<HTMLTextAreaElement>>(
    ({ target }) => {
      setValue(target.value);
    },
    []
  );

  return (
    <UITextarea
      aria-describedby={invalid && id ? `${id}-error-message` : undefined}
      aria-invalid={invalid ? true : undefined}
      disabled={disabled ?? (pending ? true : undefined)}
      id={newId ?? id}
      name={newName ?? name}
      onChange={handleChange}
      value={value}
      variant={invalid ? "danger" : "default"}
      {...props}
    />
  );
}
