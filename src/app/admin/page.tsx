import { isAdmin } from '@/lib/admin'
import { getAdminStatsAction } from '@/actions/admin'
import { notFound } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatDistanceToNow } from 'date-fns'
import { Users, UserCheck, LogIn, UserPlus, ListChecks, Film, CheckCircle2, Share2, Heart } from 'lucide-react'

export const dynamic = 'force-dynamic'

const ACTIVITY_LABELS: Record<string, string> = {
  ITEM_CREATED: 'added',
  ITEM_COMPLETED: 'completed',
  ITEM_DELETED: 'deleted',
  LIST_SHARED: 'shared a list',
  FRIEND_ACCEPTED: 'became friends',
}

function StatCard({ label, value, sub, icon: Icon }: { label: string; value: number | string; sub?: string; icon: any }) {
  return (
    <Card className="p-5 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground/50" />
      </div>
      <span className="text-3xl font-black tabular-nums">{value}</span>
      {sub && <span className="text-[11px] text-muted-foreground font-mono">{sub}</span>}
    </Card>
  )
}

export default async function AdminPage() {
  if (!(await isAdmin())) notFound()
  const s = await getAdminStatsAction()

  const mediaCount = (mt: string) => s.itemsByMediaType.find((g) => g.mediaType === mt)?._count ?? 0
  const tasks = s.itemsByType.find((g) => g.type === 'TASK')?._count ?? 0
  const completionRate = s.totalItems > 0 ? Math.round((s.completedItems / s.totalItems) * 100) : 0

  return (
    <main className="container mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tighter">Admin</h1>
        <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">App metrics overview</p>
      </div>

      {/* Accounts & logins */}
      <section className="space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-60">Accounts &amp; Logins</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Accounts" value={s.totalUsers} icon={Users} />
          <StatCard label="Active (7d)" value={s.activeUsers7} sub="logged in this week" icon={UserCheck} />
          <StatCard label="Logins (24h)" value={s.logins24} icon={LogIn} />
          <StatCard label="New (7d)" value={s.newUsers7} sub={`${s.newUsers30} in 30d`} icon={UserPlus} />
        </div>
      </section>

      {/* Content */}
      <section className="space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-60">Content</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Lists" value={s.totalLists} icon={ListChecks} />
          <StatCard label="Items" value={s.totalItems} sub={`${tasks} tasks`} icon={Film} />
          <StatCard label="Completed" value={s.completedItems} sub={`${completionRate}% completion`} icon={CheckCircle2} />
          <StatCard label="Shared / Friends" value={`${s.sharedLists} / ${s.acceptedFriendships}`} icon={Share2} />
        </div>
        <div className="flex flex-wrap gap-3 pt-1">
          {(['MOVIE', 'SHOW', 'GAME'] as const).map((mt) => (
            <div key={mt} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/40 text-sm">
              <span className="font-black uppercase text-[10px] tracking-wider text-muted-foreground">{mt}</span>
              <span className="font-black tabular-nums">{mediaCount(mt)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Recent activity */}
      <section className="space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-60">Recent Activity</h2>
        <Card className="divide-y">
          {s.recentActivity.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground italic">No activity yet.</p>
          ) : (
            s.recentActivity.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-3">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={a.user?.image ?? undefined} />
                  <AvatarFallback>{(a.user?.name ?? a.user?.email ?? '?')[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 text-sm">
                  <span className="font-bold">{a.user?.name ?? a.user?.email ?? 'Someone'}</span>{' '}
                  <span className="text-muted-foreground">{ACTIVITY_LABELS[a.type] ?? a.type}</span>{' '}
                  {a.itemTitle && <span className="font-medium">{a.itemTitle}</span>}
                  {a.list?.title && <span className="text-muted-foreground"> · {a.list.title}</span>}
                </div>
                <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">
                  {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                </span>
              </div>
            ))
          )}
        </Card>
      </section>
    </main>
  )
}
