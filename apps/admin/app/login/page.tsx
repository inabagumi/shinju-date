import Form, {
  Button,
  ErrorMessage,
  FormField,
  GenericErrorMessage,
  Input,
  Label
} from '@/components/form'
import { signIn } from './_lib/actions'

export default function Login() {
  return (
    <div className="grid min-h-svh place-items-center bg-slate-50 p-4">
      <Form
        action={signIn}
        className="grid w-full max-w-md gap-8 rounded-lg border border-slate-400 bg-white p-6 shadow-sm"
      >
        <GenericErrorMessage className="rounded-md bg-red-500 p-2 leading-normal text-slate-50" />

        <div className="space-y-4">
          <FormField className="flex flex-col space-y-2" name="email">
            <Label className="aria-disabled:cursor-not-allowed aria-disabled:text-slate-400">
              メールアドレス
            </Label>
            <Input
              className="w-full rounded-md border border-slate-300 bg-white p-1 placeholder:text-slate-300 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              placeholder="admin@example.com"
              required
              type="email"
            />
            <ErrorMessage className="text-sm leading-normal text-red-500" />
          </FormField>
          <FormField className="flex flex-col space-y-2" name="password">
            <Label className="aria-disabled:cursor-not-allowed aria-disabled:text-slate-400">
              パスワード
            </Label>
            <Input
              className="w-full rounded-md border border-slate-300 bg-white p-1 placeholder:text-slate-300 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              minLength={8}
              placeholder="••••••••"
              required
              type="password"
            />
            <ErrorMessage className="text-sm leading-normal text-red-500" />
          </FormField>
        </div>

        <Button
          className="rounded-md bg-blue-600 p-1 font-semibold text-slate-50 hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:outline-none active:bg-blue-600 active:shadow-inner disabled:pointer-events-none disabled:bg-blue-400"
          type="submit"
        >
          ログイン
        </Button>
      </Form>
    </div>
  )
}
