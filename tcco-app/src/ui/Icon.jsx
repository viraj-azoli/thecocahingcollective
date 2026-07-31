import {
  Home, Users, Calendar, MessageSquare, NotebookPen, Library, TrendingUp,
  Heart, HandHeart, Settings, LogOut, Bell, Search, Star, Check, X, Plus,
  ChevronRight, ChevronLeft, ChevronDown, Clock, Video, FileText, Flame,
  Smile, Target, Sparkles, AlertCircle, CircleCheck, CircleDot, Loader2,
  CalendarDays, Wallet, ClipboardList, Package, LayoutDashboard, Compass,
  KeyRound, BookOpen,
} from 'lucide-react';

// The single place icons are imported. Screens ask for a name, never for a
// lucide module — so swapping the icon set later touches one file, and the
// 40 emoji the app used as icons have exactly one replacement each.
//
// Imported per-icon rather than from the barrel, so the bundle only carries
// what is actually referenced.
const ICONS = {
  home: Home,
  coaches: Users,
  sessions: Calendar,
  messages: MessageSquare,
  journal: NotebookPen,
  library: Library,
  progress: TrendingUp,
  saved: Heart,
  community: HandHeart,
  settings: Settings,
  logout: LogOut,
  bell: Bell,
  search: Search,
  star: Star,
  check: Check,
  close: X,
  plus: Plus,
  chevronRight: ChevronRight,
  chevronLeft: ChevronLeft,
  chevronDown: ChevronDown,
  clock: Clock,
  video: Video,
  document: FileText,
  streak: Flame,
  mood: Smile,
  goal: Target,
  spark: Sparkles,
  alert: AlertCircle,
  success: CircleCheck,
  pending: CircleDot,
  spinner: Loader2,
  availability: CalendarDays,
  earnings: Wallet,
  intake: ClipboardList,
  packages: Package,
  overview: LayoutDashboard,
  seekers: Compass,
  whitelist: KeyRound,
  content: BookOpen,
};

export default function Icon({ name, size = 16, strokeWidth = 1.75, className = '', ...rest }) {
  const Glyph = ICONS[name];
  if (!Glyph) {
    if (import.meta.env.DEV) console.warn(`Icon: unknown name "${name}"`);
    return null;
  }
  return (
    <Glyph
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden="true"
      focusable="false"
      {...rest}
    />
  );
}

export const iconNames = Object.keys(ICONS);
