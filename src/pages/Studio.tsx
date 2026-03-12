import { useEffect, useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { Check, Package, Upload, X, Loader2, ArrowLeft, Download, Link2, Pencil, RotateCcw, Undo2, Play, Share2, RefreshCw, ImageIcon, Palette, Eye, Sparkles, Camera, Plus, LayoutGrid, Tag, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

/* ── Types ── */
interface Project {
  id: string;
  name: string;
  category: string;
  shot_type: string;
  status: string;
}
interface Asset {
  id: string;
  url: string;
  asset_type: string;
  shot_label?: string | null;
  preset_used?: string | null;
  prompt_used?: string | null;
}

interface ModelConfig {
  selectedModel: string | null;
  uploadedModelUrl: string | null;
  gender: string;
  ethnicity: string;
  bodyType: string;
  background: string;
  backgroundPrompt: string;
  aiEngine: string;
}

interface GeneratedShot {
  id: string;
  url: string;
  shotLabel: string;
  promptUsed: string;
  isEditing: boolean;
  editPrompt: string;
  isRegenerating: boolean;
  previousUrl: string | null;
  showUndo: boolean;
}

interface VideoConfig {
  baseImageId: string;
  duration: number;
  resolution: string;
  engine: string;
  aspectRatio: string;
  selectedPrompt?: { style: string; text: string; reason: string } | null;
}

interface VideoPrompt {
  style: string;
  text: string;
  reason: string;
}

interface ProductInfo {
  category: string;
  colors: string[];
  material: string;
  suggestedShots: string[];
  description: string;
  productName: string;
  garmentType: string | null;
  outfitSuggestion: string | null;
  hasModel: boolean;
  hasWhiteBackground: boolean;
  modelNote: string | null;
}

interface GeneratedVideo {
  id: string;
  url: string;
  duration: number;
  resolution: string;
  engine: string;
}

function ratioToCss(ratio: string): string {
  const [w, h] = ratio.split(':').map(Number);
  return `${w}/${h}`;
}

const VIDEO_STAGES = [
  'Analysing your shot...',
  'Building the scene...',
  'Rendering motion...',
  'Almost there...',
];

const calculateVideoCreditCost = (duration: number, resolution: string) => {
  const resMultiplier = resolution === '1080p' ? 2 : 1;
  return Math.ceil((duration / 2) * resMultiplier);
};

const SHOT_LABELS: Record<string, string> = { model_shot: 'Model Shot', product_showcase: 'Product Showcase' };
const SHOT_LABEL_DISPLAY: Record<string, string> = {
  hero: 'Hero Shot',
  detail: 'Close-up Detail',
  lifestyle: 'Lifestyle',
  alternate: 'Alternate Angle',
  editorial: 'Editorial',
  flat_lay: 'Flat Lay',
};

const ASPECT_RATIOS = [
  { value: '1:1', label: 'Square' },
  { value: '4:3', label: 'Landscape' },
  { value: '3:4', label: 'Portrait' },
  { value: '16:9', label: 'Wide' },
  { value: '9:16', label: 'Vertical' },
];

/* ── Placeholder models (40) with full metadata ── */
const PLACEHOLDER_MODELS = [
  { id: 'm1', name: 'Priya', attrs: 'F · South Asian · Slim', color: 'hsl(355 82% 56% / 0.2)', gender: 'female', ethnicity: 'South Asian', bodyType: 'slim', skinTone: 'warm brown', ageRange: '24-28', facialFeatures: 'high cheekbones, almond eyes, full lips' },
  { id: 'm2', name: 'Amara', attrs: 'F · Black · Athletic', color: 'hsl(30 80% 55% / 0.2)', gender: 'female', ethnicity: 'Black African', bodyType: 'athletic', skinTone: 'deep brown', ageRange: '22-26', facialFeatures: 'strong jawline, wide-set eyes, defined brows' },
  { id: 'm3', name: 'Mei', attrs: 'F · East Asian · Slim', color: 'hsl(200 60% 55% / 0.2)', gender: 'female', ethnicity: 'East Asian', bodyType: 'slim', skinTone: 'fair porcelain', ageRange: '23-27', facialFeatures: 'delicate features, monolid eyes, soft cheekbones' },
  { id: 'm4', name: 'Sofia', attrs: 'F · Latina · Curvy', color: 'hsl(340 60% 55% / 0.2)', gender: 'female', ethnicity: 'Latina', bodyType: 'curvy', skinTone: 'olive tan', ageRange: '25-29', facialFeatures: 'expressive eyes, full lips, rounded face' },
  { id: 'm5', name: 'Emma', attrs: 'F · Caucasian · Athletic', color: 'hsl(220 50% 55% / 0.2)', gender: 'female', ethnicity: 'Caucasian', bodyType: 'athletic', skinTone: 'fair with freckles', ageRange: '24-28', facialFeatures: 'angular jaw, blue-green eyes, defined cheekbones' },
  { id: 'm6', name: 'Fatima', attrs: 'F · Middle Eastern · Slim', color: 'hsl(160 50% 55% / 0.2)', gender: 'female', ethnicity: 'Middle Eastern', bodyType: 'slim', skinTone: 'warm olive', ageRange: '23-27', facialFeatures: 'arched brows, large dark eyes, straight nose' },
  { id: 'm7', name: 'Arjun', attrs: 'M · South Asian · Athletic', color: 'hsl(270 50% 55% / 0.2)', gender: 'male', ethnicity: 'South Asian', bodyType: 'athletic', skinTone: 'medium brown', ageRange: '26-30', facialFeatures: 'strong brow, defined jaw, dark intense eyes' },
  { id: 'm8', name: 'James', attrs: 'M · Caucasian · Average', color: 'hsl(100 40% 55% / 0.2)', gender: 'male', ethnicity: 'Caucasian', bodyType: 'average', skinTone: 'light with warm undertones', ageRange: '28-32', facialFeatures: 'square jaw, light stubble, hazel eyes' },
  { id: 'm9', name: 'Kenzo', attrs: 'M · East Asian · Slim', color: 'hsl(190 50% 55% / 0.2)', gender: 'male', ethnicity: 'East Asian Japanese', bodyType: 'slim', skinTone: 'light warm', ageRange: '24-28', facialFeatures: 'sharp features, narrow face, defined cheekbones' },
  { id: 'm10', name: 'Nia', attrs: 'F · Black · Plus Size', color: 'hsl(20 70% 55% / 0.2)', gender: 'female', ethnicity: 'Black', bodyType: 'plus size', skinTone: 'rich dark brown', ageRange: '26-30', facialFeatures: 'round face, warm smile, full cheeks, bright eyes' },
  { id: 'm11', name: 'Aisha', attrs: 'F · Middle Eastern · Athletic', color: 'hsl(45 70% 55% / 0.2)', gender: 'female', ethnicity: 'Middle Eastern', bodyType: 'athletic', skinTone: 'golden olive', ageRange: '25-29', facialFeatures: 'strong brows, angular face, piercing dark eyes' },
  { id: 'm12', name: 'Liam', attrs: 'M · Caucasian · Slim', color: 'hsl(210 55% 55% / 0.2)', gender: 'male', ethnicity: 'Caucasian', bodyType: 'slim', skinTone: 'pale fair', ageRange: '22-26', facialFeatures: 'sharp cheekbones, green eyes, clean-shaven' },
  { id: 'm13', name: 'Yuki', attrs: 'F · East Asian · Average', color: 'hsl(320 50% 55% / 0.2)', gender: 'female', ethnicity: 'East Asian Japanese', bodyType: 'average', skinTone: 'light porcelain', ageRange: '24-28', facialFeatures: 'oval face, gentle features, soft brows' },
  { id: 'm14', name: 'Carlos', attrs: 'M · Latino · Athletic', color: 'hsl(15 65% 55% / 0.2)', gender: 'male', ethnicity: 'Latino', bodyType: 'athletic', skinTone: 'medium tan', ageRange: '27-31', facialFeatures: 'strong jaw, dark thick brows, warm brown eyes' },
  { id: 'm15', name: 'Zara', attrs: 'F · Mixed · Slim', color: 'hsl(280 55% 55% / 0.2)', gender: 'female', ethnicity: 'Mixed race', bodyType: 'slim', skinTone: 'caramel', ageRange: '22-26', facialFeatures: 'unique mixed features, light hazel eyes, curly hair' },
  { id: 'm16', name: 'Dev', attrs: 'M · South Asian · Average', color: 'hsl(170 50% 55% / 0.2)', gender: 'male', ethnicity: 'South Asian', bodyType: 'average', skinTone: 'warm brown', ageRange: '25-29', facialFeatures: 'gentle eyes, trimmed beard, friendly expression' },
  { id: 'm17', name: 'Keiko', attrs: 'F · East Asian · Curvy', color: 'hsl(240 45% 55% / 0.2)', gender: 'female', ethnicity: 'East Asian', bodyType: 'curvy', skinTone: 'warm beige', ageRange: '26-30', facialFeatures: 'round face, bright eyes, dimpled cheeks' },
  { id: 'm18', name: 'Marcus', attrs: 'M · Black · Athletic', color: 'hsl(10 75% 55% / 0.2)', gender: 'male', ethnicity: 'Black', bodyType: 'athletic muscular', skinTone: 'dark brown', ageRange: '25-29', facialFeatures: 'strong jaw, trimmed beard, intense gaze' },
  { id: 'm19', name: 'Anya', attrs: 'F · Caucasian · Slim', color: 'hsl(300 50% 55% / 0.2)', gender: 'female', ethnicity: 'Caucasian Slavic', bodyType: 'slim', skinTone: 'fair cool', ageRange: '23-27', facialFeatures: 'high cheekbones, icy blue eyes, sharp features' },
  { id: 'm20', name: 'Omar', attrs: 'M · Middle Eastern · Average', color: 'hsl(50 60% 55% / 0.2)', gender: 'male', ethnicity: 'Middle Eastern', bodyType: 'average', skinTone: 'warm olive', ageRange: '28-32', facialFeatures: 'dark eyes, well-groomed stubble, strong nose' },
  { id: 'm21', name: 'Luna', attrs: 'F · Latina · Slim', color: 'hsl(330 65% 55% / 0.2)', gender: 'female', ethnicity: 'Latina', bodyType: 'slim', skinTone: 'warm honey', ageRange: '22-26', facialFeatures: 'wide eyes, soft jawline, subtle dimples' },
  { id: 'm22', name: 'Ravi', attrs: 'M · South Asian · Slim', color: 'hsl(180 50% 55% / 0.2)', gender: 'male', ethnicity: 'South Asian', bodyType: 'slim', skinTone: 'light brown', ageRange: '23-27', facialFeatures: 'lean face, expressive dark eyes, clean-shaven' },
  { id: 'm23', name: 'Hana', attrs: 'F · Southeast Asian · Average', color: 'hsl(140 45% 55% / 0.2)', gender: 'female', ethnicity: 'Southeast Asian Filipino', bodyType: 'average', skinTone: 'warm golden', ageRange: '24-28', facialFeatures: 'wide-set eyes, button nose, warm smile' },
  { id: 'm24', name: 'Ethan', attrs: 'M · Caucasian · Athletic', color: 'hsl(230 50% 55% / 0.2)', gender: 'male', ethnicity: 'Caucasian', bodyType: 'athletic', skinTone: 'light tan', ageRange: '26-30', facialFeatures: 'defined jaw, brown eyes, short styled hair' },
  { id: 'm25', name: 'Jasmine', attrs: 'F · Mixed · Athletic', color: 'hsl(60 55% 55% / 0.2)', gender: 'female', ethnicity: 'Mixed Black-Asian', bodyType: 'athletic', skinTone: 'medium warm', ageRange: '23-27', facialFeatures: 'striking eyes, sculpted brows, full lips' },
  { id: 'm26', name: 'Kofi', attrs: 'M · Black · Slim', color: 'hsl(25 70% 55% / 0.2)', gender: 'male', ethnicity: 'Black West African', bodyType: 'slim', skinTone: 'deep ebony', ageRange: '24-28', facialFeatures: 'angular face, high cheekbones, bright smile' },
  { id: 'm27', name: 'Nina', attrs: 'F · Caucasian · Plus Size', color: 'hsl(310 50% 55% / 0.2)', gender: 'female', ethnicity: 'Caucasian', bodyType: 'plus size', skinTone: 'fair pink', ageRange: '27-31', facialFeatures: 'soft rounded features, blue eyes, warm expression' },
  { id: 'm28', name: 'Takeshi', attrs: 'M · East Asian · Athletic', color: 'hsl(195 55% 55% / 0.2)', gender: 'male', ethnicity: 'East Asian Japanese', bodyType: 'athletic', skinTone: 'light warm', ageRange: '26-30', facialFeatures: 'sharp jawline, narrow eyes, defined brows' },
  { id: 'm29', name: 'Isla', attrs: 'F · Mixed · Curvy', color: 'hsl(350 60% 55% / 0.2)', gender: 'female', ethnicity: 'Mixed Caucasian-Latina', bodyType: 'curvy', skinTone: 'light olive', ageRange: '25-29', facialFeatures: 'green eyes, wavy hair, rounded cheekbones' },
  { id: 'm30', name: 'Hassan', attrs: 'M · Middle Eastern · Slim', color: 'hsl(155 50% 55% / 0.2)', gender: 'male', ethnicity: 'Middle Eastern', bodyType: 'slim', skinTone: 'olive', ageRange: '24-28', facialFeatures: 'dark deep eyes, angular nose, light beard' },
  { id: 'm31', name: 'Valentina', attrs: 'F · Latina · Athletic', color: 'hsl(5 75% 55% / 0.2)', gender: 'female', ethnicity: 'Latina Brazilian', bodyType: 'athletic', skinTone: 'golden tan', ageRange: '24-28', facialFeatures: 'bright eyes, sculpted face, radiant smile' },
  { id: 'm32', name: 'Jin', attrs: 'M · East Asian · Average', color: 'hsl(205 50% 55% / 0.2)', gender: 'male', ethnicity: 'East Asian Korean', bodyType: 'average', skinTone: 'fair light', ageRange: '23-27', facialFeatures: 'soft features, straight brows, gentle expression' },
  { id: 'm33', name: 'Adaeze', attrs: 'F · Black · Slim', color: 'hsl(35 65% 55% / 0.2)', gender: 'female', ethnicity: 'Black Nigerian', bodyType: 'slim', skinTone: 'deep warm brown', ageRange: '22-26', facialFeatures: 'symmetrical face, high forehead, graceful neck' },
  { id: 'm34', name: 'Noah', attrs: 'M · Caucasian · Plus Size', color: 'hsl(120 40% 55% / 0.2)', gender: 'male', ethnicity: 'Caucasian', bodyType: 'plus size', skinTone: 'fair with warm undertones', ageRange: '29-33', facialFeatures: 'friendly round face, light beard, blue eyes' },
  { id: 'm35', name: 'Suki', attrs: 'F · Southeast Asian · Slim', color: 'hsl(260 50% 55% / 0.2)', gender: 'female', ethnicity: 'Southeast Asian Thai', bodyType: 'slim', skinTone: 'warm golden', ageRange: '22-26', facialFeatures: 'delicate features, almond eyes, soft lips' },
  { id: 'm36', name: 'Mateo', attrs: 'M · Latino · Slim', color: 'hsl(40 60% 55% / 0.2)', gender: 'male', ethnicity: 'Latino', bodyType: 'slim', skinTone: 'light olive', ageRange: '23-27', facialFeatures: 'lean face, warm brown eyes, tousled hair' },
  { id: 'm37', name: 'Leila', attrs: 'F · Middle Eastern · Curvy', color: 'hsl(175 50% 55% / 0.2)', gender: 'female', ethnicity: 'Middle Eastern Persian', bodyType: 'curvy', skinTone: 'warm olive', ageRange: '25-29', facialFeatures: 'large dark eyes, arched brows, full lips' },
  { id: 'm38', name: 'Daniel', attrs: 'M · Mixed · Athletic', color: 'hsl(85 45% 55% / 0.2)', gender: 'male', ethnicity: 'Mixed Black-Caucasian', bodyType: 'athletic', skinTone: 'medium caramel', ageRange: '25-29', facialFeatures: 'strong features, curly hair, warm hazel eyes' },
  { id: 'm39', name: 'Chioma', attrs: 'F · Black · Athletic', color: 'hsl(15 80% 55% / 0.2)', gender: 'female', ethnicity: 'Black Nigerian', bodyType: 'athletic', skinTone: 'dark brown', ageRange: '23-27', facialFeatures: 'sculpted face, bright smile, defined cheekbones' },
  { id: 'm40', name: 'Raj', attrs: 'M · South Asian · Curvy', color: 'hsl(290 50% 55% / 0.2)', gender: 'male', ethnicity: 'South Asian', bodyType: 'curvy stocky', skinTone: 'medium brown', ageRange: '28-32', facialFeatures: 'round friendly face, thick brows, warm eyes' },
];

/* ── Product Shoot Templates ── */
interface ProductTemplate {
  id: string;
  name: string;
  description: string;
  category: 'Studio' | 'E-commerce' | 'Mystic' | 'Showcase';
  color: string;
}

const PRODUCT_SHOOT_TEMPLATES: ProductTemplate[] = [
  // Studio — universal
  { id: 'pt1', name: 'Pedestal Display', description: 'Product on a sleek modern pedestal or platform, clean studio lighting, elegant elevation', category: 'Studio', color: 'hsl(220 15% 70% / 0.25)' },
  { id: 'pt2', name: 'Reflective Surface', description: 'Product on glossy reflective black or white surface, mirror-like reflection below, dramatic studio lighting', category: 'Studio', color: 'hsl(220 15% 65% / 0.25)' },
  { id: 'pt3', name: 'Ghost Mannequin', description: 'Invisible mannequin effect, clean silhouette (apparel only)', category: 'Studio', color: 'hsl(220 15% 60% / 0.25)' },
  { id: 'pt4', name: 'Hanging on Rail', description: 'Product hanging on a professional clothing rail (apparel only)', category: 'Studio', color: 'hsl(220 15% 55% / 0.25)' },
  { id: 'pt5', name: 'Folded Stack', description: 'Neatly folded product in a stacked arrangement (apparel only)', category: 'Studio', color: 'hsl(220 15% 50% / 0.25)' },
  { id: 'pt-turntable', name: 'Turntable View', description: 'Product centered on turntable-style setup, 360-degree hero angle, neutral seamless background', category: 'Studio', color: 'hsl(220 15% 68% / 0.25)' },
  // E-commerce — universal
  { id: 'pt6', name: 'White Flat Lay', description: 'Flat lay on pure white background, top-down bird\'s eye view', category: 'E-commerce', color: 'hsl(0 0% 92% / 0.4)' },
  { id: 'pt7', name: 'Shadow Drop', description: 'Product on white/light background with natural drop shadow for depth', category: 'E-commerce', color: 'hsl(0 0% 85% / 0.35)' },
  { id: 'pt8', name: 'Pack Shot Grid', description: 'Multiple angles in a grid layout, comprehensive product views', category: 'E-commerce', color: 'hsl(0 0% 88% / 0.35)' },
  { id: 'pt9', name: 'Size Comparison', description: 'Product shown with scale reference objects for size context', category: 'E-commerce', color: 'hsl(0 0% 82% / 0.35)' },
  { id: 'pt-plain-bg', name: 'Plain Background', description: 'Product on pure solid color background, clean isolation, no props, marketplace-ready e-commerce shot', category: 'E-commerce', color: 'hsl(0 0% 95% / 0.4)' },
  // Mystic
  { id: 'pt11', name: 'Floating in Mist', description: 'Product suspended in ethereal fog, mysterious atmosphere', category: 'Mystic', color: 'hsl(270 40% 60% / 0.2)' },
  { id: 'pt12', name: 'Fabric Explosion', description: 'Dynamic burst of fabric in mid-air, motion energy', category: 'Mystic', color: 'hsl(340 50% 55% / 0.2)' },
  { id: 'pt13', name: 'Ethereal Glow', description: 'Soft halo lighting with dreamy atmosphere', category: 'Mystic', color: 'hsl(200 50% 65% / 0.2)' },
  { id: 'pt14', name: 'Dark Moody Drape', description: 'Rich shadows with dramatic fabric draping', category: 'Mystic', color: 'hsl(250 30% 30% / 0.3)' },
  { id: 'pt15', name: 'Surreal Levitation', description: 'Product defying gravity in an abstract scene', category: 'Mystic', color: 'hsl(180 40% 50% / 0.2)' },
  // Showcase — universal
  { id: 'pt16', name: 'Editorial Spread', description: 'Magazine-style editorial composition with props', category: 'Showcase', color: 'hsl(30 50% 60% / 0.2)' },
  { id: 'pt17', name: 'Contextual Use', description: 'Product shown in its natural use environment and context', category: 'Showcase', color: 'hsl(45 60% 70% / 0.2)' },
  { id: 'pt18', name: 'Styled Flat Lay', description: 'Curated accessories and props around product, top-down', category: 'Showcase', color: 'hsl(15 45% 55% / 0.2)' },
  { id: 'pt19', name: 'Textured Surface', description: 'Product on marble, wood, or fabric surface', category: 'Showcase', color: 'hsl(25 30% 50% / 0.2)' },
  { id: 'pt20', name: 'Color Story', description: 'Monochromatic arrangement highlighting tones', category: 'Showcase', color: 'hsl(350 40% 55% / 0.2)' },
];

const TEMPLATE_CATEGORIES = ['All', 'Studio', 'E-commerce', 'Mystic', 'Showcase'] as const;

const PLAIN_BG_COLORS = [
  { name: 'White', color: '#FFFFFF', border: true },
  { name: 'Light Gray', color: '#F0F0F0', border: false },
  { name: 'Beige', color: '#F5F0E8', border: false },
  { name: 'Cream', color: '#FFFDD0', border: false },
  { name: 'Soft Pink', color: '#FDE8E8', border: false },
  { name: 'Light Blue', color: '#E0EEFF', border: false },
  { name: 'Sage Green', color: '#E0EBE0', border: false },
  { name: 'Black', color: '#1A1A1A', border: false },
];

/* ── Style presets with product/model-specific settings ── */
interface StyleSettings {
  pose: string;
  angle: string;
  lighting: string;
  composition: string;
}

interface StylePreset {
  id: string;
  name: string;
  desc: string;
  img: string;
  product: StyleSettings;
  model: StyleSettings;
}

const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'classic', name: 'Classic', desc: 'Clean studio, neutral tones, timeless',
    img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80',
    product: { pose: 'Centered hero placement, product facing camera at slight angle', angle: 'Eye-level front-facing, straight-on with minimal perspective distortion', lighting: 'Soft diffused three-point lighting, even illumination, subtle shadows', composition: 'Rule of thirds, generous negative space, clean isolation' },
    model: { pose: 'Confident standing stance, one hand relaxed at side, slight hip shift', angle: 'Slightly low camera at 3/4 turn, medium full-body shot', lighting: 'Beauty dish key light with soft fill, gentle rim light for separation', composition: 'Full body centered frame, head space above, clean backdrop' },
  },
  {
    id: 'minimalist', name: 'Minimalist', desc: 'Stark white, breathing room, pure product',
    img: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&q=80',
    product: { pose: 'Single hero product floating or resting on invisible surface', angle: 'Straight-on eye-level, perfectly symmetrical framing', lighting: 'Ultra-soft flat lighting, zero harsh shadows, bright and airy', composition: 'Extreme negative space, centered subject, minimal distractions' },
    model: { pose: 'Still and poised, arms relaxed, minimal movement, serene expression', angle: 'Eye-level straight-on, clean symmetrical framing', lighting: 'Flat even lighting, very soft shadows, high-key bright', composition: 'Centered subject, vast white space, cropped at waist or full body' },
  },
  {
    id: 'luxury', name: 'Luxury', desc: 'Dark surfaces, gold accents, soft shadow',
    img: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&q=80',
    product: { pose: 'Product on dark marble or velvet surface, angled to catch light', angle: 'Slightly elevated 30° overhead, looking down at product', lighting: 'Dramatic side lighting with deep shadows, warm gold accents, single key light', composition: 'Off-center placement, dark moody background, luxe props in periphery' },
    model: { pose: 'Elegant pose, chin slightly elevated, one arm draped, sophisticated stance', angle: 'Low camera looking up slightly, 3/4 profile, waist-up or full body', lighting: 'Rembrandt lighting with warm tones, strong shadows on one side, gold reflector fill', composition: 'Dark backdrop, subject in warm light pool, cinematic crop' },
  },
  {
    id: 'loud-luxury', name: 'Loud Luxury', desc: 'Bold marble, dramatic lighting, opulence',
    img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80',
    product: { pose: 'Product elevated on marble pedestal or mirrored surface, bold angle', angle: 'Low dramatic angle looking up, wide lens for grandeur', lighting: 'High contrast split lighting, vivid color gels, specular highlights on surfaces', composition: 'Maximalist staging, rich textures (marble, gold, crystal), product as centerpiece' },
    model: { pose: 'Power pose, wide stance, expressive hand placement, commanding presence', angle: 'Very low camera angle shooting upward, emphasizing stature and power', lighting: 'Split lighting with colored gels, strong backlight silhouette, dramatic shadows', composition: 'Full body with opulent surroundings, mirror reflections, bold visual impact' },
  },
  {
    id: 'magazine', name: 'Magazine', desc: 'Editorial crops, sharp contrast, print-ready',
    img: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80',
    product: { pose: 'Product styled with editorial props, artful arrangement, story-driven', angle: 'Varied angles — overhead flat lay or dramatic 45° perspective', lighting: 'Hard directional light with sharp shadows, high contrast, flash-like crispness', composition: 'Asymmetric editorial layout, text space consideration, bold crops' },
    model: { pose: 'Dynamic fashion pose, movement in fabric, editorial expression, strong jawline', angle: 'Mixed — straight on for portraits, 3/4 for full body, Dutch angle for drama', lighting: 'Hard flash with sharp shadows, beauty lighting for face, contrast-heavy', composition: 'Tight editorial crops, dramatic framing, intentional negative space for text overlay' },
  },
  {
    id: 'avant-garde', name: 'Avant Garde', desc: 'Unexpected angles, abstract props, art-forward',
    img: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&q=80',
    product: { pose: 'Product suspended, floating, or placed in surreal arrangement', angle: 'Extreme angles — very low, very high, or Dutch tilt for disorientation', lighting: 'Colored gels, neon accents, unconventional light placement, mixed color temperatures', composition: 'Rule-breaking composition, abstract backgrounds, layered textures, visual tension' },
    model: { pose: 'Sculptural body position, unusual hand placement, contorted or geometric pose', angle: 'Extreme low or overhead, wide-angle distortion, close-up abstract crops', lighting: 'Multi-colored gels, harsh directional spots, theatrical shadow play', composition: 'Abstract framing, negative space as design element, fragmented body crops' },
  },
  {
    id: 'influencer', name: 'Influencer', desc: 'Golden hour, warm tones, candid lifestyle',
    img: 'https://images.unsplash.com/photo-1504703395950-b89145a5425b?w=400&q=80',
    product: { pose: 'Product held casually in hand or placed in lifestyle setting, natural feel', angle: 'Slightly above eye level selfie angle, shallow depth of field, f/1.8 feel', lighting: 'Golden hour natural light, warm backlighting, soft lens flare', composition: 'Casual off-center framing, bokeh background, authentic lifestyle context' },
    model: { pose: 'Casual candid mid-action — laughing, walking, hair toss, looking away from camera', angle: 'Slightly above eye level, close medium shot, shallow DOF with creamy bokeh', lighting: 'Golden hour backlight, warm natural fill, soft glowy skin tones', composition: 'Off-center subject, lifestyle environment in bokeh, Instagram-ready crop (4:5)' },
  },
  {
    id: 'lifestyle', name: 'Lifestyle', desc: 'Everyday environments, natural light, relatable',
    img: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&q=80',
    product: { pose: 'Product in natural use context — on a table, in a bag, being worn', angle: 'Natural eye-level perspective, as if viewer is in the scene', lighting: 'Window light or open shade, soft natural illumination, warm or neutral tones', composition: 'Environmental context, product integrated into scene, lifestyle props' },
    model: { pose: 'Natural everyday movement — sitting, leaning, walking, genuine smile', angle: 'Eye-level conversational distance, medium shot, natural perspective', lighting: 'Soft window light or outdoor open shade, natural skin tones, even exposure', composition: 'Environmental portrait, lifestyle context visible, product naturally integrated' },
  },
  {
    id: 'plain-bg', name: 'Plain Background', desc: 'Solid color backdrop, pure product focus',
    img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80',
    product: { pose: 'Product centered, clean isolation, no props, floating on solid color', angle: 'Straight-on eye-level, perfectly symmetrical', lighting: 'Even diffused lighting from all sides, zero harsh shadows, shadowless', composition: 'Dead center placement, maximum negative space, pure solid background' },
    model: { pose: 'Standing straight, relaxed natural pose, facing camera directly', angle: 'Eye-level straight-on, full body or 3/4 crop', lighting: 'Even flat lighting, soft fill from all directions, no dramatic shadows', composition: 'Centered subject, pure solid color background, no props or distractions' },
  },
];

