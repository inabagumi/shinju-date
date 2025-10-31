import type { Metadata } from 'next'

export const metadata: Metadata = {
  description: 'ただいまメンテナンス中です。しばらくお待ちください。',
  title: 'メンテナンス中 - SHINJU DATE',
}

export default function MaintenancePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <svg
            className="mx-auto h-24 w-24 text-gray-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            viewBox="0 0 24 24"
          >
            <title>メンテナンス中</title>
            <path
              d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1 className="mb-4 font-bold text-3xl text-gray-900">
          メンテナンス中
        </h1>

        <p className="mb-6 text-gray-600 text-lg">
          ただいまメンテナンス作業を実施しております。
        </p>

        <div className="rounded-lg bg-blue-50 p-6 text-left">
          <p className="mb-4 font-semibold text-gray-900">メンテナンス情報</p>
          <ul className="space-y-2 text-gray-700 text-sm">
            <li className="flex items-start">
              <svg
                className="mt-0.5 mr-2 h-5 w-5 flex-shrink-0 text-blue-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <title>情報</title>
                <path
                  clipRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  fillRule="evenodd"
                />
              </svg>
              <span>データベースの更新作業を行っております</span>
            </li>
            <li className="flex items-start">
              <svg
                className="mt-0.5 mr-2 h-5 w-5 flex-shrink-0 text-blue-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <title>時計</title>
                <path
                  clipRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                  fillRule="evenodd"
                />
              </svg>
              <span>作業完了まで今しばらくお待ちください</span>
            </li>
          </ul>
        </div>

        <p className="mt-8 text-gray-500 text-sm">
          ご不便をおかけして申し訳ございません。
        </p>
      </div>
    </div>
  )
}
