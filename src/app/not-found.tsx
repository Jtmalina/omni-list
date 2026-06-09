import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-12">
      <div className="text-center">
        <h2 className="text-4xl font-black uppercase tracking-tighter mb-2">404 - Not Found</h2>
        <p className="text-muted-foreground mb-6">The page you are looking for does not exist or you do not have access to it.</p>
        <Link href="/dashboard">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    </div>
  )
}