/* ── Steps ── */
const STEPS = [
  { id: 1, label: 'Product' },
  { id: 2, label: 'Model Setup' },
  { id: 3, label: 'Style & Preset' },
  { id: 4, label: 'Generate' },
  { id: 5, label: 'Export' },
];

const GENERATION_STAGES = [
  { threshold: 20, label: 'Preparing your product...' },
  { threshold: 50, label: 'Building the scene...' },
  { threshold: 80, label: 'Rendering your shots...' },
  { threshold: 100, label: 'Finishing up...' },
];

const EXPORT_FORMATS = [
  { id: 'png', label: 'PNG', default: true },
  { id: 'webp', label: 'WebP', default: false },
  { id: 'jpeg', label: 'JPEG', default: false },
];

const EDIT_SUGGESTIONS = [
  'make the background darker',
  'add more shadow under the product',
  'change to outdoor setting',
  'warmer lighting',
];

/* ── Asset with product_label for Products view ── */
interface ProjectAsset {
  id: string;
  url: string;
  asset_type: string;
  product_label: string | null;
  shot_label: string | null;
  created_at: string;
}

const Studio = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [stepSummaries, setStepSummaries] = useState<Record<number, string>>({});

  // Toolbar view switcher
  const [toolbarView, setToolbarView] = useState<'studio' | 'assets' | 'products'>('studio');
  const [projectAssets, setProjectAssets] = useState<ProjectAsset[]>([]);
  const [selectedProductLabel, setSelectedProductLabel] = useState<string | null>(null);

  // Product images (Step 1)
  const [productImages, setProductImages] = useState<string[]>([]);
  const productUploadRef = useRef<HTMLInputElement>(null);

  // Model config
  const [modelConfig, setModelConfig] = useState<ModelConfig>({
    selectedModel: null,
    uploadedModelUrl: null,
    gender: '',
    ethnicity: '',
    bodyType: '',
    background: '',
    backgroundPrompt: '',
    aiEngine: 'gemini',
  });

  // Style settings (auto-computed from preset or reference AI)
  const [styleSettings, setStyleSettings] = useState<StyleSettings | null>(null);
  const [stylePrompt, setStylePrompt] = useState('');
  const [analyzingStyle, setAnalyzingStyle] = useState(false);

  // Style config
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [shotCount, setShotCount] = useState<string>('campaign');
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');
  const [plainBgColor, setPlainBgColor] = useState<string>('White');
  const [additionalContext, setAdditionalContext] = useState('');

  // Generation state
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStage, setGenerationStage] = useState('');
  const [generatedShots, setGeneratedShots] = useState<GeneratedShot[]>([]);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [exportFormat, setExportFormat] = useState<string>('png');
  const [selectedExportShots, setSelectedExportShots] = useState<Set<string>>(new Set());
  const generationAbortRef = useRef(false);

  // Video state
  const [videoExpanded, setVideoExpanded] = useState(false);
  const [videoConfig, setVideoConfig] = useState<VideoConfig>({ baseImageId: '', duration: 4, resolution: '720p', engine: 'veo', aspectRatio: '9:16' });
  const [videoGenerating, setVideoGenerating] = useState(false);
  const [videoStage, setVideoStage] = useState('');
  const [generatedVideo, setGeneratedVideo] = useState<GeneratedVideo | null>(null);
  const videoAbortRef = useRef(false);
  const [videoPrompts, setVideoPrompts] = useState<VideoPrompt[]>([]);
  const [videoPromptsLoading, setVideoPromptsLoading] = useState(false);
  const [videoPromptStep, setVideoPromptStep] = useState<'config' | 'prompts' | 'generating' | 'done'>('config');

  // AI Product Recognition
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
  const [analyzingProduct, setAnalyzingProduct] = useState(false);
  const [analysisPhase, setAnalysisPhase] = useState<'idle' | 'analyzing' | 'done'>('idle');
  const [productName, setProductName] = useState('');

  // Model detection choice
  const [modelChoice, setModelChoice] = useState<'remove' | 'keep' | null>(null);
  const [removingBackground, setRemovingBackground] = useState(false);

  // Shoot type selection (Step 2)
  const [shootType, setShootType] = useState<'product' | 'model' | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [templateCategory, setTemplateCategory] = useState<string>('All');

  // Portrait generation (lifted from Step2Viewport)
  const [modelImages, setModelImages] = useState<Record<string, string>>({});
  const [generatingPortraits, setGeneratingPortraits] = useState(false);
  const [portraitProgress, setPortraitProgress] = useState(0);
  const [portraitTotal, setPortraitTotal] = useState(0);

  const referenceInputRef = useRef<HTMLInputElement>(null);
  const modelUploadRef = useRef<HTMLInputElement>(null);

  /* ── Load persisted model portraits from DB ── */
  useEffect(() => {
    const loadPortraits = async () => {
      const { data, error } = await supabase
        .from('model_portraits')
        .select('model_key, image_url');
      if (error) {
        console.error('Failed to load model portraits:', error);
        return;
      }
      if (data && data.length > 0) {
        const map: Record<string, string> = {};
        data.forEach(row => { map[row.model_key] = row.image_url; });
        setModelImages(map);
      }
    };
    loadPortraits();
  }, []);

  /* ── Generate all model portraits (skip existing) ── */
  const handleGeneratePortraits = useCallback(async () => {
    // Filter out models that already have portraits
    const missingModels = PLACEHOLDER_MODELS.filter(m => !modelImages[m.id]);
    if (missingModels.length === 0) {
      toast({ title: 'All portraits already generated', description: 'All 40 model portraits are ready.' });
      return;
    }

    setGeneratingPortraits(true);
    setPortraitProgress(0);
    setPortraitTotal(missingModels.length);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({ title: 'Error', description: 'Please log in first', variant: 'destructive' });
      setGeneratingPortraits(false);
      return;
    }

    const BATCH_SIZE = 2;
    let completed = 0;

    for (let i = 0; i < missingModels.length; i += BATCH_SIZE) {
      const batch = missingModels.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (m) => {
          try {
            const { data, error } = await supabase.functions.invoke('generate-model-portraits', {
              body: { model: m },
            });
            if (error) throw error;
            // Save to database
            await supabase.from('model_portraits').upsert(
              { model_key: data.modelId, image_url: data.imageUrl },
              { onConflict: 'model_key' }
            );
            return { modelId: data.modelId, imageUrl: data.imageUrl };
          } catch (err) {
            console.error(`Failed to generate portrait for ${m.name}:`, err);
            return null;
          }
        })
      );

      results.forEach((r) => {
        if (r.status === 'fulfilled' && r.value) {
          setModelImages(prev => ({ ...prev, [r.value!.modelId]: r.value!.imageUrl }));
        }
        completed++;
        setPortraitProgress(completed);
      });

      if (i + BATCH_SIZE < missingModels.length) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    setGeneratingPortraits(false);
  }, [modelImages]);

  /* ── Product labels for toolbar dropdown ── */
  const [projectProducts, setProjectProducts] = useState<string[]>([]);

  /* ── Fetch project data ── */
  useEffect(() => {
    if (!user || !id) return;
    const fetchData = async () => {
      const [{ data: proj }, { data: assetData }] = await Promise.all([
        supabase.from('projects').select('*').eq('id', id).eq('user_id', user.id).single(),
        supabase.from('assets').select('*').eq('project_id', id),
      ]);
      if (proj) {
        setProject(proj);
        // Store all assets for Assets/Products views
        setProjectAssets((assetData ?? []).map((a: any) => ({
          id: a.id, url: a.url, asset_type: a.asset_type,
          product_label: a.product_label, shot_label: a.shot_label, created_at: a.created_at,
        })));
        // Extract distinct product labels for toolbar dropdown
        const generated = assetData?.filter((a: any) => a.asset_type === 'ai_generated') ?? [];
        const labels = [...new Set(generated.map((a: any) => a.product_label).filter(Boolean))] as string[];
        setProjectProducts(labels);

        // Only load originals — always start fresh at step 1
        const originals = assetData?.filter((a: any) => a.asset_type === 'original') ?? [];
        if (originals.length > 0) setAssets(originals);
      }
      setLoading(false);
    };
    fetchData();
  }, [user, id]);

  /* ── Load a specific product's generated assets ── */
  const loadProductAssets = async (label: string) => {
    if (!id) return;
    const { data } = await supabase.from('assets').select('*').eq('project_id', id).eq('asset_type', 'ai_generated').eq('product_label', label);
    if (data && data.length > 0) {
      setGeneratedShots(data.map((a: any) => ({
        id: a.id, url: a.url, shotLabel: a.shot_label || 'hero', promptUsed: a.prompt_used || '',
        isEditing: false, editPrompt: '', isRegenerating: false, previousUrl: null, showUndo: false,
      })));
      setSelectedExportShots(new Set(data.map((a: any) => a.id)));
      setCompletedSteps(new Set([1, 2, 3, 4]));
      setActiveStep(5);
      setShowExportPanel(true);
    }
  };

  /* ── Reset workspace for new product ── */
  const resetWorkspace = useCallback(() => {
    setActiveStep(1);
    setCompletedSteps(new Set());
    setStepSummaries({});
    setProductImages([]);
    setProductInfo(null);
    setProductName('');
    setAnalyzingProduct(false);
    setAnalysisPhase('idle');
    setModelChoice(null);
    setRemovingBackground(false);
    setShootType(null);
    setSelectedTemplate(null);
    setTemplateCategory('All');
    setModelConfig({ selectedModel: null, uploadedModelUrl: null, gender: '', ethnicity: '', bodyType: '', background: '', backgroundPrompt: '', aiEngine: 'gemini' });
    setStyleSettings(null);
    setStylePrompt('');
    setSelectedPreset(null);
    setReferenceImage(null);
    setShotCount('campaign');
    setAspectRatio('1:1');
    setPlainBgColor('White');
    setAdditionalContext('');
    setGenerationProgress(0);
    setGenerationStage('');
    setGeneratedShots([]);
    setShowExportPanel(false);
    setExportFormat('png');
    setSelectedExportShots(new Set());
    setVideoExpanded(false);
    setVideoConfig({ baseImageId: '', duration: 4, resolution: '720p', engine: 'veo', aspectRatio: '9:16' });
    setVideoGenerating(false);
    setVideoStage('');
    setGeneratedVideo(null);
    toast({ title: 'Workspace reset', description: 'Ready for a new product shoot.' });
  }, []);

  const thumbnailUrl = productImages[0] ?? assets[0]?.url ?? null;

  /* ── AI Product Analysis ── */
  const analyzeProduct = useCallback(async (imageUrl: string) => {
    setAnalyzingProduct(true);
    setAnalysisPhase('analyzing');
    setProductInfo(null);
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      const { data, error } = await supabase.functions.invoke('analyze-product', {
        body: { image: base64 },
      });

      if (error || !data) {
        console.error('Product analysis failed:', error);
        setAnalyzingProduct(false);
        setAnalysisPhase('idle');
        return;
      }
      setProductInfo(data);
      setProductName(data.productName || '');
      setAnalysisPhase('done');
    } catch (e) {
      console.error('Product analysis error:', e);
      setAnalysisPhase('idle');
    }
    setAnalyzingProduct(false);
  }, []);

  /* ── Step 1 handlers ── */
  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !id) return;

    const uploadedUrls: string[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('originals')
        .upload(filePath, file, { contentType: file.type, upsert: false });
      if (uploadErr) {
        console.error('Upload error:', uploadErr);
        toast({ title: 'Upload failed', description: uploadErr.message, variant: 'destructive' });
        continue;
      }
      const { data: publicUrlData } = supabase.storage.from('originals').getPublicUrl(filePath);
      uploadedUrls.push(publicUrlData.publicUrl);
    }

    if (uploadedUrls.length > 0) {
      setProductImages(prev => {
        const updated = [...prev, ...uploadedUrls];
        if (prev.length === 0 && updated.length > 0) {
          analyzeProduct(updated[0]);
        }
        return updated;
      });
    }
    e.target.value = '';
  };

  const handleRemoveProductImage = (index: number) => {
    setProductImages(prev => {
      const next = [...prev];
      next.splice(index, 1);
      if (index === 0 && next.length > 0) {
        analyzeProduct(next[0]);
      } else if (next.length === 0) {
        setProductInfo(null);
      }
      return next;
    });
  };

  const handleCompleteStep1 = () => {
    if (productImages.length === 0) return;
    // If model detected and no choice made, don't proceed
    if (productInfo?.hasModel && !modelChoice) {
      toast({ title: 'Choose an option', description: 'Please select "Remove Background" or "Keep Model" before continuing.', variant: 'destructive' });
      return;
    }
    completeStep(1, `${productImages.length} image${productImages.length > 1 ? 's' : ''}${modelChoice === 'keep' ? ' · Keep Model' : ''}`, 2);
  };

  /* ── Remove background handler ── */
  const handleRemoveBackground = async () => {
    if (!productImages[0] || !id) return;
    setRemovingBackground(true);
    try {
      const response = await fetch(productImages[0]);
      const blob = await response.blob();
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      const { data, error } = await supabase.functions.invoke('remove-background', {
        body: { image: base64, projectId: id, category: productInfo?.category },
      });

      if (error || !data?.url) {
        toast({ title: 'Background removal failed', description: data?.error || error?.message || 'Unknown error', variant: 'destructive' });
        setRemovingBackground(false);
        return;
      }

      // Replace primary image with cleaned version
      setProductImages(prev => {
        const updated = [...prev];
        updated[0] = data.url;
        return updated;
      });
      setModelChoice('remove');
      // Re-analyze the cleaned image
      analyzeProduct(data.url);
      toast({ title: 'Background removed', description: 'Product image cleaned successfully.' });
    } catch (e) {
      console.error('Remove background error:', e);
      toast({ title: 'Background removal failed', description: 'Network error', variant: 'destructive' });
    }
    setRemovingBackground(false);
  };

  const handleKeepModel = () => {
    setModelChoice('keep');
    setShootType('model');
    toast({ title: 'Model kept', description: 'Shots will be generated with the same model.' });
  };

  /* ── Step navigation ── */
  const goToStep = (step: number) => {
    if (completedSteps.has(step) || step === activeStep) setActiveStep(step);
  };

  const completeStep = useCallback((step: number, summary: string, next: number) => {
    setCompletedSteps(prev => new Set([...prev, step]));
    setStepSummaries(prev => ({ ...prev, [step]: summary }));
    setActiveStep(next);
  }, []);

  const handleCompleteStep2 = () => {
    if (shootType === 'product') {
      const tpl = PRODUCT_SHOOT_TEMPLATES.find(t => t.id === selectedTemplate);
      completeStep(2, tpl ? `Product · ${tpl.name}` : 'Product Shoot', 3);
    } else {
      const parts = [modelConfig.aiEngine === 'gemini' ? 'Gemini' : 'Runway'];
      if (modelConfig.gender) parts.push(modelConfig.gender);
      if (modelConfig.ethnicity) parts.push(modelConfig.ethnicity);
      completeStep(2, parts.join(' · '), 3);
    }
  };

  const handleModelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setModelConfig(prev => ({ ...prev, uploadedModelUrl: url, selectedModel: null }));
    }
  };

  const handleReferenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setReferenceImage(url);
    setSelectedPreset('custom');
    setStyleSettings(null);
    setStylePrompt('');

    // Analyze reference image via AI
    setAnalyzingStyle(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('analyze-style-reference', {
        body: { image: base64, shootType: shootType || 'product', productCategory: productInfo?.category || project?.category },
      });

      if (!error && data) {
        setStyleSettings({
          pose: data.pose || '',
          angle: data.angle || '',
          lighting: data.lighting || '',
          composition: data.composition || '',
        });
        setStylePrompt(data.fullPrompt || '');
      }
    } catch (err) {
      console.error('Style reference analysis failed:', err);
    }
    setAnalyzingStyle(false);
  };

  /* ── Build style prompt from preset ── */
  const buildStylePrompt = useCallback((preset: StylePreset, isModel: boolean, info?: ProductInfo | null, bgColor?: string): string => {
    const settings = isModel ? preset.model : preset.product;
    const productDesc = info
      ? `${info.category} product (${info.colors?.join(', ') || 'neutral tones'}, ${info.material || 'premium materials'})`
      : 'product';
    const garmentInfo = info?.garmentType ? ` — specifically a ${info.garmentType}` : '';
    const outfitInfo = isModel && info?.outfitSuggestion ? ` Styled with: ${info.outfitSuggestion}.` : '';
    const plainBgInstruction = preset.id === 'plain-bg' && bgColor
      ? ` CRITICAL: The background MUST be a pure solid ${bgColor} color. No texture, no gradient, no patterns, no props, no environment — completely clean flat ${bgColor} backdrop filling the entire background.`
      : '';

    return `${preset.name} style photography for a ${productDesc}${garmentInfo}. ` +
      `Pose: ${settings.pose}. ` +
      `Camera angle: ${settings.angle}. ` +
      `Lighting: ${settings.lighting}. ` +
      `Composition: ${settings.composition}.${outfitInfo}${plainBgInstruction}`;
  }, []);

  // Auto-compute stylePrompt + styleSettings when preset changes
  useEffect(() => {
    if (!selectedPreset || selectedPreset === 'custom') return;
    const preset = STYLE_PRESETS.find(p => p.id === selectedPreset);
    if (!preset) return;
    const isModel = shootType === 'model';
    const settings = isModel ? preset.model : preset.product;
    setStyleSettings(settings);
    setStylePrompt(buildStylePrompt(preset, isModel, productInfo, plainBgColor));
  }, [selectedPreset, shootType, productInfo, buildStylePrompt, plainBgColor]);

  /* ── Generation ── */
  const handleGenerate = async (mode?: 'single' | 'campaign_add') => {
    if (!project) return;
    // For product shoot with template, we don't need selectedPreset
    const isProductWithTemplate = shootType === 'product' && selectedTemplate;
    if (!isProductWithTemplate && !selectedPreset) return;

    const tpl = isProductWithTemplate ? PRODUCT_SHOOT_TEMPLATES.find(t => t.id === selectedTemplate) : null;
    const stepLabel = isProductWithTemplate
      ? tpl?.name || 'Product Shoot'
      : STYLE_PRESETS.find(p => p.id === selectedPreset)?.name || selectedPreset || '';
    completeStep(3, stepLabel, 4);
    generationAbortRef.current = false;
    setGenerationProgress(0);
    setGenerationStage(GENERATION_STAGES[0].label);

    const progressInterval = setInterval(() => {
      if (generationAbortRef.current) { clearInterval(progressInterval); return; }
      setGenerationProgress(prev => {
        const next = Math.min(prev + 2, 90);
        const stage = GENERATION_STAGES.find(s => next <= s.threshold);
        if (stage) setGenerationStage(stage.label);
        return next;
      });
    }, 200);

    try {
      const productImageUrl = productImages[0] || assets[0]?.url || null;
      const effectiveShotCount = mode === 'campaign_add' ? 'campaign_add' : mode === 'single' ? 'single' : shotCount;

      // Build stylePrompt for product shoot with template
      let effectiveStylePrompt = stylePrompt || undefined;
      if (isProductWithTemplate && tpl) {
        let templatePrompt = tpl.description;
        if (tpl.id === 'pt-plain-bg') {
          templatePrompt += `. CRITICAL: The background MUST be a pure solid ${plainBgColor} color. No texture, no gradient, no patterns, no props — completely clean flat ${plainBgColor} backdrop.`;
        }
        effectiveStylePrompt = templatePrompt;
      }

      const { data, error } = await supabase.functions.invoke('generate-shots', {
          body: {
          projectId: project.id, preset: selectedPreset || 'template', shotCount: effectiveShotCount, additionalContext,
          category: project.category, shotType: shootType === 'model' ? 'model_shot' : 'product_showcase',
          modelConfig: shootType === 'model' ? modelConfig : null,
          stylePrompt: effectiveStylePrompt,
          productImageUrl,
          aspectRatio,
          keepOriginalModel: modelChoice === 'keep',
          productLabel: productInfo?.productName || productName || 'Untitled',
          sceneTemplate: isProductWithTemplate ? { id: tpl!.id, description: tpl!.description, name: tpl!.name } : undefined,
        },
      });
      clearInterval(progressInterval);
      if (generationAbortRef.current) return;
      if (error || !data?.assets) {
        toast({ title: 'Generation failed', description: data?.error || error?.message || 'Unknown error', variant: 'destructive' });
        setActiveStep(3);
        setCompletedSteps(prev => { const n = new Set(prev); n.delete(3); return n; });
        return;
      }
      setGenerationProgress(100);
      setGenerationStage('Done!');
      await new Promise(r => setTimeout(r, 600));

      const newShots: GeneratedShot[] = data.assets.map((a: any) => ({
        id: a.id, url: a.url, shotLabel: a.shot_label || 'hero', promptUsed: a.prompt_used || '',
        isEditing: false, editPrompt: '', isRegenerating: false, previousUrl: null, showUndo: false,
      }));
      if (mode === 'campaign_add') {
        const allShots = [...generatedShots, ...newShots];
        setGeneratedShots(allShots);
        setSelectedExportShots(new Set(allShots.map(s => s.id)));
        completeStep(4, `${allShots.length} shot${allShots.length > 1 ? 's' : ''}`, 5);
      } else {
        setGeneratedShots(newShots);
        setSelectedExportShots(new Set(newShots.map(s => s.id)));
        completeStep(4, `${newShots.length} shot${newShots.length > 1 ? 's' : ''}`, 5);
      }
      setShowExportPanel(true);
      // Refresh product labels for toolbar dropdown
      const pLabel = productInfo?.productName || productName || 'Untitled';
      setProjectProducts(prev => prev.includes(pLabel) ? prev : [...prev, pLabel]);
    } catch {
      clearInterval(progressInterval);
      toast({ title: 'Generation failed', description: 'Network error', variant: 'destructive' });
      setActiveStep(3);
    }
  };

  const handleCancelGeneration = () => {
    generationAbortRef.current = true;
    setActiveStep(3);
    setCompletedSteps(prev => { const n = new Set(prev); n.delete(3); return n; });
  };

  /* ── Per-shot editing ── */
  const updateShot = (shotId: string, updates: Partial<GeneratedShot>) => {
    setGeneratedShots(prev => prev.map(s => s.id === shotId ? { ...s, ...updates } : s));
  };

  const handleEditShot = async (shot: GeneratedShot) => {
    if (!shot.editPrompt.trim()) return;
    const previousUrl = shot.url;
    updateShot(shot.id, { isRegenerating: true, isEditing: false });
    try {
      const { data, error } = await supabase.functions.invoke('edit-shot', {
        body: { assetId: shot.id, editPrompt: shot.editPrompt },
      });
      if (error || !data?.asset) {
        toast({ title: 'Edit failed', description: data?.error || error?.message || 'Unknown error', variant: 'destructive' });
        updateShot(shot.id, { isRegenerating: false, isEditing: true });
        return;
      }
      updateShot(shot.id, {
        url: data.asset.url, promptUsed: data.asset.prompt_used, isRegenerating: false,
        editPrompt: '', previousUrl, showUndo: true,
      });
      setTimeout(() => updateShot(shot.id, { showUndo: false, previousUrl: null }), 5000);
    } catch {
      updateShot(shot.id, { isRegenerating: false, isEditing: true });
      toast({ title: 'Edit failed', description: 'Network error', variant: 'destructive' });
    }
  };

  const handleUndoEdit = async (shot: GeneratedShot) => {
    if (!shot.previousUrl) return;
    await supabase.from('assets').update({ url: shot.previousUrl }).eq('id', shot.id);
    updateShot(shot.id, { url: shot.previousUrl, previousUrl: null, showUndo: false });
  };

  const handleRegenerateAll = () => {
    toast({
      title: `Regenerate all ${generatedShots.length} shots?`,
      description: `This will replace all shots and cost ${generatedShots.length} credits.`,
      action: <Button size="sm" onClick={() => handleGenerate()}>Confirm</Button>,
    });
  };

  const handleDownload = () => {
    const selected = generatedShots.filter(s => selectedExportShots.has(s.id));
    selected.forEach(shot => {
      const link = document.createElement('a');
      link.href = shot.url;
      link.download = `${project?.name || 'shot'}-${shot.shotLabel}.${exportFormat}`;
      link.target = '_blank';
      link.click();
    });
    toast({ title: `Downloading ${selected.length} shot${selected.length > 1 ? 's' : ''}` });
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: 'Link copied to clipboard' });
  };

  /* ── Generate video prompts ── */
  const handleGenerateVideoPrompts = async () => {
    if (!project) return;
    setVideoPromptsLoading(true);
    setVideoPrompts([]);
    try {
      const selectedShot = generatedShots.find(s => s.id === videoConfig.baseImageId);
      const { data, error } = await supabase.functions.invoke('generate-video-prompts', {
        body: {
          category: project.category || productInfo?.category || '',
          productName: productName || productInfo?.productName || project.name,
          productImageUrl: selectedShot?.url || null,
        },
      });
      if (error || !data?.prompts) {
        toast({ title: 'Failed to generate prompts', description: data?.error || error?.message || 'Unknown error', variant: 'destructive' });
        setVideoPromptsLoading(false);
        return;
      }
      setVideoPrompts(data.prompts);
      setVideoPromptStep('prompts');
    } catch {
      toast({ title: 'Failed to generate prompts', description: 'Network error', variant: 'destructive' });
    }
    setVideoPromptsLoading(false);
  };

  /* ── Video generation ── */
  const handleGenerateVideo = async () => {
    if (!project || !videoConfig.baseImageId) return;
    setVideoGenerating(true);
    setVideoPromptStep('generating');
    videoAbortRef.current = false;
    setVideoStage(VIDEO_STAGES[0]);
    let stageIdx = 0;
    const stageInterval = setInterval(() => {
      if (videoAbortRef.current) { clearInterval(stageInterval); return; }
      stageIdx = (stageIdx + 1) % VIDEO_STAGES.length;
      setVideoStage(VIDEO_STAGES[stageIdx]);
    }, 5000);

    try {
      const { data, error } = await supabase.functions.invoke('generate-video', {
        body: {
          assetId: videoConfig.baseImageId, duration: videoConfig.duration,
          resolution: videoConfig.resolution, engine: videoConfig.engine,
          projectId: project.id, aspectRatio: videoConfig.aspectRatio,
          prompt: videoConfig.selectedPrompt?.text || null,
        },
      });
      clearInterval(stageInterval);
      if (videoAbortRef.current) return;
      if (error || !data?.asset) {
        toast({ title: 'Video generation failed', description: data?.error || error?.message || 'Unknown error', variant: 'destructive' });
        setVideoGenerating(false);
        setVideoPromptStep('prompts');
        return;
      }
      setGeneratedVideo({
        id: data.asset.id, url: data.asset.url, duration: videoConfig.duration,
        resolution: videoConfig.resolution, engine: videoConfig.engine,
      });
      setVideoGenerating(false);
      setVideoPromptStep('done');
    } catch (e: any) {
      clearInterval(stageInterval);
      setVideoGenerating(false);
      setVideoPromptStep('prompts');
      toast({ title: 'Video generation failed', description: e?.message || 'Network error — the generation may still be processing', variant: 'destructive' });
    }
  };

  const handleCancelVideo = () => {
    videoAbortRef.current = true;
    setVideoGenerating(false);
    setVideoPromptStep('config');
  };

  const credits = shotCount === 'campaign' ? 6 : 1;
  const canGenerate = ((selectedPreset || referenceImage) && shotCount) || (shootType === 'product' && selectedTemplate && shotCount);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-muted-foreground">Project not found.</p>
        <Button variant="outline" onClick={() => navigate('/app/projects')}>Back to Projects</Button>
      </div>
    );
  }

  // Resolve selected model for viewport preview
  const selectedModelData = PLACEHOLDER_MODELS.find(m => m.id === modelConfig.selectedModel);
  const selectedPresetData = STYLE_PRESETS.find(p => p.id === selectedPreset);

  return (
    <div className="flex h-screen">
      {/* ════════════════════════════════════════════
          LEFT PANEL — Config (only shown for Studio view)
         ════════════════════════════════════════════ */}
      <div className="w-[340px] shrink-0 border-r border-border bg-card flex flex-col h-screen overflow-hidden">
        {/* ── Fixed Header ── */}
        <div className="p-4 pb-3 space-y-4 shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground" onClick={() => navigate('/app/projects')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <p className="font-medium text-sm truncate flex-1">{project.name}</p>
          </div>

          {toolbarView === 'studio' && (
            /* Horizontal step indicator */
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                {STEPS.map((step, i) => {
                  const isCompleted = completedSteps.has(step.id);
                  const isActive = activeStep === step.id;
                  const isClickable = isCompleted || isActive;
                  return (
                    <button
                      key={step.id}
                      onClick={() => goToStep(step.id)}
                      disabled={!isClickable}
                      className="flex-1 group"
                    >
                      <div className={`h-1.5 rounded-full transition-all ${
                        isCompleted
                          ? 'bg-primary'
                          : isActive
                            ? 'bg-primary/60'
                            : 'bg-border'
                      } ${isClickable ? 'cursor-pointer group-hover:opacity-80' : 'cursor-default'}`} />
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-foreground">
                  {STEPS.find(s => s.id === activeStep)?.label}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Step {activeStep} of {STEPS.length}
                </p>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* ── Scrollable content ── */}
        {toolbarView === 'studio' ? (
          <>
            <ScrollArea className="flex-1">
              <div className="p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                {activeStep === 1 && (
                  <Step1Config
                    productImages={productImages}
                    productUploadRef={productUploadRef}
                    onUpload={handleProductImageUpload}
                    onRemove={handleRemoveProductImage}
                  />
                )}
                {activeStep === 2 && (
                  <Step2Config
                    shootType={shootType}
                    setShootType={setShootType}
                    modelConfig={modelConfig}
                    setModelConfig={setModelConfig}
                    modelUploadRef={modelUploadRef}
                    onModelUpload={handleModelUpload}
                    selectedTemplate={selectedTemplate}
                    setSelectedTemplate={setSelectedTemplate}
                    templateCategory={templateCategory}
                    setTemplateCategory={setTemplateCategory}
                    selectedModelData={selectedModelData}
                    modelImages={modelImages}
                    productInfo={productInfo}
                  />
                )}
                {activeStep === 3 && (
                  <Step3Config
                    selectedPreset={selectedPreset}
                    setSelectedPreset={setSelectedPreset}
                    referenceImage={referenceImage}
                    setReferenceImage={setReferenceImage}
                    referenceInputRef={referenceInputRef}
                    onReferenceUpload={handleReferenceUpload}
                    shotCount={shotCount}
                    setShotCount={setShotCount}
                    aspectRatio={aspectRatio}
                    setAspectRatio={setAspectRatio}
                    additionalContext={additionalContext}
                    setAdditionalContext={setAdditionalContext}
                    styleSettings={styleSettings}
                    analyzingStyle={analyzingStyle}
                    plainBgColor={plainBgColor}
                    setPlainBgColor={setPlainBgColor}
                    shootType={shootType}
                    selectedTemplate={selectedTemplate}
                  />
                )}
                {activeStep === 4 && (
                  <div className="space-y-4 py-8">
                    <div className="flex flex-col items-center text-center gap-3">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <div>
                        <p className="text-sm font-medium">{generationStage || 'Processing...'}</p>
                        <p className="text-xs text-muted-foreground mt-1">This may take a moment</p>
                      </div>
                      <Progress value={generationProgress} className="h-1.5 w-full max-w-[200px]" />
                    </div>
                  </div>
                )}
                {activeStep === 5 && (
                  <Step5Config
                    shots={generatedShots}
                    exportFormat={exportFormat}
                    setExportFormat={setExportFormat}
                    selectedShots={selectedExportShots}
                    setSelectedShots={setSelectedExportShots}
                    generatedVideo={generatedVideo}
                    onRegenerateAll={handleRegenerateAll}
                    aspectRatio={aspectRatio}
                  />
                )}
              </div>
            </ScrollArea>

            {/* ── Fixed Footer CTA ── */}
            <div className="shrink-0 border-t border-border p-4 space-y-2 bg-card">
              {activeStep === 1 && (
                <Button className="w-full" disabled={productImages.length === 0} onClick={handleCompleteStep1}>
                  Continue
                </Button>
              )}
              {activeStep === 2 && (
                <Button className="w-full" disabled={!shootType || (shootType === 'product' && !selectedTemplate)} onClick={handleCompleteStep2}>
                  Continue to Style
                </Button>
              )}
              {activeStep === 3 && (
                <Button className="w-full" disabled={!canGenerate} onClick={() => handleGenerate()}>
                  Generate — {credits} credit{credits > 1 ? 's' : ''}
                </Button>
              )}
              {activeStep === 4 && (
                <Button variant="outline" className="w-full" onClick={handleCancelGeneration}>
                  Cancel
                </Button>
              )}
              {activeStep === 5 && (
                <Button className="w-full" onClick={handleDownload} disabled={selectedExportShots.size === 0}>
                  <Download className="h-4 w-4 mr-2" /> Download {selectedExportShots.size} shot{selectedExportShots.size !== 1 ? 's' : ''}
                </Button>
              )}
              <p className="text-[10px] text-muted-foreground text-center">
                {profile?.credits_remaining ?? 0} credits remaining
              </p>
            </div>
          </>
        ) : (
          /* Empty panel for Assets / Products views */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-3">
              {toolbarView === 'assets' ? <LayoutGrid className="h-6 w-6 text-muted-foreground" /> : <Tag className="h-6 w-6 text-muted-foreground" />}
            </div>
            <p className="text-sm font-medium text-foreground">{toolbarView === 'assets' ? 'Asset Library' : 'Products'}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {toolbarView === 'assets' ? 'All uploaded and generated images for this project.' : 'Your products grouped by name.'}
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setToolbarView('studio')}>
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to Studio
            </Button>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════
          RIGHT PANEL — Viewport
         ════════════════════════════════════════════ */}
      <div className="flex-1 overflow-hidden bg-muted/30 h-screen relative canvas-dots">
        {/* ── Floating Studio Toolbar ── */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 p-[30px] group/toolbar pointer-events-auto">
          <div className="flex items-center gap-1 px-2 py-1.5 rounded-full border bg-background/80 backdrop-blur-md shadow-lg opacity-40 group-hover/toolbar:opacity-100 transition-opacity duration-300">
            {/* Studio tab */}
            <button
              onClick={() => setToolbarView('studio')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                toolbarView === 'studio'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Studio
            </button>
            <div className="w-px h-5 bg-border" />
            {/* Assets tab */}
            <button
              onClick={() => setToolbarView('assets')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                toolbarView === 'assets'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Assets
              {projectAssets.length > 0 && (
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                  toolbarView === 'assets' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/10 text-primary'
                }`}>{projectAssets.length}</span>
              )}
            </button>
            <div className="w-px h-5 bg-border" />
            {/* Products tab */}
            <button
              onClick={() => { setToolbarView('products'); setSelectedProductLabel(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                toolbarView === 'products'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <Tag className="h-3.5 w-3.5" />
              Products
              {projectProducts.length > 0 && (
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                  toolbarView === 'products' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/10 text-primary'
                }`}>{projectProducts.length}</span>
              )}
            </button>
            <div className="w-px h-5 bg-border" />
            {/* New Product */}
            <button
              onClick={() => { resetWorkspace(); setToolbarView('studio'); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-accent text-accent-foreground hover:bg-accent/80 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              New Product
            </button>
          </div>
        </div>

        {/* ── Viewport content ── */}
        {toolbarView === 'studio' && (
          <>
            {activeStep === 1 && (
              <Step1Viewport productImages={productImages} productInfo={productInfo} analyzingProduct={analyzingProduct} analysisPhase={analysisPhase} productName={productName} setProductName={setProductName} modelChoice={modelChoice} removingBackground={removingBackground} onRemoveBackground={handleRemoveBackground} onKeepModel={handleKeepModel} />
            )}
            {activeStep !== 1 && (
              <div className="p-8 min-h-full overflow-y-auto h-full">
                {activeStep === 2 && (
                  <Step2Viewport
                    shootType={shootType}
                    modelConfig={modelConfig}
                    setModelConfig={setModelConfig}
                    selectedModelData={selectedModelData}
                    selectedTemplate={selectedTemplate}
                    setSelectedTemplate={setSelectedTemplate}
                    templateCategory={templateCategory}
                    modelImages={modelImages}
                    generatingPortraits={generatingPortraits}
                    portraitProgress={portraitProgress}
                    portraitTotal={portraitTotal}
                    onGeneratePortraits={handleGeneratePortraits}
                  />
                )}
                {activeStep === 3 && (
                  <Step3Viewport
                    selectedPreset={selectedPreset}
                    selectedPresetData={selectedPresetData}
                    referenceImage={referenceImage}
                  />
                )}
                {activeStep === 4 && (
                  <Step4Viewport
                    progress={generationProgress}
                    stage={generationStage}
                    shotCount={shotCount}
                    aspectRatio={aspectRatio}
                  />
                )}
                {activeStep === 5 && (
                  <Step5Viewport
                    shots={generatedShots}
                    shotCount={shotCount}
                    aspectRatio={aspectRatio}
                    onEditShot={handleEditShot}
                    onUndoEdit={handleUndoEdit}
                    onCopyLink={handleCopyLink}
                    updateShot={updateShot}
                    videoExpanded={videoExpanded}
                    setVideoExpanded={setVideoExpanded}
                    videoConfig={videoConfig}
                    setVideoConfig={setVideoConfig}
                    videoGenerating={videoGenerating}
                    videoStage={videoStage}
                    generatedVideo={generatedVideo}
                    onGenerateVideo={handleGenerateVideo}
                    onCancelVideo={handleCancelVideo}
                    setGeneratedVideo={setGeneratedVideo}
                    creditsRemaining={profile?.credits_remaining ?? 0}
                    onGenerate={() => handleGenerate()}
                    onGenerateCampaignAdd={() => handleGenerate('campaign_add')}
                    videoPrompts={videoPrompts}
                    videoPromptsLoading={videoPromptsLoading}
                    videoPromptStep={videoPromptStep}
                    setVideoPromptStep={setVideoPromptStep}
                    onGenerateVideoPrompts={handleGenerateVideoPrompts}
                  />
                )}
              </div>
            )}
          </>
        )}

        {toolbarView === 'assets' && (
          <div className="p-8 min-h-full overflow-y-auto h-full pt-24">
            <AssetsViewport assets={projectAssets} onCopyLink={handleCopyLink} />
          </div>
        )}

        {toolbarView === 'products' && (
          <div className="p-8 min-h-full overflow-y-auto h-full pt-24">
            <ProductsViewport
              assets={projectAssets}
              productLabels={projectProducts}
              selectedLabel={selectedProductLabel}
              onSelectLabel={setSelectedProductLabel}
              onCopyLink={handleCopyLink}
              onLoadProduct={(label) => { loadProductAssets(label); setToolbarView('studio'); }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   LEFT PANEL CONFIG COMPONENTS
   ════════════════════════════════════════════════════════════════ */

/* ── Step 1 Config (Left) ── */
function Step1Config({ productImages, productUploadRef, onUpload, onRemove }: {
  productImages: string[];
  productUploadRef: React.RefObject<HTMLInputElement>;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
}) {
  const TOTAL_SLOTS = 7;
  const slots = Array.from({ length: TOTAL_SLOTS }, (_, i) => productImages[i] ?? null);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Product Images</p>
        <p className="text-xs text-muted-foreground mt-1">Add your product photos to get started.</p>
      </div>

      <input ref={productUploadRef} type="file" accept="image/*" multiple className="hidden" onChange={onUpload} />

      <button
        onClick={() => productUploadRef.current?.click()}
        className="w-full h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1.5 hover:border-primary/50 hover:bg-accent/30 transition-colors"
      >
        <Upload className="h-5 w-5 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">Click to upload · Multiple files</p>
      </button>

      <p className="text-[11px] text-muted-foreground text-center">
        Upload different angles and shots for better results
      </p>

      {/* Hero slot — first image */}
      <div
        onClick={() => !slots[0] && productUploadRef.current?.click()}
        className={`relative w-full aspect-[4/3] rounded-lg overflow-hidden border-2 transition-colors ${
          slots[0] ? 'border-border' : 'border-dashed border-border hover:border-primary/40 cursor-pointer'
        }`}
      >
        {slots[0] ? (
          <>
            <img src={slots[0]} alt="Main product" className="w-full h-full object-cover" />
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(0); }}
              className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity group-hover:opacity-100"
              style={{ opacity: 1 }}
            >
              <X className="h-3 w-3" />
            </button>
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-background/70 to-transparent px-2 py-1.5">
              <p className="text-[10px] font-medium text-foreground">Main Shot</p>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-1">
            <Camera className="h-6 w-6 text-muted-foreground/40" />
            <p className="text-[10px] text-muted-foreground/60">Main product shot</p>
          </div>
        )}
      </div>

      {/* Grid — slots 2-7 */}
      <div className="grid grid-cols-3 gap-1.5">
        {slots.slice(1).map((url, i) => {
          const slotIndex = i + 1;
          return (
            <div
              key={slotIndex}
              onClick={() => !url && productUploadRef.current?.click()}
              className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                url ? 'border-border' : 'border-dashed border-border hover:border-primary/40 cursor-pointer'
              }`}
            >
              {url ? (
                <>
                  <img src={url} alt={`Angle ${slotIndex + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemove(slotIndex); }}
                    className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <ImageIcon className="h-4 w-4 text-muted-foreground/30" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Detailed background prompt builders ── */
const BACKGROUND_PROMPTS: Record<string, (info?: ProductInfo | null) => string> = {
  // Studio
  'white-sweep': (info) => `Clean infinite white cyclorama sweep studio background with soft diffused overhead lighting, subtle floor reflection, professional e-commerce photography setup${info ? ` for a ${info.category} product in ${info.colors?.join(', ') || 'neutral tones'}, crafted from ${info.material || 'premium materials'}` : ''}, even shadowless illumination`,
  'gray-seamless': (info) => `Seamless medium gray backdrop with controlled studio strobes, neutral tone that lets the product colors pop${info ? `, ideal for ${info.category} in ${info.material || 'mixed materials'}` : ''}, subtle gradient from lighter top to slightly darker bottom`,
  'dark-studio': (info) => `Dark charcoal-black studio environment with dramatic rim lighting and subtle specular highlights, luxurious moody atmosphere${info ? ` showcasing ${info.category} with ${info.colors?.join(' and ') || 'rich'} tones on ${info.material || 'premium'} surface` : ''}, deep shadows with controlled fill light`,
  'colored-gel': (info) => `Studio setup with vibrant colored gel lighting casting bold complementary hues${info?.colors?.length ? `, gels chosen to complement ${info.colors[0]}` : ', magenta and teal gels'}, creative fashion photography lighting, smooth gradient color wash on backdrop`,
  'pastel-gradient': (info) => `Soft pastel gradient background transitioning from pale pink to lavender to baby blue, dreamy ethereal studio atmosphere${info ? ` perfect for ${info.category} beauty and skincare photography` : ''}, diffused butterfly lighting, clean and airy feel`,
  'warm-beige': (info) => `Warm neutral beige linen backdrop with natural soft window-style lighting, organic earthy tones${info ? ` complementing ${info.material || 'natural'} ${info.category} product` : ''}, gentle shadows, artisanal handmade aesthetic`,
  // Lifestyle
  'café': (info) => `Warm ambient café interior with exposed brick walls, reclaimed wood tables, soft golden hour window light streaming in, shallow depth of field bokeh from hanging Edison bulbs${info ? `, lifestyle product photography for ${info.category} in ${info.material || 'everyday materials'}` : ''}, cozy inviting atmosphere`,
  'street': (info) => `Urban street setting with textured concrete walls and subtle graffiti art, natural daylight with interesting shadow patterns${info ? `, street-style photography for ${info.category}` : ''}, raw authentic city vibe, slightly desaturated tones`,
  'garden': (info) => `Lush botanical garden setting with dappled sunlight through green foliage, natural floral elements, soft bokeh of blooming flowers${info ? `, organic lifestyle photography for ${info.category}` : ''}, fresh vibrant greens, morning dew atmosphere`,
  'beach': (info) => `Sandy beach setting with turquoise ocean waves in the background, golden hour warm sunlight, sea breeze atmosphere${info ? `, coastal lifestyle photography for ${info.category} in ${info.colors?.join(', ') || 'summery tones'}` : ''}, natural lens flare, relaxed vacation mood`,
  'urban-rooftop': (info) => `Modern urban rooftop at golden hour with city skyline in the background, industrial elements mixed with contemporary style${info ? `, dynamic ${info.category} photography` : ''}, warm sunset backlight, architectural details, metropolitan energy`,
  'living-room': (info) => `Stylish modern living room with designer furniture, natural light from large windows, curated interior design${info ? `, lifestyle home photography featuring ${info.category}` : ''}, warm neutral palette, Scandinavian minimalist aesthetic, soft area rug textures`,
  'office': (info) => `Clean modern office space with minimalist desk setup, natural light, professional corporate atmosphere${info ? `, business-context photography for ${info.category}` : ''}, organized workspace, subtle tech elements, contemporary furniture`,
  // E-commerce
  'pure-white': (info) => `Pure #FFFFFF white background with perfectly even lighting from all angles, zero shadows, Amazon and Shopify compliant product photography${info ? ` for ${info.category}` : ''}, clinical precision, maximum color accuracy on the product`,
  'light-gray': (info) => `Light gray (#F5F5F5) background with soft even illumination, subtle depth without harsh shadows${info ? `, clean e-commerce photography for ${info.category}` : ''}, professional marketplace-ready, neutral backdrop letting product details shine`,
  'soft-shadow': (info) => `White background with a subtle natural drop shadow beneath the product, creating depth and grounding${info ? `, professional ${info.category} product photography` : ''}, soft diffused overhead light, contact shadow adds realism without clutter`,
  // Mystic
  'fog-mist': (info) => `Ethereal fog and mist swirling around the product, mysterious atmospheric haze with soft volumetric light rays piercing through${info ? `, otherworldly presentation of ${info.category}` : ''}, low-lying dry ice effect, cool blue-gray tones, magical floating sensation`,
  'neon-glow': (info) => `Dark moody environment with vivid neon RGB accent lighting in cyan, magenta, and electric purple, reflective glossy black surface${info ? `, futuristic cyberpunk showcase for ${info.category} in ${info.colors?.join(' and ') || 'bold tones'}` : ''}, dramatic light trails, sci-fi atmosphere`,
  'dark-moody': (info) => `Ultra-dark environment with a single dramatic spotlight creating chiaroscuro contrast, rich deep shadows${info ? `, premium high-end presentation of ${info.category} in ${info.material || 'luxurious materials'}` : ''}, Rembrandt lighting, gallery exhibition feel`,
  'ethereal-light': (info) => `Soft ethereal backlighting creating a luminous halo glow effect, dreamy overexposed highlights blending into the background${info ? `, angelic presentation of ${info.category}` : ''}, lens bloom, heavenly atmosphere, pastel light leaks`,
};

function buildBackgroundPrompt(backgroundKey: string, productInfo?: ProductInfo | null): string {
  const builder = BACKGROUND_PROMPTS[backgroundKey];
  if (builder) return builder(productInfo);
  // Fallback for unknown keys
  return `${backgroundKey.replace(/-/g, ' ')} background, professional product photography${productInfo ? ` for ${productInfo.category}` : ''}`;
}

/* ── Background category mapping by product type ── */
const BACKGROUND_SUGGESTIONS: Record<string, string> = {
  'Apparel': 'white-sweep',
  'Clothing': 'white-sweep',
  'Fashion': 'white-sweep',
  'Jewelry': 'dark-studio',
  'Accessories': 'dark-studio',
  'Watches': 'dark-studio',
  'Skincare': 'pastel-gradient',
  'Beauty': 'pastel-gradient',
  'Cosmetics': 'pastel-gradient',
  'Electronics': 'gray-seamless',
  'Tech': 'gray-seamless',
  'Food': 'warm-beige',
  'Beverage': 'café',
  'Shoes': 'white-sweep',
  'Footwear': 'white-sweep',
  'Bags': 'dark-studio',
  'Home': 'living-room',
  'Furniture': 'living-room',
  'Sports': 'urban-rooftop',
  'Fitness': 'urban-rooftop',
};

/* ── Step 2 Config (Left) ── */
function Step2Config({ shootType, setShootType, modelConfig, setModelConfig, modelUploadRef, onModelUpload, selectedTemplate, setSelectedTemplate, templateCategory, setTemplateCategory, selectedModelData, modelImages, productInfo }: {
  shootType: 'product' | 'model' | null;
  setShootType: React.Dispatch<React.SetStateAction<'product' | 'model' | null>>;
  modelConfig: ModelConfig;
  setModelConfig: React.Dispatch<React.SetStateAction<ModelConfig>>;
  modelUploadRef: React.RefObject<HTMLInputElement>;
  onModelUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  selectedTemplate: string | null;
  setSelectedTemplate: React.Dispatch<React.SetStateAction<string | null>>;
  templateCategory: string;
  setTemplateCategory: React.Dispatch<React.SetStateAction<string>>;
  selectedModelData: typeof PLACEHOLDER_MODELS[0] | undefined;
  modelImages: Record<string, string>;
  productInfo: ProductInfo | null;
}) {
  const filteredTemplates = templateCategory === 'All'
    ? PRODUCT_SHOOT_TEMPLATES
    : PRODUCT_SHOOT_TEMPLATES.filter(t => t.category === templateCategory);

  // Auto-fill gender/ethnicity/bodyType when a model is selected
  useEffect(() => {
    if (!selectedModelData) return;
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    const genderMap: Record<string, string> = { female: 'Female', male: 'Male' };
    const bodyMap: Record<string, string> = {
      slim: 'Slim', athletic: 'Athletic', average: 'Average', curvy: 'Curvy',
      'plus size': 'Plus Size', 'athletic muscular': 'Athletic', 'curvy stocky': 'Curvy',
    };
    const ethMap: Record<string, string> = {
      'south asian': 'South Asian', 'east asian': 'East Asian', 'east asian japanese': 'East Asian',
      'east asian korean': 'East Asian', 'southeast asian': 'Southeast Asian',
      'southeast asian filipino': 'Southeast Asian', 'southeast asian thai': 'Southeast Asian',
      'black': 'Black / African', 'black african': 'Black / African', 'black west african': 'Black / African',
      'black nigerian': 'Black / African', 'caucasian': 'White / Caucasian', 'caucasian slavic': 'White / Caucasian',
      'latina': 'Latina / Hispanic', 'latino': 'Latina / Hispanic', 'latina brazilian': 'Latina / Hispanic',
      'middle eastern': 'Middle Eastern', 'middle eastern persian': 'Middle Eastern',
      'mixed': 'Mixed', 'mixed race': 'Mixed', 'mixed black-asian': 'Mixed',
      'mixed caucasian-latina': 'Mixed', 'mixed black-caucasian': 'Mixed',
    };
    setModelConfig(prev => ({
      ...prev,
      gender: genderMap[selectedModelData.gender] || capitalize(selectedModelData.gender),
      ethnicity: ethMap[selectedModelData.ethnicity.toLowerCase()] || 'Other',
      bodyType: bodyMap[selectedModelData.bodyType.toLowerCase()] || capitalize(selectedModelData.bodyType),
    }));
  }, [selectedModelData?.id]);

  // Auto-suggest background based on product category
  useEffect(() => {
    if (!productInfo?.category || modelConfig.background) return;
    const suggested = BACKGROUND_SUGGESTIONS[productInfo.category];
    if (suggested) {
      setModelConfig(prev => ({ ...prev, background: suggested }));
    }
  }, [productInfo?.category]);

  // Auto-compute detailed background prompt whenever background or productInfo changes
  useEffect(() => {
    if (!modelConfig.background) return;
    const prompt = buildBackgroundPrompt(modelConfig.background, productInfo);
    setModelConfig(prev => prev.backgroundPrompt === prompt ? prev : ({ ...prev, backgroundPrompt: prompt }));
  }, [modelConfig.background, productInfo]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Shoot Type</p>
        <p className="text-xs text-muted-foreground mt-1">Choose how your product will be presented.</p>
      </div>

      {/* Shoot type cards */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setShootType('product')}
          className={`rounded-lg border p-4 text-left transition-all ${
            shootType === 'product' ? 'ring-2 ring-primary ring-offset-1' : 'hover:border-primary/50'
          }`}
        >
          <Package className="h-5 w-5 text-muted-foreground mb-2" />
          <p className="text-xs font-semibold">Product Shoot</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Clean product-only shots</p>
        </button>
        <button
          onClick={() => setShootType('model')}
          className={`rounded-lg border p-4 text-left transition-all ${
            shootType === 'model' ? 'ring-2 ring-primary ring-offset-1' : 'hover:border-primary/50'
          }`}
        >
          <ImageIcon className="h-5 w-5 text-muted-foreground mb-2" />
          <p className="text-xs font-semibold">Model Shoot</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Product on AI model</p>
        </button>
      </div>

      {/* Product shoot — category filter */}
      {shootType === 'product' && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <Separator />
          <p className="text-xs font-medium">Scene Template</p>
          <div className="flex flex-wrap gap-1">
            {TEMPLATE_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setTemplateCategory(cat)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${
                  templateCategory === cat
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">
            {selectedTemplate
              ? `Selected: ${PRODUCT_SHOOT_TEMPLATES.find(t => t.id === selectedTemplate)?.name}`
              : 'Select a template from the grid on the right →'}
          </p>
        </div>
      )}

      {/* Model shoot settings */}
      {shootType === 'model' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <Separator />

          {/* ── Selected Model Preview ── */}
          {(selectedModelData || modelConfig.uploadedModelUrl) && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-start gap-3">
                {/* Portrait thumbnail */}
                <div className="w-14 h-[72px] rounded-lg overflow-hidden shrink-0 border border-border">
                  {selectedModelData && modelImages[selectedModelData.id] ? (
                    <img src={modelImages[selectedModelData.id]} alt={selectedModelData.name} className="w-full h-full object-cover" />
                  ) : modelConfig.uploadedModelUrl ? (
                    <img src={modelConfig.uploadedModelUrl} alt="Custom model" className="w-full h-full object-cover" />
                  ) : selectedModelData ? (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: selectedModelData.color }}>
                      <span className="text-lg font-bold text-foreground/40">{selectedModelData.name[0]}</span>
                    </div>
                  ) : null}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {selectedModelData ? selectedModelData.name : 'Custom Model'}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                    {selectedModelData ? selectedModelData.attrs : 'Uploaded image'}
                  </p>
                  {selectedModelData && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">Age: {selectedModelData.ageRange}</p>
                  )}
                </div>
                {/* Deselect */}
                <button
                  onClick={() => setModelConfig(prev => ({ ...prev, selectedModel: null, uploadedModelUrl: null, gender: '', ethnicity: '', bodyType: '' }))}
                  className="h-5 w-5 rounded-full bg-muted flex items-center justify-center shrink-0 hover:bg-accent transition-colors"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              </div>
            </div>
          )}

          {/* Upload */}
          <input ref={modelUploadRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={onModelUpload} />
          {modelConfig.uploadedModelUrl && !selectedModelData ? (
            <div className="relative w-20 h-24 rounded-lg overflow-hidden border">
              <img src={modelConfig.uploadedModelUrl} alt="Custom model" className="w-full h-full object-cover" />
              <button onClick={() => setModelConfig(prev => ({ ...prev, uploadedModelUrl: null }))} className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-background/80 flex items-center justify-center">
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ) : !selectedModelData && !modelConfig.uploadedModelUrl ? (
            <button onClick={() => modelUploadRef.current?.click()} className="w-full h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center gap-2 hover:border-primary/50 transition-colors">
              <Upload className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Upload custom model</p>
            </button>
          ) : null}

          <Separator />

          {/* Attributes */}
          <div className="space-y-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">Gender</label>
              <Select value={modelConfig.gender} onValueChange={v => setModelConfig(prev => ({ ...prev, gender: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Non-binary">Non-binary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Ethnicity</label>
              <Select value={modelConfig.ethnicity} onValueChange={v => setModelConfig(prev => ({ ...prev, ethnicity: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {['South Asian', 'East Asian', 'Southeast Asian', 'Black / African', 'White / Caucasian', 'Latina / Hispanic', 'Middle Eastern', 'Mixed', 'Other'].map(e => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Body Type</label>
              <Select value={modelConfig.bodyType} onValueChange={v => setModelConfig(prev => ({ ...prev, bodyType: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {['Slim', 'Athletic', 'Average', 'Curvy', 'Plus Size'].map(b => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Background</label>
              <Select value={modelConfig.background} onValueChange={v => setModelConfig(prev => ({ ...prev, background: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Studio</SelectLabel>
                    <SelectItem value="white-sweep">White sweep</SelectItem>
                    <SelectItem value="gray-seamless">Gray seamless</SelectItem>
                    <SelectItem value="dark-studio">Dark studio</SelectItem>
                    <SelectItem value="colored-gel">Colored gel</SelectItem>
                    <SelectItem value="pastel-gradient">Pastel gradient</SelectItem>
                    <SelectItem value="warm-beige">Warm beige</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Lifestyle</SelectLabel>
                    <SelectItem value="café">Café</SelectItem>
                    <SelectItem value="street">Street</SelectItem>
                    <SelectItem value="garden">Garden</SelectItem>
                    <SelectItem value="beach">Beach</SelectItem>
                    <SelectItem value="urban-rooftop">Urban rooftop</SelectItem>
                    <SelectItem value="living-room">Living room</SelectItem>
                    <SelectItem value="office">Office</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>E-commerce</SelectLabel>
                    <SelectItem value="pure-white">Pure white</SelectItem>
                    <SelectItem value="light-gray">Light gray</SelectItem>
                    <SelectItem value="soft-shadow">Soft shadow</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Mystic</SelectLabel>
                    <SelectItem value="fog-mist">Fog / mist</SelectItem>
                    <SelectItem value="neon-glow">Neon glow</SelectItem>
                    <SelectItem value="dark-moody">Dark moody</SelectItem>
                    <SelectItem value="ethereal-light">Ethereal light</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              {productInfo?.category && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Auto-suggested for {productInfo.category}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* AI Engine */}
          <div className="space-y-1">
            <label className="text-xs font-medium">AI Engine</label>
            <ToggleGroup type="single" value={modelConfig.aiEngine} onValueChange={v => v && setModelConfig(prev => ({ ...prev, aiEngine: v }))} className="justify-start">
              <ToggleGroupItem value="gemini" className="px-3 h-7 text-xs">Gemini</ToggleGroupItem>
              <ToggleGroupItem value="runway" className="px-3 h-7 text-xs">Runway</ToggleGroupItem>
            </ToggleGroup>
            <p className="text-[10px] text-muted-foreground">Gemini is faster. Runway has better lighting.</p>
          </div>

          {!selectedModelData && !modelConfig.uploadedModelUrl && (
            <p className="text-[10px] text-muted-foreground">Select a model from the grid on the right →</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Step 3 Config (Left) ── */
function Step3Config({ selectedPreset, setSelectedPreset, referenceImage, setReferenceImage, referenceInputRef, onReferenceUpload, shotCount, setShotCount, aspectRatio, setAspectRatio, additionalContext, setAdditionalContext, styleSettings, analyzingStyle, plainBgColor, setPlainBgColor, shootType, selectedTemplate }: {
  selectedPreset: string | null;
  setSelectedPreset: (v: string | null) => void;
  referenceImage: string | null;
  setReferenceImage: (v: string | null) => void;
  referenceInputRef: React.RefObject<HTMLInputElement>;
  onReferenceUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  shotCount: string;
  setShotCount: (v: string) => void;
  aspectRatio: string;
  setAspectRatio: (v: string) => void;
  additionalContext: string;
  setAdditionalContext: (v: string) => void;
  styleSettings: StyleSettings | null;
  analyzingStyle: boolean;
  plainBgColor: string;
  setPlainBgColor: (v: string) => void;
  shootType: 'product' | 'model' | null;
  selectedTemplate: string | null;
}) {
  const isProductWithTemplate = shootType === 'product' && !!selectedTemplate;
  const isPlainBgTemplate = selectedTemplate === 'pt-plain-bg';
  const templateData = isProductWithTemplate ? PRODUCT_SHOOT_TEMPLATES.find(t => t.id === selectedTemplate) : null;
  // Show shots/ratio/direction when either a preset is selected OR product+template
  const showGenerationConfig = !!selectedPreset || isProductWithTemplate;

  return (
    <div className="space-y-4">
      {/* For product shoot with template: show template info, NO style presets */}
      {isProductWithTemplate ? (
        <>
          <div>
            <p className="text-sm font-semibold text-foreground">Scene Template</p>
            <p className="text-xs text-muted-foreground mt-1">Configure your {templateData?.name} shot.</p>
          </div>
          <div className="rounded-lg border bg-muted/50 p-3">
            <p className="text-xs font-semibold text-foreground">{templateData?.name}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{templateData?.description}</p>
          </div>

          {/* Plain Background color picker for pt-plain-bg template */}
          {isPlainBgTemplate && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <p className="text-xs font-medium">Background Color</p>
              <div className="flex flex-wrap gap-2">
                {PLAIN_BG_COLORS.map(c => (
                  <button
                    key={c.name}
                    onClick={() => setPlainBgColor(c.name)}
                    className={`flex flex-col items-center gap-1 group`}
                    title={c.name}
                  >
                    <div
                      className={`w-8 h-8 rounded-full transition-all ${
                        plainBgColor === c.name ? 'ring-2 ring-primary ring-offset-2' : 'hover:ring-2 hover:ring-muted-foreground/30 hover:ring-offset-1'
                      } ${c.border ? 'border border-border' : ''}`}
                      style={{ backgroundColor: c.color }}
                    />
                    <span className={`text-[9px] ${plainBgColor === c.name ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                      {c.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Model shoot or no template: show style presets */}
          <p className="text-sm font-semibold text-foreground">Style preset</p>
          <div className="grid grid-cols-2 gap-2">
            {STYLE_PRESETS.map(p => (
              <button
                key={p.id}
                onClick={() => { setSelectedPreset(p.id); setReferenceImage(null); }}
                className={`rounded-lg overflow-hidden border text-left transition-all ${
                  selectedPreset === p.id ? 'ring-2 ring-primary ring-offset-1' : 'hover:border-primary/50'
                }`}
              >
                <div className="aspect-[4/3] overflow-hidden bg-muted">
                  <img src={p.img} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="p-1.5">
                  <p className="text-[11px] font-semibold">{p.name}</p>
                  <p className="text-[9px] text-muted-foreground leading-tight">{p.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Plain Background color picker for plain-bg style preset */}
          {selectedPreset === 'plain-bg' && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <p className="text-xs font-medium">Background Color</p>
              <div className="flex flex-wrap gap-2">
                {PLAIN_BG_COLORS.map(c => (
                  <button
                    key={c.name}
                    onClick={() => setPlainBgColor(c.name)}
                    className={`flex flex-col items-center gap-1 group`}
                    title={c.name}
                  >
                    <div
                      className={`w-8 h-8 rounded-full transition-all ${
                        plainBgColor === c.name ? 'ring-2 ring-primary ring-offset-2' : 'hover:ring-2 hover:ring-muted-foreground/30 hover:ring-offset-1'
                      } ${c.border ? 'border border-border' : ''}`}
                      style={{ backgroundColor: c.color }}
                    />
                    <span className={`text-[9px] ${plainBgColor === c.name ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                      {c.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Reference upload */}
          <input ref={referenceInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onReferenceUpload} />
          {referenceImage ? (
            <div className="relative rounded-lg overflow-hidden border">
              <img src={referenceImage} alt="Reference" className="w-full aspect-[4/3] object-cover" />
              <button
                onClick={() => { setReferenceImage(null); if (selectedPreset === 'custom') setSelectedPreset(null); }}
                className="absolute top-1 right-1 h-5 w-5 rounded-full bg-background/80 flex items-center justify-center"
              >
                <X className="h-3 w-3" />
              </button>
              <div className="p-1.5">
                <p className="text-[11px] font-semibold">Custom Reference</p>
                {analyzingStyle && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    <p className="text-[10px] text-primary">Extracting style...</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={() => referenceInputRef.current?.click()}
              className="w-full h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center gap-2 hover:border-primary/50 transition-colors"
            >
              <Upload className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Upload reference image</p>
            </button>
          )}

          {/* Style settings badges */}
          {styleSettings && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-primary" />
                  Auto-detected settings
                </p>
                <div className="space-y-1.5">
                  {[
                    { label: 'Pose', value: styleSettings.pose, icon: '🎯' },
                    { label: 'Angle', value: styleSettings.angle, icon: '📐' },
                    { label: 'Lighting', value: styleSettings.lighting, icon: '💡' },
                    { label: 'Composition', value: styleSettings.composition, icon: '🖼' },
                  ].map(item => (
                    <div key={item.label} className="rounded-md border bg-muted/50 p-2">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{item.icon} {item.label}</p>
                      <p className="text-[11px] text-foreground mt-0.5 leading-snug">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Shots, ratio, direction — shown for both flows */}
      {showGenerationConfig && (
        <>
          <Separator />
          {/* Shot count */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium">Shots</p>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setShotCount('campaign')}
                className={`rounded-lg border p-2.5 text-left transition-all ${
                  shotCount === 'campaign' ? 'ring-2 ring-primary ring-offset-1' : 'hover:border-primary/50'
                }`}
              >
                <p className="text-xs font-semibold">Campaign Set</p>
                <p className="text-[10px] text-muted-foreground">6 shots · 6 credits</p>
              </button>
              <button
                onClick={() => setShotCount('single')}
                className={`rounded-lg border p-2.5 text-left transition-all ${
                  shotCount === 'single' ? 'ring-2 ring-primary ring-offset-1' : 'hover:border-primary/50'
                }`}
              >
                <p className="text-xs font-semibold">Single Shot</p>
                <p className="text-[10px] text-muted-foreground">1 shot · 1 credit</p>
              </button>
            </div>
          </div>

          {/* Aspect Ratio */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium">Image Ratio</p>
            <div className="grid grid-cols-5 gap-1">
              {ASPECT_RATIOS.map(r => (
                <button
                  key={r.value}
                  onClick={() => setAspectRatio(r.value)}
                  className={`rounded-lg border p-2 text-center transition-all ${
                    aspectRatio === r.value ? 'ring-2 ring-primary ring-offset-1' : 'hover:border-primary/50'
                  }`}
                >
                  <p className="text-[10px] font-semibold">{r.value}</p>
                  <p className="text-[8px] text-muted-foreground">{r.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Context */}
          <div className="space-y-1">
            <label className="text-xs font-medium">Direction (optional)</label>
            <Textarea
              rows={2}
              maxLength={200}
              value={additionalContext}
              onChange={e => setAdditionalContext(e.target.value)}
              placeholder="e.g. premium feel, marble bg..."
              className="text-xs min-h-[60px]"
            />
            <p className="text-[10px] text-right text-muted-foreground">{additionalContext.length}/200</p>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Step 5 Config (Left — Export Panel) ── */
function Step5Config({ shots, exportFormat, setExportFormat, selectedShots, setSelectedShots, generatedVideo, onRegenerateAll, aspectRatio }: {
  shots: GeneratedShot[];
  exportFormat: string;
  setExportFormat: React.Dispatch<React.SetStateAction<string>>;
  selectedShots: Set<string>;
  setSelectedShots: React.Dispatch<React.SetStateAction<Set<string>>>;
  generatedVideo: GeneratedVideo | null;
  onRegenerateAll: () => void;
  aspectRatio: string;
}) {
  const toggleShot = (id: string) => {
    setSelectedShots(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-foreground">File format</p>
      <RadioGroup value={exportFormat} onValueChange={setExportFormat} className="space-y-1.5">
        {EXPORT_FORMATS.map(f => (
          <label key={f.id} className="flex items-center gap-2 text-xs cursor-pointer">
            <RadioGroupItem value={f.id} />
            {f.label}
          </label>
        ))}
      </RadioGroup>

      {shots.length > 1 && (
        <>
          <Separator />
          <p className="text-xs font-medium text-muted-foreground">Select shots</p>
          <div className="grid grid-cols-3 gap-1">
            {shots.map(shot => (
              <button
                key={shot.id}
                onClick={() => toggleShot(shot.id)}
                className={`relative rounded-md overflow-hidden ${
                  selectedShots.has(shot.id) ? 'ring-2 ring-primary' : 'opacity-50'
                }`}
                style={{ aspectRatio: ratioToCss(aspectRatio) }}
              >
                <img src={shot.url} alt={shot.shotLabel} className="w-full h-full object-cover" />
                {selectedShots.has(shot.id) && (
                  <div className="absolute top-0.5 right-0.5 h-3.5 w-3.5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-2 w-2 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </>
      )}


      {shots.length > 1 && (
        <Button variant="outline" className="w-full" size="sm" onClick={onRegenerateAll}>
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Regenerate all
        </Button>
      )}

      {generatedVideo && (
        <>
          <Separator />
          <div className="flex items-center gap-2">
            <Play className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">Product video</p>
            </div>
            <Badge variant="secondary" className="text-[10px] shrink-0">{generatedVideo.duration}s</Badge>
          </div>
          <a href={generatedVideo.url} download target="_blank" rel="noopener noreferrer" className="block">
            <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs">
              <Download className="h-3 w-3" /> Download MP4
            </Button>
          </a>
        </>
      )}
    </div>
  );
}


/* ════════════════════════════════════════════════════════════════
   RIGHT PANEL VIEWPORT COMPONENTS
   ════════════════════════════════════════════════════════════════ */

/* ── Step 1 Viewport ── */
function Step1Viewport({ productImages, productInfo, analyzingProduct, analysisPhase, productName, setProductName, modelChoice, removingBackground, onRemoveBackground, onKeepModel }: { 
  productImages: string[]; 
  productInfo: ProductInfo | null;
  analyzingProduct: boolean;
  analysisPhase: 'idle' | 'analyzing' | 'done';
  productName: string;
  setProductName: (name: string) => void;
  modelChoice: 'remove' | 'keep' | null;
  removingBackground: boolean;
  onRemoveBackground: () => void;
  onKeepModel: () => void;
}) {
  const ANALYSIS_TEXTS = [
    'Analyzing image...',
    'Detecting materials...',
    'Studying product details...',
    'Identifying colors...',
    'Recognizing product type...',
  ];
  const [cycleIndex, setCycleIndex] = useState(0);
  const [selectedThumbIndex, setSelectedThumbIndex] = useState<number | null>(null);

  useEffect(() => {
    if (analysisPhase !== 'analyzing') return;
    setCycleIndex(0);
    const interval = setInterval(() => {
      setCycleIndex(prev => (prev + 1) % ANALYSIS_TEXTS.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [analysisPhase]);

  // Reset selection when images change
  useEffect(() => {
    setSelectedThumbIndex(null);
  }, [productImages.length]);

  const displayImage = selectedThumbIndex !== null ? productImages[selectedThumbIndex] : productImages[0];

  // Empty state
  if (productImages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center animate-in fade-in duration-300">
        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
          <Upload className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">Upload product images</p>
          <p className="text-sm text-muted-foreground mt-1">Add photos from different angles to get started.</p>
        </div>
      </div>
    );
  }

  // Phase 1: Analyzing
  if (analysisPhase === 'analyzing') {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <div className="relative flex flex-col items-center gap-6">
          <div className="relative animate-pulse-ring rounded-2xl">
            <img
              src={productImages[0]}
              alt="Analyzing product"
              className="max-w-md w-full max-h-[50vh] rounded-2xl shadow-2xl object-contain animate-in zoom-in-95 duration-500"
            />
            <div className="absolute inset-0 rounded-2xl bg-foreground/40 backdrop-blur-[2px] flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Sparkles className="h-8 w-8 text-primary-foreground animate-pulse" />
                <p
                  key={cycleIndex}
                  className="text-sm font-medium text-primary-foreground tracking-wide"
                  style={{ animation: 'analysis-text-cycle 2s ease-in-out' }}
                >
                  {ANALYSIS_TEXTS[cycleIndex]}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <p className="text-xs">AI is studying your product</p>
          </div>
        </div>
      </div>
    );
  }

  // Phase 2: Done — left-aligned image, selectable thumbnails, uniform badges
  return (
    <div className="h-full w-full overflow-hidden p-6 flex flex-col">
      {/* Top row: main image on left + thumbnails on right */}
      <div className="flex gap-4 flex-1 min-h-0">
        <div className="flex-1 min-w-0 flex items-start animate-in slide-in-from-bottom-4 duration-500">
          <img
            src={displayImage}
            alt="Product main"
            className="max-h-[50vh] max-w-full rounded-2xl shadow-lg object-contain"
          />
        </div>

        {productImages.length > 1 && (
          <div className="shrink-0 flex flex-col gap-2 animate-stagger-in" style={{ animationDelay: '0.3s' }}>
            {productImages.slice(1).map((url, i) => {
              const thumbIdx = i + 1;
              const isSelected = selectedThumbIndex === thumbIdx;
              return (
                <img
                  key={i}
                  src={url}
                  alt={`Angle ${i + 2}`}
                  onClick={() => setSelectedThumbIndex(isSelected ? null : thumbIdx)}
                  className={`h-20 w-20 rounded-lg object-cover border shadow-sm transition-all cursor-pointer ${
                    isSelected
                      ? 'ring-2 ring-primary border-primary'
                      : 'border-border hover:ring-2 hover:ring-primary/30'
                  }`}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom section — AI recognition info */}
      <div className="shrink-0 mt-4 space-y-3">
        <div className="flex items-center gap-2 animate-stagger-in" style={{ animationDelay: '0.15s' }}>
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">AI Product Recognition</p>
          {analyzingProduct && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground ml-auto" />}
        </div>

        {productInfo ? (
          <div className="space-y-2.5 animate-stagger-in" style={{ animationDelay: '0.25s' }}>
            {/* Editable Product Name */}
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Product Name</p>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full max-w-md text-lg font-bold text-foreground bg-transparent border-none outline-none focus:ring-0 placeholder:text-muted-foreground/50 p-0"
                placeholder="Enter product name..."
              />
            </div>

            {/* Category + Garment Type + Material + Colors inline — uniform height */}
            <div className="flex flex-wrap items-stretch gap-3">
              <div className="rounded-xl border border-border bg-card px-3 py-2 flex flex-col justify-center min-h-[52px]">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Category</p>
                <p className="text-xs font-semibold text-foreground">{productInfo.category}</p>
                {productInfo.garmentType && (
                  <p className="text-[10px] text-muted-foreground">{productInfo.garmentType}</p>
                )}
              </div>
              <div className="rounded-xl border border-border bg-card px-3 py-2 flex flex-col justify-center min-h-[52px]">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Material</p>
                <p className="text-xs font-semibold text-foreground">{productInfo.material}</p>
              </div>
              <div className="rounded-xl border border-border bg-card px-3 py-2 flex flex-col justify-center min-h-[52px]">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Colors</p>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {productInfo.colors.map((color, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] gap-1 px-2 py-0.5">
                      <Palette className="h-2.5 w-2.5" />
                      {color}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Model & Background status */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={productInfo.hasModel ? "default" : "outline"} className="text-[10px] gap-1">
                <Eye className="h-2.5 w-2.5" />
                {productInfo.hasModel ? 'Model Detected' : 'No Model'}
              </Badge>
              <Badge variant={productInfo.hasWhiteBackground ? "default" : "outline"} className="text-[10px] gap-1">
                <ImageIcon className="h-2.5 w-2.5" />
                {productInfo.hasWhiteBackground ? 'White Background' : 'Background Removal Needed'}
              </Badge>
            </div>

            {/* Model choice action cards */}
            {productInfo.hasModel && !modelChoice && (
              <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <p className="text-[11px] font-semibold text-foreground">What would you like to do?</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={onRemoveBackground}
                    disabled={removingBackground}
                    className="rounded-xl border border-border bg-card p-3 text-left transition-all hover:border-primary/50 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {removingBackground ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary mb-1.5" />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-muted-foreground mb-1.5" />
                    )}
                    <p className="text-xs font-semibold">{removingBackground ? 'Removing...' : 'Remove Background'}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">Extract product only, remove model & background</p>
                  </button>
                  <button
                    onClick={onKeepModel}
                    disabled={removingBackground}
                    className="rounded-xl border border-border bg-card p-3 text-left transition-all hover:border-primary/50 hover:shadow-md disabled:opacity-50"
                  >
                    <Eye className="h-5 w-5 text-muted-foreground mb-1.5" />
                    <p className="text-xs font-semibold">Keep Model</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">Generate all shots with the same model</p>
                  </button>
                </div>
              </div>
            )}

            {/* Model choice confirmation */}
            {modelChoice === 'keep' && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 flex items-center gap-2">
                <Check className="h-4 w-4 text-primary shrink-0" />
                <p className="text-xs text-foreground">Will generate with detected model across all shots</p>
              </div>
            )}
            {modelChoice === 'remove' && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 flex items-center gap-2">
                <Check className="h-4 w-4 text-primary shrink-0" />
                <p className="text-xs text-foreground">Background removed — product-only image ready</p>
              </div>
            )}

            {/* Model note */}
            {productInfo.modelNote && !modelChoice && (
              <p className="text-[10px] text-muted-foreground italic">{productInfo.modelNote}</p>
            )}

            {/* Outfit suggestion for apparel */}
            {productInfo.outfitSuggestion && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 space-y-0.5">
                <p className="text-[10px] font-medium text-primary uppercase tracking-wider">Outfit Pairing</p>
                <p className="text-xs text-foreground leading-relaxed">{productInfo.outfitSuggestion}</p>
              </div>
            )}

            {/* Description */}
            <p className="text-xs text-muted-foreground leading-relaxed max-w-lg line-clamp-2">{productInfo.description}</p>
          </div>
        ) : !analyzingProduct ? (
          <div className="rounded-xl border border-border bg-card px-4 py-2.5">
            <p className="text-xs text-muted-foreground">Analysis could not be completed. Try uploading a clearer image.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ── Step 2 Viewport ── */
function Step2Viewport({ shootType, modelConfig, setModelConfig, selectedModelData, selectedTemplate, setSelectedTemplate, templateCategory, modelImages, generatingPortraits, portraitProgress, portraitTotal, onGeneratePortraits }: {
  shootType: 'product' | 'model' | null;
  modelConfig: ModelConfig;
  setModelConfig: React.Dispatch<React.SetStateAction<ModelConfig>>;
  selectedModelData: typeof PLACEHOLDER_MODELS[0] | undefined;
  selectedTemplate: string | null;
  setSelectedTemplate: React.Dispatch<React.SetStateAction<string | null>>;
  templateCategory: string;
  modelImages: Record<string, string>;
  generatingPortraits: boolean;
  portraitProgress: number;
  portraitTotal: number;
  onGeneratePortraits: () => void;
}) {
  const filteredTemplates = templateCategory === 'All'
    ? PRODUCT_SHOOT_TEMPLATES
    : PRODUCT_SHOOT_TEMPLATES.filter(t => t.category === templateCategory);

  if (!shootType) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center animate-in fade-in duration-300">
        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
          <Camera className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">Choose a shoot type</p>
          <p className="text-sm text-muted-foreground mt-1">Select Product Shoot or Model Shoot on the left to continue.</p>
        </div>
      </div>
    );
  }

  if (shootType === 'product') {
    return (
      <div className="h-full flex flex-col animate-in fade-in duration-300">
        <div className="shrink-0 mb-4">
          <p className="font-medium text-lg" style={{ fontFamily: "'Instrument Serif', serif" }}>Scene Templates</p>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedTemplate
              ? `Selected: ${PRODUCT_SHOOT_TEMPLATES.find(t => t.id === selectedTemplate)?.name}`
              : 'Choose a scene template for your product shoot.'}
          </p>
        </div>
        <ScrollArea className="flex-1 bg-background relative z-10">
          <div className="grid grid-cols-4 gap-3 pb-4">
            {filteredTemplates.map((t) => {
              const isSelected = selectedTemplate === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(prev => prev === t.id ? null : t.id)}
                  className={`rounded-xl overflow-hidden border transition-all text-left ${
                    isSelected ? 'ring-2 ring-primary ring-offset-2' : 'hover:border-primary/50 hover:shadow-md'
                  }`}
                >
                  <div className="aspect-square flex items-center justify-center" style={{ background: t.color }}>
                    {isSelected && (
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium truncate">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-2 leading-tight">{t.description}</p>
                    <Badge variant="outline" className="text-[8px] mt-1 px-1.5 py-0">{t.category}</Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    );
  }

  const existingCount = Object.keys(modelImages).length;
  const allGenerated = existingCount >= PLACEHOLDER_MODELS.length;

  // Model shoot — grid with generate button
  return (
    <div className="h-full flex flex-col animate-in fade-in duration-300">
      <div className="shrink-0 mb-4 flex items-start justify-between">
        <div>
          <p className="font-medium text-lg" style={{ fontFamily: "'Instrument Serif', serif" }}>Choose an AI Model</p>
          <p className="text-sm text-muted-foreground mt-1">Select a model for your shoot. {selectedModelData ? `Selected: ${selectedModelData.name}` : 'Click to select.'}</p>
        </div>
        {!allGenerated && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0"
            disabled={generatingPortraits}
            onClick={onGeneratePortraits}
          >
            {generatingPortraits ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {portraitProgress}/{portraitTotal}
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                {existingCount > 0 ? 'Generate Missing Portraits' : 'Generate Portraits'}
              </>
            )}
          </Button>
        )}
      </div>
      {generatingPortraits && (
        <div className="shrink-0 mb-3">
          <Progress value={(portraitProgress / portraitTotal) * 100} className="h-1.5" />
          <p className="text-[10px] text-muted-foreground mt-1 text-center">
            Generating portrait {portraitProgress} of {portraitTotal}…
          </p>
        </div>
      )}
      <ScrollArea className="flex-1 bg-background relative z-10">
        <div className="grid grid-cols-5 gap-3 pb-4">
          {PLACEHOLDER_MODELS.map((m) => {
            const isSelected = modelConfig.selectedModel === m.id;
            const portraitUrl = modelImages[m.id];
            return (
              <button
                key={m.id}
                onClick={() => setModelConfig(prev => ({ ...prev, selectedModel: prev.selectedModel === m.id ? null : m.id, uploadedModelUrl: null }))}
                className={`rounded-xl overflow-hidden border transition-all text-left ${
                  isSelected ? 'ring-2 ring-primary ring-offset-2' : 'hover:border-primary/50 hover:shadow-md'
                }`}
              >
                <div className="aspect-[3/4] relative" style={!portraitUrl ? { background: m.color } : undefined}>
                  {portraitUrl ? (
                    <img src={portraitUrl} alt={m.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : null}
                  {isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium truncate">{m.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{m.attrs}</p>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

/* ── Step 3 Viewport ── */
function Step3Viewport({ selectedPreset, selectedPresetData, referenceImage }: {
  selectedPreset: string | null;
  selectedPresetData: typeof STYLE_PRESETS[0] | undefined;
  referenceImage: string | null;
}) {
  // Show reference image
  if (selectedPreset === 'custom' && referenceImage) {
    return (
      <div className="flex items-center justify-center h-full animate-in fade-in duration-300">
        <div className="max-w-lg w-full">
          <img src={referenceImage} alt="Custom reference" className="w-full rounded-2xl shadow-lg object-cover" />
          <p className="text-center mt-4 font-medium">Custom Reference</p>
          <p className="text-sm text-muted-foreground text-center mt-1">Your uploaded style reference</p>
        </div>
      </div>
    );
  }

  // Show selected preset
  if (selectedPresetData) {
    return (
      <div className="flex items-center justify-center h-full animate-in fade-in duration-300">
        <div className="max-w-lg w-full">
          <div className="relative rounded-2xl overflow-hidden shadow-lg">
            <img src={selectedPresetData.img} alt={selectedPresetData.name} className="w-full aspect-[4/3] object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <p className="text-white font-semibold text-xl">{selectedPresetData.name}</p>
              <p className="text-white/80 text-sm mt-1">{selectedPresetData.desc}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center animate-in fade-in duration-300">
      <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
        <Palette className="h-8 w-8 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium">Choose a style</p>
        <p className="text-sm text-muted-foreground mt-1">Select a preset to preview the visual direction.</p>
      </div>
    </div>
  );
}

/* ── Step 4 Viewport (Generating) ── */
function Step4Viewport({ progress, stage, shotCount, aspectRatio }: {
  progress: number;
  stage: string;
  shotCount: string;
  aspectRatio: string;
}) {
  const isCampaign = shotCount === 'campaign';

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 animate-in fade-in duration-300">
      <div className="max-w-md w-full space-y-6 text-center">
        <div>
          <p className="font-medium text-lg" style={{ fontFamily: "'Instrument Serif', serif" }}>Creating your shots</p>
          <p className="text-sm text-muted-foreground mt-1">{stage}</p>
        </div>

        <Progress value={progress} className="h-2" />
        <p className="text-xs text-muted-foreground">{progress}%</p>
      </div>

      {/* Skeleton preview */}
      <div className="w-full max-w-2xl mt-4">
        {isCampaign ? (
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="rounded-xl" style={{ aspectRatio: ratioToCss(aspectRatio) }} />
            ))}
          </div>
        ) : (
          <div className="max-w-xs mx-auto">
            <Skeleton className="rounded-xl" style={{ aspectRatio: ratioToCss(aspectRatio) }} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Step 5 Viewport (Results) ── */
function Step5Viewport({ shots, shotCount, aspectRatio, onEditShot, onUndoEdit, onCopyLink, updateShot, videoExpanded, setVideoExpanded, videoConfig, setVideoConfig, videoGenerating, videoStage, generatedVideo, onGenerateVideo, onCancelVideo, setGeneratedVideo, creditsRemaining, onGenerate, onGenerateCampaignAdd, videoPrompts, videoPromptsLoading, videoPromptStep, setVideoPromptStep, onGenerateVideoPrompts }: {
  shots: GeneratedShot[];
  shotCount: string;
  aspectRatio: string;
  onEditShot: (shot: GeneratedShot) => void;
  onUndoEdit: (shot: GeneratedShot) => void;
  onCopyLink: (url: string) => void;
  updateShot: (id: string, updates: Partial<GeneratedShot>) => void;
  videoExpanded: boolean;
  setVideoExpanded: (v: boolean) => void;
  videoConfig: VideoConfig;
  setVideoConfig: React.Dispatch<React.SetStateAction<VideoConfig>>;
  videoGenerating: boolean;
  videoStage: string;
  generatedVideo: GeneratedVideo | null;
  onGenerateVideo: () => void;
  onCancelVideo: () => void;
  setGeneratedVideo: React.Dispatch<React.SetStateAction<GeneratedVideo | null>>;
  creditsRemaining: number;
  onGenerate: () => void;
  onGenerateCampaignAdd: () => void;
  videoPrompts: VideoPrompt[];
  videoPromptsLoading: boolean;
  videoPromptStep: 'config' | 'prompts' | 'generating' | 'done';
  setVideoPromptStep: (step: 'config' | 'prompts' | 'generating' | 'done') => void;
  onGenerateVideoPrompts: () => void;
}) {
  const isCampaign = shots.length > 1;
  const videoCreditCost = calculateVideoCreditCost(videoConfig.duration, videoConfig.resolution);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-medium" style={{ fontFamily: "'Instrument Serif', serif" }}>Your shots are ready</h2>
        <p className="text-sm text-muted-foreground mt-1">Click any shot to edit with a prompt. Use the export panel on the left to download.</p>
      </div>

      {/* Shot grid */}
      {isCampaign ? (
        <div className="grid grid-cols-3 gap-4">
          {shots.map((shot, i) => (
            <ShotCard key={shot.id} shot={shot} index={i} aspectRatio={aspectRatio} onEdit={onEditShot} onUndo={onUndoEdit} onCopyLink={onCopyLink} updateShot={updateShot} />
          ))}
        </div>
      ) : (
        <div className="max-w-lg">
          {shots[0] && <ShotCard shot={shots[0]} index={0} aspectRatio={aspectRatio} onEdit={onEditShot} onUndo={onUndoEdit} onCopyLink={onCopyLink} updateShot={updateShot} />}
        </div>
      )}

      {/* Single shot actions */}
      {!isCampaign && (
        <div className="max-w-lg space-y-3">
          <Button variant="outline" className="w-full" onClick={onGenerate}>
            Generate another variation — 1 credit
          </Button>
          <Button className="w-full" onClick={onGenerateCampaignAdd}>
            Add 5 more for a Campaign Set — 5 credits
          </Button>
        </div>
      )}

      {/* ── Video CTA Card ── */}
      <Card className="rounded-2xl overflow-hidden">
        <CardContent className="p-6 space-y-0">
          {!videoExpanded && !videoGenerating && !generatedVideo && (
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Play className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">Turn your shots into a product video</p>
                <p className="text-sm text-muted-foreground">Cinematic 4–8 second clips. Perfect for Reels, TikTok, and ads.</p>
              </div>
              <Button variant="outline" onClick={() => { setVideoExpanded(true); if (!videoConfig.baseImageId && shots.length > 0) setVideoConfig(prev => ({ ...prev, baseImageId: shots[0].id })); }}>
                Create Video
              </Button>
            </div>
          )}

          {videoExpanded && videoPromptStep === 'config' && !videoGenerating && !generatedVideo && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between">
                <p className="font-medium">Create a product video</p>
                <Button variant="ghost" size="sm" onClick={() => { setVideoExpanded(false); setVideoPromptStep('config'); }}><X className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Which shot should we animate?</p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {shots.map(shot => (
                    <button
                      key={shot.id}
                      onClick={() => setVideoConfig(prev => ({ ...prev, baseImageId: shot.id }))}
                      className={`shrink-0 w-20 h-[100px] rounded-lg overflow-hidden border transition-all ${
                        videoConfig.baseImageId === shot.id ? 'ring-2 ring-accent ring-offset-2' : 'hover:border-accent/50'
                      }`}
                    >
                      <img src={shot.url} alt={shot.shotLabel} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Duration</label>
                  <ToggleGroup type="single" value={String(videoConfig.duration)} onValueChange={v => v && setVideoConfig(prev => ({ ...prev, duration: Number(v) }))} className="justify-start">
                    <ToggleGroupItem value="4" className="px-3">4s</ToggleGroupItem>
                    <ToggleGroupItem value="6" className="px-3">6s</ToggleGroupItem>
                    <ToggleGroupItem value="8" className="px-3">8s</ToggleGroupItem>
                  </ToggleGroup>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Aspect Ratio</label>
                  <ToggleGroup type="single" value={videoConfig.aspectRatio} onValueChange={v => v && setVideoConfig(prev => ({ ...prev, aspectRatio: v }))} className="justify-start">
                    <ToggleGroupItem value="9:16" className="px-3">9:16</ToggleGroupItem>
                    <ToggleGroupItem value="16:9" className="px-3">16:9</ToggleGroupItem>
                    <ToggleGroupItem value="1:1" className="px-3">1:1</ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Resolution</label>
                  <ToggleGroup type="single" value={videoConfig.resolution} onValueChange={v => v && setVideoConfig(prev => ({ ...prev, resolution: v }))} className="justify-start">
                    <ToggleGroupItem value="720p" className="px-3">720p</ToggleGroupItem>
                    <ToggleGroupItem value="1080p" className="px-3">1080p</ToggleGroupItem>
                  </ToggleGroup>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">AI Engine</label>
                  <ToggleGroup type="single" value={videoConfig.engine} onValueChange={v => v && setVideoConfig(prev => ({ ...prev, engine: v }))} className="justify-start">
                    <ToggleGroupItem value="veo" className="px-3">Veo 3.1</ToggleGroupItem>
                    <ToggleGroupItem value="runway" className="px-3">Runway 4.5</ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </div>
              <Button className="w-full" onClick={onGenerateVideoPrompts} disabled={!videoConfig.baseImageId || videoPromptsLoading}>
                {videoPromptsLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating prompts...</> : 'Generate video prompts'}
              </Button>
            </div>
          )}

          {videoExpanded && videoPromptStep === 'prompts' && !videoGenerating && !generatedVideo && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Choose a video direction</p>
                  <p className="text-sm text-muted-foreground">Select the style that best fits your product</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setVideoPromptStep('config')}><ArrowLeft className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-3">
                {videoPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setVideoConfig(prev => ({ ...prev, selectedPrompt: prompt }))}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      videoConfig.selectedPrompt?.text === prompt.text
                        ? 'ring-2 ring-primary border-primary bg-primary/5'
                        : 'hover:border-primary/30 bg-card'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-[10px] px-2 py-0">{prompt.style}</Badge>
                      {videoConfig.selectedPrompt?.text === prompt.text && (
                        <Check className="h-3.5 w-3.5 text-primary" />
                      )}
                    </div>
                    <p className="text-sm leading-relaxed">{prompt.text}</p>
                    <p className="text-xs text-muted-foreground mt-2 italic">{prompt.reason}</p>
                  </button>
                ))}
              </div>
              <Button className="w-full" onClick={onGenerateVideo} disabled={!videoConfig.selectedPrompt}>
                Generate video — {videoCreditCost} credits
              </Button>
            </div>
          )}

          {videoGenerating && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="aspect-video bg-muted rounded-xl overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/5 to-transparent animate-pulse" />
              </div>
              <p className="text-sm text-muted-foreground text-center">{videoStage}</p>
              <div className="text-center">
                <button onClick={onCancelVideo} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
              </div>
            </div>
          )}

          {generatedVideo && !videoGenerating && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <video src={generatedVideo.url} controls autoPlay muted loop className="w-full aspect-video rounded-xl bg-muted" />
              <div className="flex items-center gap-2">
                <a href={generatedVideo.url} download target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="gap-1.5"><Download className="h-3.5 w-3.5" /> Download MP4</Button>
                </a>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { navigator.clipboard.writeText(generatedVideo.url); toast({ title: 'Link copied' }); }}>
                  <Share2 className="h-3.5 w-3.5" /> Share link
                </Button>
                <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => { setGeneratedVideo(null); setVideoPromptStep('config'); setVideoExpanded(true); }}>
                  <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Used {calculateVideoCreditCost(generatedVideo.duration, generatedVideo.resolution)} credits · {creditsRemaining} remaining
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ════════════════════════════════════════════════
   ShotCard Component
   ════════════════════════════════════════════════ */
function ShotCard({ shot, index, aspectRatio = '1:1', onEdit, onUndo, onCopyLink, updateShot }: {
  shot: GeneratedShot;
  index: number;
  aspectRatio?: string;
  onEdit: (shot: GeneratedShot) => void;
  onUndo: (shot: GeneratedShot) => void;
  onCopyLink: (url: string) => void;
  updateShot: (id: string, updates: Partial<GeneratedShot>) => void;
}) {
  return (
    <div className="rounded-xl overflow-hidden border bg-card animate-in fade-in duration-300" style={{ animationDelay: `${index * 100}ms` }}>
      <div className="relative overflow-hidden bg-muted" style={{ aspectRatio: ratioToCss(aspectRatio) }}>
        <img
          src={shot.url}
          alt={SHOT_LABEL_DISPLAY[shot.shotLabel] || shot.shotLabel}
          className={`w-full h-full object-cover transition-opacity duration-300 ${shot.isRegenerating ? 'opacity-40' : 'opacity-100'}`}
        />
        {shot.isRegenerating && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {SHOT_LABEL_DISPLAY[shot.shotLabel] || shot.shotLabel}
          </p>
          <div className="flex items-center gap-1">
            <a href={shot.url} download target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="icon" className="h-8 w-8"><Download className="h-4 w-4" /></Button>
            </a>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onCopyLink(shot.url)}>
              <Link2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => updateShot(shot.id, { isEditing: !shot.isEditing })}>
              <Pencil className="h-3.5 w-3.5" /> Edit with prompt
            </Button>
          </div>
        </div>
        {shot.showUndo && (
          <button onClick={() => onUndo(shot)} className="flex items-center gap-1 text-xs text-primary hover:underline animate-in fade-in duration-200">
            <Undo2 className="h-3 w-3" /> Undo last edit
          </button>
        )}
        {shot.isEditing && (
          <div className="space-y-3 animate-in slide-in-from-bottom-2 duration-200 border-t pt-3">
            <Textarea rows={2} placeholder="Describe the change..." value={shot.editPrompt} onChange={e => updateShot(shot.id, { editPrompt: e.target.value })} />
            <div className="flex flex-wrap gap-1.5">
              {EDIT_SUGGESTIONS.map(s => (
                <button key={s} onClick={() => updateShot(shot.id, { editPrompt: s })} className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => onEdit(shot)} disabled={!shot.editPrompt.trim()}>Apply — 1 credit</Button>
              <Button variant="ghost" size="sm" onClick={() => updateShot(shot.id, { isEditing: false, editPrompt: '' })}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


/* ════════════════════════════════════════════════
   Assets Viewport
   ════════════════════════════════════════════════ */
function AssetsViewport({ assets, onCopyLink }: {
  assets: ProjectAsset[];
  onCopyLink: (url: string) => void;
}) {
  const [viewingUrl, setViewingUrl] = useState<string | null>(null);
  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center animate-in fade-in duration-300">
        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
          <LayoutGrid className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">No assets yet</p>
          <p className="text-sm text-muted-foreground mt-1">Generate some shots from the Studio to see them here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-medium" style={{ fontFamily: "'Instrument Serif', serif" }}>All Assets</h2>
        <p className="text-sm text-muted-foreground mt-1">{assets.length} image{assets.length !== 1 ? 's' : ''} in this project</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 2xl:grid-cols-5 gap-4">
        {assets.map((a) => (
          <div key={a.id} className="group relative">
            <div className="aspect-square rounded-xl overflow-hidden bg-muted border">
              <img src={a.url} alt={a.product_label || ''} className="h-full w-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                <a href={a.url} download target="_blank" rel="noopener noreferrer">
                  <button className="rounded-full bg-background p-2 hover:bg-accent transition-colors"><Download className="h-4 w-4" /></button>
                </a>
                <button onClick={() => onCopyLink(a.url)} className="rounded-full bg-background p-2 hover:bg-accent transition-colors"><Link2 className="h-4 w-4" /></button>
                <button onClick={() => setViewingUrl(a.url)} className="rounded-full bg-background p-2 hover:bg-accent transition-colors"><Eye className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <Badge variant="outline" className="text-[9px] px-1.5 py-0">{a.asset_type === 'original' ? 'Original' : a.asset_type === 'ai_generated' ? 'Generated' : a.asset_type}</Badge>
              {a.product_label && <p className="text-[10px] text-muted-foreground truncate">{a.product_label}</p>}
            </div>
          </div>
        ))}
      </div>
      <Dialog open={!!viewingUrl} onOpenChange={() => setViewingUrl(null)}>
        <DialogContent className="max-w-4xl p-2">
          <DialogTitle className="sr-only">View Asset</DialogTitle>
          {viewingUrl && <img src={viewingUrl} alt="" className="w-full h-auto rounded-lg" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ════════════════════════════════════════════════
   Products Viewport
   ════════════════════════════════════════════════ */
function ProductsViewport({ assets, productLabels, selectedLabel, onSelectLabel, onCopyLink, onLoadProduct }: {
  assets: ProjectAsset[];
  productLabels: string[];
  selectedLabel: string | null;
  onSelectLabel: (label: string | null) => void;
  onCopyLink: (url: string) => void;
  onLoadProduct: (label: string) => void;
}) {
  const [viewingUrl, setViewingUrl] = useState<string | null>(null);
  if (productLabels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center animate-in fade-in duration-300">
        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
          <Tag className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">No products yet</p>
          <p className="text-sm text-muted-foreground mt-1">Generate shots in the Studio to create product entries.</p>
        </div>
      </div>
    );
  }

  // If a product is selected, show its images
  if (selectedLabel) {
    const productAssets = assets.filter(a => a.product_label === selectedLabel && a.asset_type === 'ai_generated');
    return (
      <div className="space-y-4 animate-in fade-in duration-300">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => onSelectLabel(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-medium" style={{ fontFamily: "'Instrument Serif', serif" }}>{selectedLabel}</h2>
            <p className="text-sm text-muted-foreground">{productAssets.length} generated image{productAssets.length !== 1 ? 's' : ''}</p>
          </div>
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => onLoadProduct(selectedLabel)}>
            Open in Studio
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {productAssets.map((a) => (
            <div key={a.id} className="group relative">
              <div className="aspect-square rounded-xl overflow-hidden bg-muted border">
                <img src={a.url} alt={a.shot_label || ''} className="h-full w-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                  <a href={a.url} download target="_blank" rel="noopener noreferrer">
                    <button className="rounded-full bg-background p-2 hover:bg-accent transition-colors"><Download className="h-4 w-4" /></button>
                  </a>
                  <button onClick={() => onCopyLink(a.url)} className="rounded-full bg-background p-2 hover:bg-accent transition-colors"><Link2 className="h-4 w-4" /></button>
                  <button onClick={() => setViewingUrl(a.url)} className="rounded-full bg-background p-2 hover:bg-accent transition-colors"><Eye className="h-4 w-4" /></button>
                </div>
              </div>
              {a.shot_label && (
                <p className="mt-1 text-xs text-muted-foreground">{SHOT_LABEL_DISPLAY[a.shot_label] || a.shot_label}</p>
              )}
            </div>
          ))}
        </div>
        <Dialog open={!!viewingUrl} onOpenChange={() => setViewingUrl(null)}>
          <DialogContent className="max-w-4xl p-2">
            <DialogTitle className="sr-only">View Asset</DialogTitle>
            {viewingUrl && <img src={viewingUrl} alt="" className="w-full h-auto rounded-lg" />}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Product cards list
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-medium" style={{ fontFamily: "'Instrument Serif', serif" }}>Products</h2>
        <p className="text-sm text-muted-foreground mt-1">{productLabels.length} product{productLabels.length !== 1 ? 's' : ''} in this project</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-4 gap-4">
        {productLabels.map((label) => {
          const generatedAssets = assets.filter(a => a.product_label === label && a.asset_type === 'ai_generated');
          const thumbnail = generatedAssets[0]?.url;
          const generatedCount = generatedAssets.length;
          return (
            <button
              key={label}
              onClick={() => onSelectLabel(label)}
              className="rounded-xl border bg-card overflow-hidden text-left transition-all hover:border-primary/50 hover:shadow-md"
            >
              <div className="aspect-[4/3] bg-muted overflow-hidden">
                {thumbnail ? (
                  <img src={thumbnail} alt={label} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Package className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-medium truncate">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{generatedCount} generated image{generatedCount !== 1 ? 's' : ''}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default Studio;
