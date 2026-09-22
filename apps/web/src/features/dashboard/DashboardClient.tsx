'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Globe, Mail, MessageCircle, Sparkles } from 'lucide-react';
import { LeadsTable, countryOf, type LeadRow } from '../leads/LeadsTable';
import { LeadDetailPanel } from '../leads/LeadDetailPanel';
import { useLeadStore } from '../leads/store';
import { useWorkspaceId } from '@/lib/workspace-context';
import { apiUrl } from '@/lib/workspace';

export function DashboardClient({ leads: initialLeads }: { leads: LeadRow[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const searchParams = useSearchParams();
  const { selectedLeadId, setSelectedLeadId } = useLeadStore();
  const workspaceId = useWorkspaceId();

  // Deep link: `?lead=<id>` opens that lead's detail, fetching it if it is not in the list.
  useEffect(() => {
    const leadId = searchParams.get('lead');
    if (!leadId) return;
    setSelectedLeadId(leadId);
    if (leads.some((l) => l.id === leadId)) return;

    fetch(`${apiUrl()}/leads/${leadId}?workspaceId=${workspaceId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setLeads((prev) => [
          ...prev,
          {
            id: data.id,
            source: data.source ?? 'places',
            name: data.name,
            address: data.address ?? null,
            emails: data.emails ?? null,
            whatsapp: data.whatsapp ?? null,
            category: data.category ?? null,
            mapsUrl: data.mapsUrl ?? null,
            phone: data.phone ?? null,
            pipelineStage: data.pipelineStage ?? null,
            createdAt: data.createdAt ?? new Date().toISOString(),
          },
        ]);
      })
      .catch(() => {});
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return {
      total: leads.length,
      countries: new Set(leads.map((l) => countryOf(l.address)).filter(Boolean)).size,
      withEmail: leads.filter((l) => l.emails?.length).length,
      withWhatsapp: leads.filter((l) => l.whatsapp?.length).length,
      fresh: leads.filter((l) => new Date(l.createdAt).getTime() > weekAgo).length,
    };
  }, [leads]);

  return (
    <div className="w-full h-full flex overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 border-r border-border">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border border-b border-border shrink-0">
          <Stat label="Total leads" value={stats.total} sub={`${stats.fresh} added this week`} icon={Sparkles} />
          <Stat label="Countries" value={stats.countries} sub="reached so far" icon={Globe} />
          <Stat
            label="With email"
            value={stats.withEmail}
            sub={pct(stats.withEmail, stats.total)}
            icon={Mail}
          />
          <Stat
            label="With WhatsApp"
            value={stats.withWhatsapp}
            sub={pct(stats.withWhatsapp, stats.total)}
            icon={MessageCircle}
          />
        </div>

        <LeadsTable leads={leads} />
      </div>

      {selectedLeadId && <LeadDetailPanel />}
    </div>
  );
}

function pct(part: number, total: number): string {
  return total === 0 ? '—' : `${Math.round((part / total) * 100)}% of leads`;
}

function Stat({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: number;
  sub: string;
  icon: typeof Globe;
}) {
  return (
    <div className="bg-background px-4 py-3 flex items-start justify-between gap-2">
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {label}
        </div>
        <div className="text-xl font-bold tabular-nums leading-tight mt-0.5">{value}</div>
        <div className="text-[10px] text-muted-foreground truncate">{sub}</div>
      </div>
      <Icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
    </div>
  );
}
