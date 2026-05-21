import { getLists } from '@/actions/list'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import AddListDialog from '@/components/AddListDialog'
import ListDeleteButton from '@/components/ListDeleteButton'
import { Badge } from '@/components/ui/badge'

export default async function Dashboard() {
  const lists = await getLists()

  return (
    <main className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Lists</h1>
        <AddListDialog />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lists.map((list) => (
          <div key={list.id} className="group relative">
            <Link href={`/list/${list.id}`}>
              <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="truncate pr-8">{list.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                      {list._count.items} items
                    </p>
                    <Badge variant="secondary" className="text-[10px] uppercase h-4">
                      {list.type}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <ListDeleteButton id={list.id} />
            </div>
          </div>
        ))}
        {lists.length === 0 && (
          <p className="col-span-full text-center text-muted-foreground py-12">
            No lists yet. Create your first one!
          </p>
        )}
      </div>
    </main>
  )
}
