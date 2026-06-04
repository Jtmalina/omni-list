'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface TagBadgeProps {
  name: string
  color?: string | null
  className?: string
  onClick?: () => void
  onRemove?: () => void
}

export function TagBadge({ name, color, className, onClick, onRemove }: TagBadgeProps) {
  // If no color, default to a subtle gray
  const style = color ? {
    backgroundColor: `${color}20`, // 12% opacity background
    color: color,
    borderColor: `${color}40`, // 25% opacity border
  } : {}

  return (
    <Badge
      variant="outline"
      style={style}
      className={cn(
        "px-2 py-0.5 text-[10px] font-bold uppercase transition-all",
        onClick && "cursor-pointer hover:brightness-90",
        !color && "bg-muted text-muted-foreground",
        className
      )}
      onClick={onClick}
    >
      {name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="ml-1 hover:text-foreground opacity-60 hover:opacity-100"
        >
          ×
        </button>
      )}
    </Badge>
  )
}
