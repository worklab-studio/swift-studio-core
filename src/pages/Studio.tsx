import { useEffect, useState, useRef, useCallback } from 'react';
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
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { Check, Package, Upload, X, Loader2, ArrowLeft, Download, Link2, Pencil, RotateCcw, Undo2, Play, Share2, RefreshCw, ImageIcon, Palette, Eye, Sparkles, Camera } from 'lucide-react';

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
};

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
  // Studio (5)
  { id: 'pt1', name: 'Mannequin Front', description: 'Product displayed on mannequin, front-facing', category: 'Studio', color: 'hsl(220 15% 70% / 0.25)' },
  { id: 'pt2', name: 'Mannequin 3/4 Angle', description: 'Three-quarter view on mannequin with depth', category: 'Studio', color: 'hsl(220 15% 65% / 0.25)' },
  { id: 'pt3', name: 'Ghost Mannequin', description: 'Invisible mannequin effect, clean silhouette', category: 'Studio', color: 'hsl(220 15% 60% / 0.25)' },
  { id: 'pt4', name: 'Hanging on Rail', description: 'Product hanging on a professional clothing rail', category: 'Studio', color: 'hsl(220 15% 55% / 0.25)' },
  { id: 'pt5', name: 'Folded Stack', description: 'Neatly folded product in a stacked arrangement', category: 'Studio', color: 'hsl(220 15% 50% / 0.25)' },
  // E-commerce (5)
  { id: 'pt6', name: 'White Flat Lay', description: 'Flat lay on pure white background', category: 'E-commerce', color: 'hsl(0 0% 92% / 0.4)' },
  { id: 'pt7', name: 'Hanger with Shadow', description: 'Hanging product with dramatic drop shadow', category: 'E-commerce', color: 'hsl(0 0% 85% / 0.35)' },
  { id: 'pt8', name: 'Pack Shot Grid', description: 'Multiple angles in a grid layout', category: 'E-commerce', color: 'hsl(0 0% 88% / 0.35)' },
  { id: 'pt9', name: 'Size Comparison', description: 'Product shown with scale reference objects', category: 'E-commerce', color: 'hsl(0 0% 82% / 0.35)' },
  { id: 'pt10', name: 'Tag Close-up', description: 'Detail shot highlighting labels and tags', category: 'E-commerce', color: 'hsl(0 0% 78% / 0.35)' },
  // Mystic (5)
  { id: 'pt11', name: 'Floating in Mist', description: 'Product suspended in ethereal fog', category: 'Mystic', color: 'hsl(270 40% 60% / 0.2)' },
  { id: 'pt12', name: 'Fabric Explosion', description: 'Dynamic burst of fabric in mid-air', category: 'Mystic', color: 'hsl(340 50% 55% / 0.2)' },
  { id: 'pt13', name: 'Ethereal Glow', description: 'Soft halo lighting with dreamy atmosphere', category: 'Mystic', color: 'hsl(200 50% 65% / 0.2)' },
  { id: 'pt14', name: 'Dark Moody Drape', description: 'Rich shadows with dramatic fabric draping', category: 'Mystic', color: 'hsl(250 30% 30% / 0.3)' },
  { id: 'pt15', name: 'Surreal Levitation', description: 'Product defying gravity in an abstract scene', category: 'Mystic', color: 'hsl(180 40% 50% / 0.2)' },
  // Showcase (5)
  { id: 'pt16', name: 'Editorial Spread', description: 'Magazine-style editorial composition', category: 'Showcase', color: 'hsl(30 50% 60% / 0.2)' },
  { id: 'pt17', name: 'Window Light Drape', description: 'Natural window light with soft fabric fall', category: 'Showcase', color: 'hsl(45 60% 70% / 0.2)' },
  { id: 'pt18', name: 'Styled Flat Lay', description: 'Curated accessories and props around product', category: 'Showcase', color: 'hsl(15 45% 55% / 0.2)' },
  { id: 'pt19', name: 'Textured Surface', description: 'Product on marble, wood, or fabric surface', category: 'Showcase', color: 'hsl(25 30% 50% / 0.2)' },
  { id: 'pt20', name: 'Color Story', description: 'Monochromatic arrangement highlighting tones', category: 'Showcase', color: 'hsl(350 40% 55% / 0.2)' },
];

