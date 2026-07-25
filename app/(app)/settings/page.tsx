'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings as SettingsIcon,
  ScanFace,
  Camera,
  Bell,
  Volume2,
  Cpu,
  Palette,
  Type,
  Save,
  Loader2,
  Mail,
  Phone,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-components';
import { useQuery } from '@/hooks/use-query';
import { getSettings, upsertSettings } from '@/lib/data';
import type { Settings as SettingsType, FontSize } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { data: settings, refetch } = useQuery(getSettings, []);
  const [form, setForm] = useState<Partial<SettingsType>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  function update<K extends keyof SettingsType>(key: K, value: SettingsType[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await upsertSettings(form);
      toast.success('Settings saved');
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save settings');
    } finally {
      setSaving(false);
    }
  }

  const fontSizes: { value: FontSize; label: string }[] = [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
    { value: 'xlarge', label: 'Extra Large' },
  ];

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Configure AI features, accessibility, and caregiver alerts."
        icon={SettingsIcon}
        actions={
          <Button onClick={handleSave} disabled={saving} className="rounded-xl">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {saving ? 'Saving…' : 'Save Settings'}
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* AI features */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Cpu className="h-5 w-5 text-primary" /> AI Features
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ToggleRow
              icon={ScanFace}
              title="Face Recognition"
              description="Identify patients by face before validation."
              checked={form.face_recognition_enabled ?? true}
              onChange={(v) => update('face_recognition_enabled', v)}
            />
            <ToggleRow
              icon={Camera}
              title="Medicine Detection"
              description="YOLOv8 webcam-based medicine detection."
              checked={form.medicine_detection_enabled ?? true}
              onChange={(v) => update('medicine_detection_enabled', v)}
            />
          </CardContent>
        </Card>

        {/* Caregiver alerts */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-5 w-5 text-warning" /> Caregiver Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ToggleRow
              icon={Bell}
              title="Enable Alerts"
              description="Notify a caregiver when a validation fails."
              checked={form.caregiver_alerts_enabled ?? false}
              onChange={(v) => update('caregiver_alerts_enabled', v)}
            />
            <div className="space-y-2">
              <Label htmlFor="caregiver_email"><Mail className="mr-1 inline h-3.5 w-3.5" /> Caregiver Email</Label>
              <Input
                id="caregiver_email"
                type="email"
                value={form.caregiver_email ?? ''}
                onChange={(e) => update('caregiver_email', e.target.value)}
                className="rounded-xl"
                placeholder="caregiver@clinic.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="caregiver_phone"><Phone className="mr-1 inline h-3.5 w-3.5" /> Caregiver Phone</Label>
              <Input
                id="caregiver_phone"
                value={form.caregiver_phone ?? ''}
                onChange={(e) => update('caregiver_phone', e.target.value)}
                className="rounded-xl"
                placeholder="+1 555 0100"
              />
            </div>
            <ToggleRow
              icon={Mail}
              title="Email Notifications"
              description="Send alerts via email."
              checked={form.notification_email ?? true}
              onChange={(v) => update('notification_email', v)}
            />
            <ToggleRow
              icon={Phone}
              title="SMS Notifications"
              description="Send alerts via SMS."
              checked={form.notification_sms ?? false}
              onChange={(v) => update('notification_sms', v)}
            />
          </CardContent>
        </Card>

        {/* Future integrations */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Volume2 className="h-5 w-5 text-accent" /> Future Integrations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ToggleRow
              icon={Volume2}
              title="Voice Assistant"
              description="Spoken guidance for patients during validation."
              checked={form.voice_assistant_enabled ?? false}
              onChange={(v) => update('voice_assistant_enabled', v)}
            />
            <ToggleRow
              icon={Cpu}
              title="IoT Pill Dispenser"
              description="Connect to a smart pill dispenser for automatic dosing."
              checked={form.iot_pill_dispenser_enabled ?? false}
              onChange={(v) => update('iot_pill_dispenser_enabled', v)}
            />
            <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
              These integrations are ready for future expansion. Toggle them on to signal readiness in the data model.
            </div>
          </CardContent>
        </Card>

        {/* Appearance & accessibility */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="h-5 w-5 text-secondary" /> Appearance & Accessibility
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Type className="h-4 w-4" /> Font Size</Label>
              <Select value={form.font_size ?? 'medium'} onValueChange={(v) => update('font_size', v as FontSize)}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {fontSizes.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Larger fonts help elderly users read schedules and results.</p>
            </div>
            <ToggleRow
              icon={Palette}
              title="High Contrast"
              description="Increase contrast for better readability."
              checked={form.high_contrast ?? false}
              onChange={(v) => update('high_contrast', v)}
            />
            <div className="space-y-2">
              <Label>Theme</Label>
              <Select value={form.theme ?? 'light'} onValueChange={(v) => update('theme', v)}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
      <div className="flex items-start gap-3">
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-foreground')}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
