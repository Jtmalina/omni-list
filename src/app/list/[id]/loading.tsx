'use client'

import { useParams } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

// ─── Calendar skeleton ────────────────────────────────────────────────────────
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const CELLS = Array.from({ length: 35 })
const POPULATED = new Set([2, 5, 8, 9, 14, 16, 20, 23, 27, 30])

function CalendarSkeleton() {
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-7 w-36" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px mb-px">
        {DAYS.map((d) => (
          <div key={d} className="py-2 text-center">
            <Skeleton className="h-3 w-6 mx-auto" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden border">
        {CELLS.map((_, i) => (
          <div key={i} className="bg-background min-h-[90px] p-2 space-y-1.5">
            <Skeleton className="h-5 w-5 rounded-full" />
            {POPULATED.has(i) && <Skeleton className="h-5 w-full rounded-md" />}
            {POPULATED.has(i + 1) && i % 7 < 3 && <Skeleton className="h-5 w-3/4 rounded-md" />}
          </div>
        ))}
      </div>
    </>
  )
}

// ─── TODO sticky-note skeleton ────────────────────────────────────────────────
function TodoSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className={`pt-4 ${i % 2 === 0 ? 'rotate-1' : '-rotate-1'}`}
        >
          <Card className="h-64 border-t-8 shadow-xl">
            <CardContent className="p-6 space-y-3">
              <div className="flex gap-1 mb-2">
                <Skeleton className="h-3 w-10 rounded-full" />
                <Skeleton className="h-3 w-10 rounded-full" />
              </div>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  )
}

// ─── Media poster-grid skeleton ───────────────────────────────────────────────
function MediaSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
      {/* Sidebar */}
      <aside className="w-full lg:w-64 shrink-0 space-y-4">
        <div className="mb-6 space-y-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </aside>
      {/* Poster grid */}
      <div className="flex-1 w-full space-y-6">
        <Skeleton className="h-11 w-full max-w-md rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="w-full aspect-[2/3] rounded-xl" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Root loading component ───────────────────────────────────────────────────
export default function ListLoading() {
  const params = useParams()
  const id = params?.id as string | undefined

  const cached =
    typeof window !== 'undefined' && id
      ? (localStorage.getItem(`omnilist_type_${id}`) ?? 'MEDIA')
      : 'MEDIA'

  return (
    <main className="container mx-auto p-8 min-h-screen">
      {/* Back link + action buttons — same for all types */}
      <div className="mb-6 flex justify-between items-center">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>

      {cached === 'CALENDAR' && <CalendarSkeleton />}
      {cached === 'TODO'     && <TodoSkeleton />}
      {cached === 'MEDIA'    && <MediaSkeleton />}
    </main>
  )
}