const TEMPLATE_CATEGORIES = ['All', 'Studio', 'E-commerce', 'Mystic', 'Showcase'] as const;

/* ── Style presets ── */
const STYLE_PRESETS = [
  { id: 'classic', name: 'Classic', desc: 'Clean studio, neutral tones, timeless', img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80' },
  { id: 'minimalist', name: 'Minimalist', desc: 'Stark white, breathing room, pure product', img: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&q=80' },
  { id: 'luxury', name: 'Luxury', desc: 'Dark surfaces, gold accents, soft shadow', img: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&q=80' },
  { id: 'loud-luxury', name: 'Loud Luxury', desc: 'Bold marble, dramatic lighting, opulence', img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80' },
  { id: 'magazine', name: 'Magazine', desc: 'Editorial crops, sharp contrast, print-ready', img: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80' },
  { id: 'avant-garde', name: 'Avant Garde', desc: 'Unexpected angles, abstract props, art-forward', img: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&q=80' },
  { id: 'influencer', name: 'Influencer', desc: 'Golden hour, warm tones, candid lifestyle', img: 'https://images.unsplash.com/photo-1504703395950-b89145a5425b?w=400&q=80' },
  { id: 'lifestyle', name: 'Lifestyle', desc: 'Everyday environments, natural light, relatable', img: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&q=80' },
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
  { id: 'original', label: 'Original resolution (PNG)', default: true },
  { id: 'web', label: 'Web optimized (JPG, 80%)', default: true },
  { id: 'amazon', label: 'Amazon listing (2000×2000)', default: false },
  { id: 'shopify', label: 'Shopify product image', default: false },
  { id: 'ig-square', label: 'Instagram 1:1', default: false },
  { id: 'ig-portrait', label: 'Instagram 4:5', default: false },
  { id: 'ig-story', label: 'Instagram 16:9', default: false },
];

const EDIT_SUGGESTIONS = [
  'make the background darker',
  'add more shadow under the product',
  'change to outdoor setting',
  'warmer lighting',
];

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
    aiEngine: 'gemini',
  });

  // Style config
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [shotCount, setShotCount] = useState<string>('campaign');
  const [additionalContext, setAdditionalContext] = useState('');

  // Generation state
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStage, setGenerationStage] = useState('');
  const [generatedShots, setGeneratedShots] = useState<GeneratedShot[]>([]);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [exportFormats, setExportFormats] = useState<Set<string>>(new Set(EXPORT_FORMATS.filter(f => f.default).map(f => f.id)));
  const [selectedExportShots, setSelectedExportShots] = useState<Set<string>>(new Set());
  const generationAbortRef = useRef(false);

  // Video state
  const [videoExpanded, setVideoExpanded] = useState(false);
  const [videoConfig, setVideoConfig] = useState<VideoConfig>({ baseImageId: '', duration: 4, resolution: '720p', engine: 'veo' });
  const [videoGenerating, setVideoGenerating] = useState(false);
  const [videoStage, setVideoStage] = useState('');
  const [generatedVideo, setGeneratedVideo] = useState<GeneratedVideo | null>(null);
  const videoAbortRef = useRef(false);

  // AI Product Recognition
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
  const [analyzingProduct, setAnalyzingProduct] = useState(false);
  const [analysisPhase, setAnalysisPhase] = useState<'idle' | 'analyzing' | 'done'>('idle');
  const [productName, setProductName] = useState('');

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

  /* ── Generate all model portraits ── */
  const handleGeneratePortraits = useCallback(async () => {
    setGeneratingPortraits(true);
    setPortraitProgress(0);
    setPortraitTotal(PLACEHOLDER_MODELS.length);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({ title: 'Error', description: 'Please log in first', variant: 'destructive' });
      setGeneratingPortraits(false);
      return;
    }

    const BATCH_SIZE = 2;
    const models = [...PLACEHOLDER_MODELS];
    let completed = 0;

    for (let i = 0; i < models.length; i += BATCH_SIZE) {
      const batch = models.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (m) => {
          try {
            const { data, error } = await supabase.functions.invoke('generate-model-portraits', {
              body: { model: m },
            });
            if (error) throw error;
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

      if (i + BATCH_SIZE < models.length) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    setGeneratingPortraits(false);
  }, []);

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
        const generated = assetData?.filter((a: Asset) => a.asset_type === 'ai_generated') ?? [];
        const originals = assetData?.filter((a: Asset) => a.asset_type === 'original') ?? [];
        setAssets(originals);
        if (generated.length > 0) {
          setGeneratedShots(generated.map((a: Asset) => ({
            id: a.id, url: a.url, shotLabel: a.shot_label || 'hero', promptUsed: a.prompt_used || '',
            isEditing: false, editPrompt: '', isRegenerating: false, previousUrl: null, showUndo: false,
          })));
          setCompletedSteps(new Set([1, 2, 3, 4]));
          setActiveStep(5);
          setShowExportPanel(true);
          setSelectedExportShots(new Set(generated.map((a: Asset) => a.id)));
        }
      }
      if (assetData) {
        const originals = assetData.filter((a: Asset) => a.asset_type === 'original');
        if (originals.length > 0) setAssets(originals);
      }
      setLoading(false);
    };
    fetchData();
  }, [user, id]);

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
  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newUrls = Array.from(files).map(f => URL.createObjectURL(f));
    setProductImages(prev => {
      const updated = [...prev, ...newUrls];
      // Trigger analysis when first image is added
      if (prev.length === 0 && updated.length > 0) {
        analyzeProduct(updated[0]);
      }
      return updated;
    });
    e.target.value = '';
  };

  const handleRemoveProductImage = (index: number) => {
    setProductImages(prev => {
      const next = [...prev];
      URL.revokeObjectURL(next[index]);
      next.splice(index, 1);
      // Re-analyze if hero image changed
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
    completeStep(1, `${productImages.length} image${productImages.length > 1 ? 's' : ''}`, 2);
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

  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setReferenceImage(url);
      setSelectedPreset('custom');
    }
  };

  /* ── Generation ── */
  const handleGenerate = async () => {
    if (!project || !selectedPreset) return;
    const presetName = STYLE_PRESETS.find(p => p.id === selectedPreset)?.name || selectedPreset;
    completeStep(3, presetName, 4);
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
      const { data, error } = await supabase.functions.invoke('generate-shots', {
        body: {
          projectId: project.id, preset: selectedPreset, shotCount, additionalContext,
          category: project.category, shotType: shootType === 'model' ? 'model_shot' : 'product_showcase',
          modelConfig: shootType === 'model' ? modelConfig : null,
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

      const shots: GeneratedShot[] = data.assets.map((a: any) => ({
        id: a.id, url: a.url, shotLabel: a.shot_label || 'hero', promptUsed: a.prompt_used || '',
        isEditing: false, editPrompt: '', isRegenerating: false, previousUrl: null, showUndo: false,
      }));
      setGeneratedShots(shots);
      setSelectedExportShots(new Set(shots.map(s => s.id)));
      completeStep(4, `${shots.length} shot${shots.length > 1 ? 's' : ''}`, 5);
      setShowExportPanel(true);
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
      link.download = `${project?.name || 'shot'}-${shot.shotLabel}.jpg`;
      link.target = '_blank';
      link.click();
    });
    toast({ title: `Downloading ${selected.length} shot${selected.length > 1 ? 's' : ''}` });
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: 'Link copied to clipboard' });
  };

  /* ── Video generation ── */
  const handleGenerateVideo = async () => {
    if (!project || !videoConfig.baseImageId) return;
    setVideoGenerating(true);
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
          resolution: videoConfig.resolution, engine: videoConfig.engine, projectId: project.id,
        },
      });
      clearInterval(stageInterval);
      if (videoAbortRef.current) return;
      if (error || !data?.asset) {
        toast({ title: 'Video generation failed', description: data?.error || error?.message || 'Unknown error', variant: 'destructive' });
        setVideoGenerating(false);
        return;
      }
      setGeneratedVideo({
        id: data.asset.id, url: data.asset.url, duration: videoConfig.duration,
        resolution: videoConfig.resolution, engine: videoConfig.engine,
      });
      setVideoGenerating(false);
    } catch {
      clearInterval(stageInterval);
      setVideoGenerating(false);
      toast({ title: 'Video generation failed', description: 'Network error', variant: 'destructive' });
    }
  };

  const handleCancelVideo = () => {
    videoAbortRef.current = true;
    setVideoGenerating(false);
  };

  const credits = shotCount === 'campaign' ? 5 : 1;
  const canGenerate = (selectedPreset || referenceImage) && shotCount;

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
          LEFT PANEL — Config
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

          {/* Horizontal step indicator */}
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
        </div>

        <Separator />

        {/* ── Scrollable active-step content ── */}
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
                additionalContext={additionalContext}
                setAdditionalContext={setAdditionalContext}
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
                exportFormats={exportFormats}
                setExportFormats={setExportFormats}
                selectedShots={selectedExportShots}
                setSelectedShots={setSelectedExportShots}
                generatedVideo={generatedVideo}
                onRegenerateAll={handleRegenerateAll}
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
            <Button className="w-full" disabled={!canGenerate} onClick={handleGenerate}>
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
      </div>

      {/* ════════════════════════════════════════════
          RIGHT PANEL — Viewport
         ════════════════════════════════════════════ */}
      <div className="flex-1 overflow-hidden bg-muted/30 h-screen relative canvas-dots">
        {activeStep === 1 && (
          <Step1Viewport productImages={productImages} productInfo={productInfo} analyzingProduct={analyzingProduct} analysisPhase={analysisPhase} productName={productName} setProductName={setProductName} />
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
              />
            )}
            {activeStep === 5 && (
              <Step5Viewport
                shots={generatedShots}
                shotCount={shotCount}
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
                onGenerate={handleGenerate}
              />
            )}
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

