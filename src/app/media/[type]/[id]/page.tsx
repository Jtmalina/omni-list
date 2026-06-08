import { getExtendedMediaDetails, getExtendedGameDetails } from '@/lib/media-api'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Star, Clock, Calendar, Tv, Film, Gamepad2, ExternalLink, Play, Users, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'

interface MediaPageProps {
  params: Promise<{
    type: string
    id: string
  }>
}

export default async function MediaDetailPage({ params }: MediaPageProps) {
  const { type, id } = await params

  let data: any = null
  if (type === 'movie' || type === 'tv') {
    data = await getExtendedMediaDetails(id, type as 'movie' | 'tv')
  } else if (type === 'game') {
    data = await getExtendedGameDetails(id)
  }

  if (!data) notFound()

  const isGame = type === 'game'
  const trailer = !isGame ? data.videos.find((v: any) => v.type === 'Trailer') : null
  const recommendations = isGame ? data.similarGames : data.recommendations

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero Section */}
      <div className="relative h-[60vh] w-full overflow-hidden">
        <Image
          src={isGame ? data.posterPath : (data.backdropPath || data.posterPath)}
          alt={data.title}
          fill
          className="object-cover opacity-30 blur-sm scale-105"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        
        <div className="container mx-auto px-8 relative h-full flex flex-col justify-end pb-12">
          <div className="flex flex-col md:flex-row gap-8 items-end">
            {/* Poster */}
            <div className="relative h-72 w-48 shrink-0 rounded-2xl overflow-hidden shadow-2xl border-4 border-background/20 hidden md:block">
              <Image src={data.posterPath} alt={data.title} fill className="object-cover" />
            </div>

            {/* Info */}
            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap gap-2">
                {data.genres?.map((g: any) => (
                  <Badge key={g.id || g.name} variant="secondary" className="bg-primary/10 text-primary border-none font-bold uppercase text-[10px]">
                    {g.name}
                  </Badge>
                ))}
              </div>
              <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none">
                {data.title}
              </h1>
              {data.tagline && (
                <p className="text-xl text-muted-foreground italic font-medium leading-tight">
                  &ldquo;{data.tagline}&rdquo;
                </p>
              )}
              
              <div className="flex flex-wrap items-center gap-6 pt-2">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500 fill-current" />
                  <span className="text-xl font-black tabular-nums">
                    {(data.voteAverage || data.rating || 0).toFixed(1)}
                  </span>
                </div>
                {data.runtime && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-bold uppercase tabular-nums">{data.runtime} min</span>
                  </div>
                )}
                {data.releaseDate && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm font-bold uppercase tabular-nums">
                      {new Date(data.releaseDate).getFullYear()}
                    </span>
                  </div>
                )}
                {data.status && (
                  <Badge variant="outline" className="uppercase font-black text-[10px] tracking-widest border-primary/20">
                    {data.status}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-8 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Column: Description & Media */}
        <div className="lg:col-span-2 space-y-12">
          <section className="space-y-4">
            <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Overview
            </h2>
            <p className="text-lg leading-relaxed text-muted-foreground font-medium">
              {data.overview || data.description}
            </p>
          </section>

          {trailer && (
            <section className="space-y-4">
              <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                <Play className="h-5 w-5 text-primary" />
                Trailer
              </h2>
              <div className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl border-8 border-muted">
                <iframe
                  src={`https://www.youtube.com/embed/${trailer.key}`}
                  title={trailer.name}
                  className="absolute inset-0 w-full h-full"
                  allowFullScreen
                />
              </div>
            </section>
          )}

          {isGame && data.screenshots?.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                <Gamepad2 className="h-5 w-5 text-primary" />
                Screenshots
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {data.screenshots.slice(0, 4).map((s: string, i: number) => (
                  <div key={i} className="relative aspect-video rounded-2xl overflow-hidden border-2 border-muted hover:border-primary/20 transition-colors">
                    <Image src={s} alt="Screenshot" fill className="object-cover" />
                  </div>
                ))}
              </div>
            </section>Section
          )}

          {recommendations?.length > 0 && (
            <section className="space-y-6">
              <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                You Might Also Like
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {recommendations.map((r: any) => (
                  <Link key={r.id} href={`/media/${r.mediaType}/${r.id}`}>
                    <div className="group space-y-2">
                      <div className="relative aspect-[2/3] rounded-xl overflow-hidden border-2 border-transparent group-hover:border-primary transition-all shadow-md group-hover:shadow-xl group-hover:-translate-y-1">
                        {r.posterPath ? (
                          <Image src={r.posterPath} alt={r.title} fill className="object-cover" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-muted">
                            <Sparkles className="h-8 w-8 opacity-10" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-black uppercase tracking-tight truncate px-1">
                        {r.title}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Cast & Details */}
        <div className="space-y-12">
          {!isGame && data.credits?.length > 0 && (
            <section className="space-y-6">
              <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Top Cast & Crew
              </h2>
              <div className="space-y-3">
                {data.credits.map((c: any) => (
                  <div key={`${c.id}-${c.role}`} className="flex items-center gap-4 p-2 bg-muted/20 rounded-2xl border border-transparent hover:border-primary/10 transition-colors">
                    <div className="relative h-12 w-12 rounded-full overflow-hidden border-2 border-background shadow-sm shrink-0">
                      {c.profilePath ? (
                        <Image src={c.profilePath} alt={c.name} fill className="object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-muted">
                          <Users className="h-4 w-4 opacity-20" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black truncate uppercase tracking-tight">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate uppercase font-bold italic">{c.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {isGame && (
            <section className="space-y-6">
              <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                <Gamepad2 className="h-5 w-5 text-primary" />
                Game Info
              </h2>
              <div className="space-y-4">
                {data.developers?.length > 0 && (
                  <div>
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Developers</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {data.developers.map((d: any) => (
                        <Badge key={d.id} variant="outline" className="font-bold border-primary/20">{d.name}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {data.publishers?.length > 0 && (
                  <div>
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Publishers</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {data.publishers.map((p: any) => (
                        <Badge key={p.name} variant="outline" className="font-bold">{p.name}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {data.platforms?.length > 0 && (
                  <div>
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Platforms</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {data.platforms.map((p: string) => (
                        <Badge key={p} variant="secondary" className="font-bold text-[9px]">{p}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {data.website && (
                  <Button asChild variant="outline" className="w-full rounded-2xl border-2 font-black uppercase text-xs gap-2">
                    <a href={data.website} target="_blank" rel="noreferrer">
                      Official Website
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

function Label({ children, className }: { children: React.ReactNode, className?: string }) {
  return <p className={cn("text-xs font-bold mb-1", className)}>{children}</p>
}
