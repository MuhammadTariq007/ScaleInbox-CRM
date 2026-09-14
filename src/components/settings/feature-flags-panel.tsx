'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Save, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { SettingsPanelHead } from './settings-panel-head';

interface FeatureFlagState {
  broadcasts: boolean;
  automations: boolean;
  ai_assistant: boolean;
  shared_inbox: boolean;
  contacts: boolean;
  custom_fields: boolean;
  whatsapp_integration: boolean;
}

interface QuotaState {
  seats_limit: number;
  broadcast_limit_per_month: number;
  contacts_limit: number;
  automation_limit: number;
}

const FLAG_DEFS = [
  { key: 'broadcasts', label: 'Broadcasts' },
  { key: 'automations', label: 'Automations' },
  { key: 'ai_assistant', label: 'AI assistant' },
  { key: 'shared_inbox', label: 'Shared inbox' },
  { key: 'contacts', label: 'Contacts' },
  { key: 'custom_fields', label: 'Custom fields' },
  { key: 'whatsapp_integration', label: 'WhatsApp integration' },
] as const;

export function FeatureFlagsPanel() {
  const t = useTranslations('Settings.featureFlags');
  const { activeTenantId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [flags, setFlags] = useState<FeatureFlagState>({
    broadcasts: true,
    automations: true,
    ai_assistant: false,
    shared_inbox: true,
    contacts: true,
    custom_fields: true,
    whatsapp_integration: true,
  });
  const [quotaLimits, setQuotaLimits] = useState<QuotaState>({
    seats_limit: 5,
    broadcast_limit_per_month: 20,
    contacts_limit: 2000,
    automation_limit: 3,
  });
  const [planName, setPlanName] = useState('starter');

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
          throw new Error(payload.error || 'Failed to load tenant flags');
        }

        const json = (await res.json()) as {
          tenant: { plan_name?: string };
          settings: { feature_flags?: Partial<FeatureFlagState> };
          quota_limits?: Partial<QuotaState>;
        };
        if (cancelled) return;

        setPlanName(json.tenant?.plan_name ?? 'starter');
        setFlags({
          broadcasts: json.settings?.feature_flags?.broadcasts ?? true,
          automations: json.settings?.feature_flags?.automations ?? true,
          ai_assistant: json.settings?.feature_flags?.ai_assistant ?? false,
          shared_inbox: json.settings?.feature_flags?.shared_inbox ?? true,
          contacts: json.settings?.feature_flags?.contacts ?? true,
          custom_fields: json.settings?.feature_flags?.custom_fields ?? true,
          whatsapp_integration: json.settings?.feature_flags?.whatsapp_integration ?? true,
        });
        setQuotaLimits({
          seats_limit: json.quota_limits?.seats_limit ?? 5,
          broadcast_limit_per_month: json.quota_limits?.broadcast_limit_per_month ?? 20,
          contacts_limit: json.quota_limits?.contacts_limit ?? 2000,
          automation_limit: json.quota_limits?.automation_limit ?? 3,
        });
      } catch (err) {
        console.error('[FeatureFlagsPanel] load failed', err);
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

  const quotaCards = useMemo(() => {
    const effectiveQuota = {
      seats: quotaLimits.seats_limit || 5,
      broadcasts: quotaLimits.broadcast_limit_per_month || 20,
      contacts: quotaLimits.contacts_limit || 2000,
      automations: quotaLimits.automation_limit || 3,
    };

    return [
      { label: t('quota.seats'), value: `${effectiveQuota.seats}` },
      { label: t('quota.broadcasts'), value: `${effectiveQuota.broadcasts}/mo` },
      { label: t('quota.contacts'), value: `${effectiveQuota.contacts}` },
      { label: t('quota.automations'), value: `${effectiveQuota.automations}` },
    ];
  }, [quotaLimits, t]);

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
        body: JSON.stringify({ feature_flags: flags, quota_limits: quotaLimits }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to save feature flags');
      }

      toast.success(t('saved'));
    } catch (err) {
      console.error('[FeatureFlagsPanel] save failed', err);
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
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {quotaCards.map((card) => (
              <div key={card.label} className="rounded-xl border border-border bg-card p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">{card.label}</div>
                <div className="mt-3 text-2xl font-semibold text-foreground">{card.value}</div>
              </div>
            ))}
          </div>

          <div className="space-y-3 rounded-xl border border-border bg-card p-4">
            {FLAG_DEFS.map(({ key, label }) => (
              <label key={key} className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/20 p-3">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium text-foreground">{label}</div>
                    <div className="text-xs text-muted-foreground">{t(`details.${key}`)}</div>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={flags[key]}
                  onClick={() => setFlags((current) => ({ ...current, [key]: !current[key] }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${flags[key] ? 'bg-primary' : 'bg-muted'}`}
                >
                  <span
                    className={`inline-block h-5 w-5 rounded-full bg-white transition ${flags[key] ? 'translate-x-5' : 'translate-x-1'}`}
                    aria-hidden="true"
                  />
                </button>
              </label>
            ))}
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
