import { getLists } from '@/actions/list'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import AddListDialog from '@/components/AddListDialog'
import ListDeleteButton from '@/components/ListDeleteButton'
import { Badge } from '@/components/ui/badge'
import ShareListDialog from '@/components/ShareListDialog'
import { auth } from '@/lib/auth'
import { Users, User, Shield, Eye, Edit3 } from 'lucide-react'

export default async function Dashboard() {
  const session = await auth()
  const lists = await getLists()
  const userId = session?.user?.id

  return (
    <main className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Lists</h1>
        <AddListDialog />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lists.map((list) => {
          const isOwner = list.userId === userId
          const sharedAccess = list.sharedWith[0]?.accessLevel
          
          return (
            <div key={list.id} className="group relative">
              <Link href={`/list/${list.id}`}>
                <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="truncate pr-16">{list.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground">
                          {list._count.items} items
                        </p>
                        <Badge variant="secondary" className="text-[10px] uppercase h-4">
                          {list.type}
                        </Badge>
                      </div>
                      
                      {!isOwner && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground font-medium truncate">
                            Owner: {list.user.name || list.user.email}
                          </span>
                          <Badge variant="outline" className="text-[8px] h-3 px-1 ml-auto">
                            {sharedAccess === 'EDIT' ? <Edit3 className="h-2 w-2 mr-0.5" /> : <Eye className="h-2 w-2 mr-0.5" />}
                            {sharedAccess}
                          </Badge>
                        </div>
                      )}
                      
                      {isOwner && list.sharedWith.length > 0 && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-primary font-bold uppercase tracking-wider">
                          <Users className="h-3 w-3" />
                          <span>Shared</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                {isOwner && <ShareListDialog listId={list.id} listTitle={list.title} />}
                {isOwner && <ListDeleteButton id={list.id} />}
              </div>
            </div>
          )
        })}
        {lists.length === 0 && (
          <p className="col-span-full text-center text-muted-foreground py-12">
            No lists yet. Create your first one!
          </p>
        )}
      </div>
    </main>
  )
}