/* ── Step 2 Config (Left) ── */
function Step2Config({ shootType, setShootType, modelConfig, setModelConfig, modelUploadRef, onModelUpload, selectedTemplate, setSelectedTemplate, templateCategory, setTemplateCategory }: {
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
}) {
  const filteredTemplates = templateCategory === 'All'
    ? PRODUCT_SHOOT_TEMPLATES
    : PRODUCT_SHOOT_TEMPLATES.filter(t => t.category === templateCategory);

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

          {/* Upload */}
          <input ref={modelUploadRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={onModelUpload} />
          {modelConfig.uploadedModelUrl ? (
            <div className="relative w-20 h-24 rounded-lg overflow-hidden border">
              <img src={modelConfig.uploadedModelUrl} alt="Custom model" className="w-full h-full object-cover" />
              <button onClick={() => setModelConfig(prev => ({ ...prev, uploadedModelUrl: null }))} className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-background/80 flex items-center justify-center">
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ) : (
            <button onClick={() => modelUploadRef.current?.click()} className="w-full h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center gap-2 hover:border-primary/50 transition-colors">
              <Upload className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Upload custom model</p>
            </button>
          )}

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
                    <SelectLabel>Lifestyle</SelectLabel>
                    <SelectItem value="café">Café</SelectItem>
                    <SelectItem value="street">Street</SelectItem>
                    <SelectItem value="garden">Garden</SelectItem>
                    <SelectItem value="beach">Beach</SelectItem>
                    <SelectItem value="urban">Urban rooftop</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Studio</SelectLabel>
                    <SelectItem value="white-sweep">White sweep</SelectItem>
                    <SelectItem value="gray-seamless">Gray seamless</SelectItem>
                    <SelectItem value="dark-studio">Dark studio</SelectItem>
                    <SelectItem value="colored-gel">Colored gel</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
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

          <p className="text-[10px] text-muted-foreground">Select a model from the grid on the right →</p>
        </div>
      )}
    </div>
  );
}

