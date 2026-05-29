import { getItems } from '@/actions/item'
import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import ListDeleteButton from '@/components/ListDeleteButton'
import { cn } from '@/lib/utils'
import ListClientView from '@/components/ListClientView'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function ListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  
  const [list, config] = await Promise.all([
    prisma.list.findUnique({
      where: { id },
    }),
    session?.user?.id ? prisma.servarrConfig.findUnique({
      where: { userId: session.user.id }
    }) : null
  ])

  if (!list) notFound()

  const items = await getItems(id)

  const isMediaList = list.type === 'MEDIA'

  return (
    <main className={cn(
      "container mx-auto p-8 min-h-screen",
      !isMediaList && "bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]"
    )}>
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>
          <ListDeleteButton id={id} isRedirect={true} />
        </div>
      </div>

      <ListClientView list={list} items={items} servarrConfig={config} />
    </main>
  )
}
