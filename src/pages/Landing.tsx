import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { PricingGrid } from '@/components/PricingGrid';
import { Camera, Film, Sparkles } from 'lucide-react';

const FEATURES = [
  {
    icon: Sparkles,
    title: 'Category-aware AI',
    desc: 'Tailors results for jewellery, apparel, beauty, footwear, and more — automatically.',
  },
  {
    icon: Camera,
    title: 'Model shots + Showcase',
    desc: 'On-model images or studio scenes, your choice. Pick from diverse AI models or upload your own.',
  },
  {
    icon: Film,
    title: 'Images + Video',
    desc: 'Complete campaign sets in minutes. Turn any shot into a cinematic product video.',
  },
];

const Landing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const ctaLabel = user ? 'Go to Dashboard' : 'Start for free';
  const ctaAction = () => navigate(user ? '/app/dashboard' : '/auth');

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div>
            <span className="font-['Instrument_Serif'] italic text-xl">Swift</span>
            <span className="text-xl font-light ml-1">Studio</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            {user ? (
              <Button size="sm" onClick={() => navigate('/app/dashboard')}>Dashboard</Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/auth')}>Sign in</Button>
                <Button size="sm" onClick={() => navigate('/auth')}>Start free</Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex min-h-screen items-center pt-14">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 lg:grid-cols-2">
          <div className="flex flex-col justify-center">
            <h1 className="text-5xl lg:text-7xl leading-tight">
              Professional product photos.
              <br />
              <span className="italic text-primary">No photographer.</span>
            </h1>
            <p className="mt-6 max-w-md text-xl text-muted-foreground">
              Upload any product photo. AI generates model shots, lifestyle scenes, and product videos — category-aware, export-ready.
            </p>
            <div className="mt-8 flex gap-4">
              <Button size="lg" onClick={ctaAction}>{ctaLabel}</Button>
              <Button size="lg" variant="ghost" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
                See examples
              </Button>
            </div>
          </div>
          {/* Placeholder collage */}
          <div className="hidden lg:grid grid-cols-2 gap-3">
            <div className="space-y-3">
              <div className="aspect-[3/4] rounded-2xl bg-muted" />
              <div className="aspect-square rounded-2xl bg-primary/10" />
            </div>
            <div className="space-y-3 pt-8">
              <div className="aspect-square rounded-2xl bg-accent" />
              <div className="aspect-[3/4] rounded-2xl bg-muted" />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-secondary/30">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-3xl text-center mb-12">Everything you need for product content</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {FEATURES.map((f) => (
              <div key={f.title} className="space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-3xl text-center mb-12">Simple, transparent pricing</h2>
          <PricingGrid />
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-secondary/30 text-center">
        <div className="mx-auto max-w-2xl px-6 space-y-6">
          <h2 className="text-3xl">Ready to replace your photostudio?</h2>
          <Button size="lg" onClick={ctaAction}>{ctaLabel} →</Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-6xl px-6 flex items-center justify-between text-sm text-muted-foreground">
          <div>
            <span className="font-['Instrument_Serif'] italic">Swift</span>
            <span className="font-light ml-1">Studio</span>
          </div>
          <p>© {new Date().getFullYear()} Swift Studio. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