/* ── Step 3 Config (Left) ── */
function Step3Config({ selectedPreset, setSelectedPreset, referenceImage, setReferenceImage, referenceInputRef, onReferenceUpload, shotCount, setShotCount, additionalContext, setAdditionalContext }: {
  selectedPreset: string | null;
  setSelectedPreset: (v: string | null) => void;
  referenceImage: string | null;
  setReferenceImage: (v: string | null) => void;
  referenceInputRef: React.RefObject<HTMLInputElement>;
  onReferenceUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  shotCount: string;
  setShotCount: (v: string) => void;
  additionalContext: string;
  setAdditionalContext: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
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

      {selectedPreset && (
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
                <p className="text-[10px] text-muted-foreground">5 shots · 5 credits</p>
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
function Step5Config({ shots, exportFormats, setExportFormats, selectedShots, setSelectedShots, generatedVideo, onRegenerateAll }: {
  shots: GeneratedShot[];
  exportFormats: Set<string>;
  setExportFormats: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedShots: Set<string>;
  setSelectedShots: React.Dispatch<React.SetStateAction<Set<string>>>;
  generatedVideo: GeneratedVideo | null;
  onRegenerateAll: () => void;
}) {
  const toggleFormat = (id: string) => {
    setExportFormats(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleShot = (id: string) => {
    setSelectedShots(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-foreground">Export formats</p>
      <div className="space-y-1.5">
        {EXPORT_FORMATS.map(f => (
          <label key={f.id} className="flex items-center gap-2 text-xs cursor-pointer">
            <Checkbox checked={exportFormats.has(f.id)} onCheckedChange={() => toggleFormat(f.id)} />
            {f.label}
          </label>
        ))}
      </div>

      {shots.length > 1 && (
        <>
          <Separator />
          <p className="text-xs font-medium text-muted-foreground">Select shots</p>
          <div className="grid grid-cols-3 gap-1">
            {shots.map(shot => (
              <button
                key={shot.id}
                onClick={() => toggleShot(shot.id)}
                className={`relative rounded-md overflow-hidden aspect-square ${
                  selectedShots.has(shot.id) ? 'ring-2 ring-primary' : 'opacity-50'
                }`}
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
function Step1Viewport({ productImages, productInfo, analyzingProduct, analysisPhase, productName, setProductName }: { 
  productImages: string[]; 
  productInfo: ProductInfo | null;
  analyzingProduct: boolean;
  analysisPhase: 'idle' | 'analyzing' | 'done';
  productName: string;
  setProductName: (name: string) => void;
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

            {/* Model note */}
            {productInfo.modelNote && (
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
function Step2Viewport({ shootType, modelConfig, setModelConfig, selectedModelData, selectedTemplate, setSelectedTemplate, templateCategory }: {
  shootType: 'product' | 'model' | null;
  modelConfig: ModelConfig;
  setModelConfig: React.Dispatch<React.SetStateAction<ModelConfig>>;
  selectedModelData: typeof PLACEHOLDER_MODELS[0] | undefined;
  selectedTemplate: string | null;
  setSelectedTemplate: React.Dispatch<React.SetStateAction<string | null>>;
  templateCategory: string;
}) {
  const [modelImages, setModelImages] = useState<Record<string, string>>({});
  const [generatingPortraits, setGeneratingPortraits] = useState(false);
  const [portraitProgress, setPortraitProgress] = useState(0);
  const [portraitTotal, setPortraitTotal] = useState(0);

  const filteredTemplates = templateCategory === 'All'
    ? PRODUCT_SHOOT_TEMPLATES
    : PRODUCT_SHOOT_TEMPLATES.filter(t => t.category === templateCategory);

  const handleGeneratePortraits = async () => {
    setGeneratingPortraits(true);
    setPortraitProgress(0);
    setPortraitTotal(PLACEHOLDER_MODELS.length);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({ title: 'Error', description: 'Please log in first', variant: 'destructive' });
      setGeneratingPortraits(false);
      return;
    }

    const BATCH_SIZE = 2;
    const models = [...PLACEHOLDER_MODELS];
    let completed = 0;

    for (let i = 0; i < models.length; i += BATCH_SIZE) {
      const batch = models.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (m) => {
          try {
            const { data, error } = await supabase.functions.invoke('generate-model-portraits', {
              body: { model: m },
            });
            if (error) throw error;
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

      if (i + BATCH_SIZE < models.length) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    setGeneratingPortraits(false);
  };

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

  // Model shoot — grid with generate button
  return (
    <div className="h-full flex flex-col animate-in fade-in duration-300">
      <div className="shrink-0 mb-4 flex items-start justify-between">
        <div>
          <p className="font-medium text-lg" style={{ fontFamily: "'Instrument Serif', serif" }}>Choose an AI Model</p>
          <p className="text-sm text-muted-foreground mt-1">Select a model for your shoot. {selectedModelData ? `Selected: ${selectedModelData.name}` : 'Click to select.'}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 shrink-0"
          disabled={generatingPortraits}
          onClick={handleGeneratePortraits}
        >
          {generatingPortraits ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {portraitProgress}/{portraitTotal}
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              Generate Portraits
            </>
          )}
        </Button>
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
function Step4Viewport({ progress, stage, shotCount }: {
  progress: number;
  stage: string;
  shotCount: string;
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
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="aspect-[4/5] rounded-xl" />
            <Skeleton className="aspect-[4/5] rounded-xl" />
            <Skeleton className="aspect-[4/5] rounded-xl" />
            <Skeleton className="aspect-[4/5] rounded-xl" />
          </div>
        ) : (
          <div className="max-w-xs mx-auto">
            <Skeleton className="aspect-[4/5] rounded-xl" />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Step 5 Viewport (Results) ── */
function Step5Viewport({ shots, shotCount, onEditShot, onUndoEdit, onCopyLink, updateShot, videoExpanded, setVideoExpanded, videoConfig, setVideoConfig, videoGenerating, videoStage, generatedVideo, onGenerateVideo, onCancelVideo, setGeneratedVideo, creditsRemaining, onGenerate }: {
  shots: GeneratedShot[];
  shotCount: string;
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
        <div className="space-y-4">
          {shots[0] && <ShotCard shot={shots[0]} index={0} wide onEdit={onEditShot} onUndo={onUndoEdit} onCopyLink={onCopyLink} updateShot={updateShot} />}
          <div className="grid grid-cols-2 gap-4">
            {shots.slice(1).map((shot, i) => (
              <ShotCard key={shot.id} shot={shot} index={i + 1} onEdit={onEditShot} onUndo={onUndoEdit} onCopyLink={onCopyLink} updateShot={updateShot} />
            ))}
          </div>
        </div>
      ) : (
        <div className="max-w-lg">
          {shots[0] && <ShotCard shot={shots[0]} index={0} onEdit={onEditShot} onUndo={onUndoEdit} onCopyLink={onCopyLink} updateShot={updateShot} />}
        </div>
      )}

      {/* Single shot actions */}
      {!isCampaign && (
        <div className="max-w-lg space-y-3">
          <Button variant="outline" className="w-full" onClick={onGenerate}>
            Generate another variation — 1 credit
          </Button>
          <Button className="w-full" onClick={onGenerate}>
            Add 4 more for a Campaign Set — 4 credits
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

          {videoExpanded && !videoGenerating && !generatedVideo && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between">
                <p className="font-medium">Create a product video</p>
                <Button variant="ghost" size="sm" onClick={() => setVideoExpanded(false)}><X className="h-4 w-4" /></Button>
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
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Duration</label>
                  <ToggleGroup type="single" value={String(videoConfig.duration)} onValueChange={v => v && setVideoConfig(prev => ({ ...prev, duration: Number(v) }))} className="justify-start">
                    <ToggleGroupItem value="4" className="px-3">4s</ToggleGroupItem>
                    <ToggleGroupItem value="6" className="px-3">6s</ToggleGroupItem>
                    <ToggleGroupItem value="8" className="px-3">8s</ToggleGroupItem>
                  </ToggleGroup>
                </div>
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
                  <p className="text-xs text-muted-foreground">Veo: cinematic quality. Runway: faster.</p>
                </div>
              </div>
              <Button className="w-full" onClick={onGenerateVideo} disabled={!videoConfig.baseImageId}>
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
                <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => { setGeneratedVideo(null); setVideoExpanded(true); }}>
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
function ShotCard({ shot, index, wide, onEdit, onUndo, onCopyLink, updateShot }: {
  shot: GeneratedShot;
  index: number;
  wide?: boolean;
  onEdit: (shot: GeneratedShot) => void;
  onUndo: (shot: GeneratedShot) => void;
  onCopyLink: (url: string) => void;
  updateShot: (id: string, updates: Partial<GeneratedShot>) => void;
}) {
  return (
    <div className="rounded-xl overflow-hidden border bg-card animate-in fade-in duration-300" style={{ animationDelay: `${index * 100}ms` }}>
      <div className={`relative ${wide ? 'aspect-[16/9]' : 'aspect-[4/5]'} overflow-hidden bg-muted`}>
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

export default Studio;
