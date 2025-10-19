import RecentActivity from './_components/recent-activity'
import getAuditLogs from './_lib/get-audit-logs'

export default async function DashboardPage() {
  const logs = await getAuditLogs(10)

  return (
    <div className="p-6">
      <h1 className="mb-6 font-bold text-2xl">ダッシュボード</h1>
      <RecentActivity logs={logs} />
    </div>
  )
}
