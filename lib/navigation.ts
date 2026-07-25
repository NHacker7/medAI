import {
  LayoutDashboard,
  Users,
  ScanFace,
  Camera,
  Pill,
  CalendarClock,
  BrainCircuit,
  History,
  BarChart3,
  Settings,
  Info,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  group: string;
  description: string;
}

export const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    group: 'Overview',
    description: 'At-a-glance activity and stats',
  },
  {
    title: 'Patients',
    href: '/patients',
    icon: Users,
    group: 'Care',
    description: 'Manage patient records',
  },
  {
    title: 'Face Registration',
    href: '/face-registration',
    icon: UserPlus,
    group: 'Care',
    description: 'Enroll patient faces',
  },
  {
    title: 'Face Recognition',
    href: '/face-recognition',
    icon: ScanFace,
    group: 'Care',
    description: 'Identify a patient by face',
  },
  {
    title: 'Medicine Database',
    href: '/medicines',
    icon: Pill,
    group: 'Medications',
    description: 'Manage the medicine catalog',
  },
  {
    title: 'Medicine Schedule',
    href: '/schedule',
    icon: CalendarClock,
    group: 'Medications',
    description: 'Plan scheduled doses',
  },
  {
    title: 'Medicine Detection',
    href: '/detection',
    icon: Camera,
    group: 'Validation',
    description: 'Detect medicine via webcam',
  },
  {
    title: 'AI Validation',
    href: '/validation',
    icon: BrainCircuit,
    group: 'Validation',
    description: 'Verify correct medication',
  },
  {
    title: 'History',
    href: '/history',
    icon: History,
    group: 'Insights',
    description: 'Search and export records',
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: BarChart3,
    group: 'Insights',
    description: 'Charts and PDF export',
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
    group: 'System',
    description: 'App preferences',
  },
  {
    title: 'About',
    href: '/about',
    icon: Info,
    group: 'System',
    description: 'About SmartMedicationAI',
  },
];

export const navGroups = ['Overview', 'Care', 'Medications', 'Validation', 'Insights', 'System'];
