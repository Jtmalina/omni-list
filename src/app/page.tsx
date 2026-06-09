import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  LayoutList,
  Users,
  Bell,
  CalendarDays,
  Tv,
  Search,
  ArrowRight,
  CheckCircle2,
  Zap,
} from 'lucide-react'

const features = [
  {
    icon: LayoutList,
    title: 'Multi-type Lists',
    description: 'Movies, TV shows, games, books — every medium in one place. Create as many lists as you need.',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
  },
  {
    icon: Users,
    title: 'Collaborative',
    description: 'Share lists with friends and set read or write access. Track things together.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    icon: Bell,
    title: 'Activity Feed',
    description: 'See what your friends are watching, playing, and reading in real time.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: CalendarDays,
    title: 'Weekly View',
    description: 'Plan your week. Organize what you\'re watching or playing day by day.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
  {
    icon: Zap,
    title: 'Servarr Integration',
    description: 'Connect Sonarr and Radarr to automate downloads directly from your lists.',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
  },
  {
    icon: Search,
    title: 'Media Search',
    description: 'Search millions of titles via TMDB and RAWG and add them instantly.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
  },
]

const steps = [
  { step: '01', title: 'Create a list', description: 'Name it, pick a type, and you\'re ready to go.' },
  { step: '02', title: 'Add what you love', description: 'Search and add movies, shows, games, or books.' },
  { step: '03', title: 'Share & collaborate', description: 'Invite friends and track things together.' },
]

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero */}
      <section className="relative flex-1 flex items-center justify-center overflow-hidden py-32 px-6">
        {/* Animated background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(139,92,246,0.15),transparent)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px]" />
        </div>

        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-bold uppercase tracking-widest mb-6">
            <Tv className="h-3 w-3" />
            Track everything
          </div>

          <h1 className="text-6xl md:text-7xl font-black tracking-tighter leading-none mb-6">
            One list to rule
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              them all
            </span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            OmniList is your personal tracking hub for movies, shows, games, and books —
            with collaboration, automation, and a feed to see what your friends are into.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/login">
              <Button size="lg" className="gap-2 text-base px-8 h-12 font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow" id="hero-cta-signin">
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline" className="text-base px-8 h-12 font-bold" id="hero-cta-features">
                See Features
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6 border-t border-border/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black tracking-tighter mb-3">Everything in one place</h2>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              Built for people who take their watchlists seriously.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group p-6 rounded-2xl border border-border/50 bg-card hover:border-primary/20 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`inline-flex p-2.5 rounded-xl ${feature.bg} mb-4`}>
                  <feature.icon className={`h-5 w-5 ${feature.color}`} />
                </div>
                <h3 className="font-bold text-lg mb-2 tracking-tight">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6 border-t border-border/50 bg-muted/20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black tracking-tighter mb-3">Up and running in seconds</h2>
            <p className="text-muted-foreground text-lg">No setup. No fuss.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <div key={s.step} className="flex flex-col items-center text-center relative">
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-[calc(50%+2rem)] right-[calc(-50%+2rem)] h-px bg-border" />
                )}
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-sm mb-4 relative z-10">
                  {s.step}
                </div>
                <h3 className="font-bold text-lg mb-2 tracking-tight">{s.title}</h3>
                <p className="text-muted-foreground text-sm">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 border-t border-border/50 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_80%_at_50%_120%,rgba(139,92,246,0.12),transparent)]" />
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-5xl font-black tracking-tighter mb-4">
            Start tracking today
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Free. No credit card. Just sign in with GitHub or Google.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap text-sm text-muted-foreground mb-8">
            {['Free forever', 'GitHub & Google login', 'Share with friends'].map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                {item}
              </span>
            ))}
          </div>
          <Link href="/login">
            <Button size="lg" className="gap-2 text-base px-10 h-12 font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow" id="footer-cta-signin">
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2 font-bold">
            <LayoutList className="h-4 w-4 text-primary" />
            OmniList
          </div>
          <p>Track everything.</p>
        </div>
      </footer>
    </div>
  )
}
