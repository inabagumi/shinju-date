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
    <div className="grid h-lvh place-items-center bg-slate-50 p-4">
      <Form
        action={signIn}
        className="grid w-full max-w-md gap-8 rounded-lg border border-current bg-white p-6 shadow-md"
      >
        <GenericErrorMessage className="rounded-md bg-red-500 p-2 leading-normal text-slate-50" />

        <div className="space-y-4">
          <FormField className="flex flex-col space-y-2" name="email">
            <Label>メールアドレス</Label>
            <Input
              className="w-full rounded-md border border-slate-400 bg-white p-1 placeholder:text-slate-300 focus-visible:ring-2 focus-visible:ring-slate-200 focus-visible:ring-offset-2 focus-visible:outline-none disabled:bg-slate-100 disabled:text-slate-400"
              placeholder="admin@example.com"
            />
            <ErrorMessage className="text-sm leading-normal text-red-500" />
          </FormField>
          <FormField className="flex flex-col space-y-2" name="password">
            <Label>パスワード</Label>
            <Input
              className="w-full rounded-md border border-slate-400 bg-white p-1 placeholder:text-slate-300 focus-visible:ring-2 focus-visible:ring-slate-200 focus-visible:ring-offset-2 focus-visible:outline-none disabled:bg-slate-100 disabled:text-slate-400"
              placeholder="••••••••"
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
