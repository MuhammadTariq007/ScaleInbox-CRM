'use client';

import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { SettingsPanelHead } from './settings-panel-head';

interface TenantSettingsResponse {
  settings: {
    billing_email: string;
    timezone: string;
    feature_flags: Record<string, boolean>;
  };
  tenant: {
    id: string;
    name: string;
    plan_name: string;
  };
}

export function TenantConfigPanel() {
  const t = useTranslations('Settings.tenantConfig');
  const { activeTenantId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [planName, setPlanName] = useState('starter');
  const [billingEmail, setBillingEmail] = useState('');
  const [timezone, setTimezone] = useState('UTC');

  useEffect(() => {
    if (!activeTenantId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/tenant/settings', { cache: 'no-store' });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.error || 'Failed to load tenant settings');
        }

        const json = (await res.json()) as TenantSettingsResponse;
        if (cancelled) return;

        setTenantName(json.tenant?.name ?? '');
        setPlanName(json.tenant?.plan_name ?? 'starter');
        setBillingEmail(json.settings?.billing_email ?? '');
        setTimezone(json.settings?.timezone ?? 'UTC');
      } catch (err) {
        console.error('[TenantConfigPanel] load failed', err);
        toast.error(err instanceof Error ? err.message : t('loadError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [activeTenantId, t]);

  async function handleSave() {
    if (!activeTenantId) {
      toast.error(t('missingTenant'));
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/tenant/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billing_email: billingEmail, timezone }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to save tenant configuration');
      }

      toast.success(t('saved'));
    } catch (err) {
      console.error('[TenantConfigPanel] save failed', err);
      toast.error(err instanceof Error ? err.message : t('saveError'));
    } finally {
      setSaving(false);
    }
  }

  if (!activeTenantId) {
    return (
      <section className="max-w-3xl animate-in fade-in-50 duration-200">
        <SettingsPanelHead
          title={t('title')}
          description={t('description')}
        />
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
          {t('missingTenant')}
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-3xl animate-in fade-in-50 duration-200">
      <SettingsPanelHead
        title={t('title')}
        description={t('description')}
      />

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('loading')}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">{t('tenantName')}</label>
                <Input value={tenantName} readOnly />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">{t('plan')}</label>
                <Input value={planName} readOnly />
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-border bg-card p-4">
            <div>
              <label htmlFor="billing-email" className="mb-2 block text-sm font-medium text-foreground">
                {t('billingEmail')}
              </label>
              <Input
                id="billing-email"
                type="email"
                value={billingEmail}
                onChange={(event) => setBillingEmail(event.target.value)}
                placeholder="billing@company.com"
              />
            </div>

            <div>
              <label htmlFor="tenant-timezone" className="mb-2 block text-sm font-medium text-foreground">
                {t('timezone')}
              </label>
              <Input
                id="tenant-timezone"
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                placeholder="UTC"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {t('save')}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
