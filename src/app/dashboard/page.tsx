import { getLists } from '@/actions/list'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import AddListDialog from '@/components/AddListDialog'
import ListDeleteButton from '@/components/ListDeleteButton'
import { Badge } from '@/components/ui/badge'
import ShareListDialog from '@/components/ShareListDialog'
import { auth } from '@/lib/auth'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Users } from 'lucide-react'

export default async function Dashboard() {
  const session = await auth()
  const lists = await getLists()
  const userId = session?.user?.id

  return (
    <main className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black uppercase tracking-tighter">Your Lists</h1>
        <AddListDialog />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lists.map((list) => {
          const isOwner = list.userId === userId
          const userAccess = list.sharedWith.find(sw => sw.userId === userId)
          const accessLevel = isOwner ? 'OWNER' : userAccess?.accessLevel

          // Combine owner and shared users for avatars
          const collaborators = [
            { ...list.user, role: 'Owner' },
            ...list.sharedWith.map(sw => ({ ...sw.user, role: sw.accessLevel }))
          ]

          return (
            <Card key={list.id} className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/20 flex flex-col h-full relative overflow-hidden">
              <Link href={`/list/${list.id}`} className="flex-1">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start gap-4">
                    <CardTitle className="text-xl font-bold truncate group-hover:text-primary transition-colors">{list.title}</CardTitle>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-widest shrink-0">
                      {list.type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pb-12">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono">
                        {list._count.items} items
                      </span>
                      {accessLevel && accessLevel !== 'OWNER' && (
                        <Badge variant="secondary" className="text-[9px] uppercase h-4 px-1.5 font-black bg-blue-500/10 text-blue-500 border-none">
                          {accessLevel} Access
                        </Badge>
                      )}
                    </div>
                    
                    {/* Collaborator Avatars */}
                    <div className="flex items-center mt-3 -space-x-2 overflow-hidden">
                      <TooltipProvider>
                        {collaborators.map((user, i) => (
                          <Tooltip key={`${list.id}-${user.id}`}>
                            <TooltipTrigger asChild>
                              <Avatar className="h-7 w-7 border-2 border-background ring-offset-background transition-transform hover:-translate-y-1">
                                <AvatarImage src={user.image || undefined} />
                                <AvatarFallback className="text-[8px] font-black uppercase tracking-tighter bg-muted">
                                  {(user.name || user.email || 'U').slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                            </TooltipTrigger>
                            <TooltipContent className="text-[10px] font-bold p-2">
                              <p>{user.name || user.email} ({user.role})</p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </TooltipProvider>
                    </div>

                    <p className="text-[10px] text-muted-foreground mt-4 font-bold uppercase tracking-tight opacity-50">
                      Created {new Date(list.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Link>
              {isOwner && (
                <div className="absolute bottom-4 right-4 flex items-center gap-1">
                  <ShareListDialog listId={list.id} listTitle={list.title} />
                  <ListDeleteButton id={list.id} title={list.title} />
                </div>
              )}
            </Card>
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
