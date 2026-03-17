import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { PricingGrid } from '@/components/PricingGrid';
import {
  Camera, Film, Sparkles, Upload, ScanSearch, Image, Grid3X3,
  Scissors, Users, Video, Shirt, FootprintsIcon, Gem, Package,
  ShoppingBag, Droplets, ArrowRight, CheckCircle,
} from 'lucide-react';
import logo from '@/assets/Logo.png';

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
  {
    icon: Scissors,
    title: 'Background removal',
    desc: 'One-click clean background extraction for any product photo.',
  },
  {
    icon: Users,
    title: '40+ AI models',
    desc: 'Diverse, inclusive model library with full control over gender, ethnicity, body type, and styling.',
  },
  {
    icon: Video,
    title: 'Product video',
    desc: 'Turn any generated shot into a cinematic product video with AI-powered motion.',
  },
];

const STEPS = [
  {
    num: '01',
    icon: Upload,
    title: 'Upload your product',
    desc: 'Drop any photo. Our AI detects category, colors, material, and suggests shot types automatically.',
  },
  {
    num: '02',
    icon: Palette,
    title: 'Choose your style',
    desc: "Pick from 40+ diverse AI models, studio templates, or lifestyle scenes. Apparel? We'll even suggest outfit pairings.",
  },
  {
    num: '03',
    icon: ArrowRight,
    title: 'Export campaign-ready content',
    desc: 'Download hero shots, campaign sets of 6, or cinematic product videos. PNG, 2K, no watermark.',
  },
];

const HERO_CARDS = [
  { icon: Upload, label: 'Upload', sublabel: 'Any product photo' },
  { icon: ScanSearch, label: 'AI Analysis', sublabel: 'Category & style detected' },
  { icon: Image, label: 'Model Shot', sublabel: 'On-model or lifestyle' },
  { icon: Grid3X3, label: 'Campaign Set', sublabel: '6-shot grid, export-ready' },
];

const CATEGORIES = [
  { icon: Shirt, name: 'Apparel & Fashion' },
  { icon: Gem, name: 'Jewellery' },
  { icon: ShoppingBag, name: 'Bags & Luggage' },
  { icon: Droplets, name: 'Beauty & Personal Care' },
  { icon: Package, name: 'FMCG' },
  { icon: FootprintsIcon, name: 'Footwear' },
];

const WORKFLOW_STEPS = [
  { label: 'Raw photo', color: 'bg-muted' },
  { label: 'AI-analyzed', color: 'bg-primary/10' },
  { label: '6-shot campaign', color: 'bg-primary/20' },
  { label: 'Product video', color: 'bg-primary/30' },
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
          <div className="flex items-center gap-2">
            <img src={logo} alt="Swift Studio" className="h-6 w-6" />
            <div>
              <span className="font-['Instrument_Serif'] italic text-xl">Swift</span>
              <span className="text-xl font-light ml-1">Studio</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline">Features</a>
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
              <Button size="lg" variant="ghost" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>
                How it works
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">No credit card required · 10 free generations</p>
          </div>

          {/* Hero cards */}
          <div className="hidden lg:grid grid-cols-2 gap-3">
            {HERO_CARDS.map((card, i) => (
              <div
                key={card.label}
                className={`flex flex-col items-center justify-center gap-3 rounded-2xl border p-6 transition-all hover:shadow-md ${
                  i === 2 ? 'bg-primary/5 border-primary/20' : 'bg-muted/50'
                }`}
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                  i === 2 ? 'bg-primary/10' : 'bg-background'
                }`}>
                  <card.icon className={`h-6 w-6 ${i === 2 ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-sm">{card.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{card.sublabel}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 bg-secondary/30">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-3xl text-center mb-4">How it works</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-lg mx-auto">
            From raw product photo to campaign-ready content in three simple steps.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((step) => (
              <div key={step.num} className="relative space-y-4">
                <span className="text-4xl font-['Instrument_Serif'] italic text-primary/20">{step.num}</span>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-3xl text-center mb-4">Everything you need for product content</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-lg mx-auto">
            AI-powered tools built specifically for e-commerce product photography and video.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
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

      {/* Built for every category */}
      <section className="py-24 bg-secondary/30">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-3xl mb-4">Built for every category</h2>
          <p className="text-muted-foreground mb-12 max-w-lg mx-auto">
            Our category-aware AI understands the nuances of each product type for tailored results.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {CATEGORIES.map((cat) => (
              <div
                key={cat.name}
                className="flex items-center gap-2 rounded-full border bg-background px-5 py-2.5 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <cat.icon className="h-4 w-4 text-primary" />
                {cat.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow showcase */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-3xl text-center mb-4">From upload to campaign in 3 clicks</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-lg mx-auto">
            Watch your single product photo transform into a complete marketing campaign.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {WORKFLOW_STEPS.map((step, i) => (
              <div key={step.label} className="space-y-3">
                <div className={`aspect-square rounded-2xl ${step.color} flex items-center justify-center border`}>
                  <span className="text-3xl font-['Instrument_Serif'] italic text-primary/30">{i + 1}</span>
                </div>
                <p className="text-sm font-medium text-center">{step.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-secondary/30">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-3xl text-center mb-12">Simple, transparent pricing</h2>
          <PricingGrid />
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 text-center">
        <div className="mx-auto max-w-2xl px-6 space-y-6">
          <h2 className="text-3xl">Ready to replace your photostudio?</h2>
          <p className="text-muted-foreground">Join thousands of brands creating studio-quality content with AI.</p>
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-primary" /> No photographer needed</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-primary" /> No studio rental</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-primary" /> No post-production</span>
          </div>
          <Button size="lg" onClick={ctaAction}>{ctaLabel} →</Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <img src={logo} alt="Swift Studio" className="h-5 w-5" />
            <div>
              <span className="font-['Instrument_Serif'] italic">Swift</span>
              <span className="font-light ml-1">Studio</span>
            </div>
          </div>
          <p className="text-xs">AI-powered product photography for modern brands</p>
          <div className="flex items-center gap-4">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            {!user && <button onClick={() => navigate('/auth')} className="hover:text-foreground transition-colors">Sign in</button>}
          </div>
          <p className="text-xs">© {new Date().getFullYear()} Swift Studio. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
