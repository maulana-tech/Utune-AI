'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Mail, MessageCircle, Phone, Search, X } from 'lucide-react';
import { useLeadStore } from './store';
import { AddLeadButton } from './AddLeadDialog';

export interface LeadRow {
  id: string;
  source: string;
  name: string;
  address: string | null;
  emails: string[] | null;
  whatsapp: string[] | null;
  category: string | null;
  mapsUrl: string | null;
  phone: string | null;
  pipelineStage: string | null;
  createdAt: string;
}

const STAGES = [
  'Prospecting',
  'Contacted',
  'Qualified',
  'Proposal',
  'Negotiation',
  'Closed Won',
  'Closed Lost',
];

type SortKey = 'name' | 'country' | 'category' | 'pipelineStage' | 'createdAt';

const SOURCE_LABELS: Record<string, string> = {
  places: 'Places',
  apollo: 'Apollo',
  apify: 'Apify',
  firecrawl: 'Firecrawl',
};

/** Google formats addresses as "street, city, country", so the tail is the country. */
export function countryOf(address: string | null): string {
  if (!address) return '';
  const parts = address.split(',');
  return parts[parts.length - 1]?.trim() ?? '';
}

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function isNew(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < 24 * 60 * 60 * 1000;
}

export function LeadsTable({ leads }: { leads: LeadRow[] }) {
  const { selectedLeadId, setSelectedLeadId } = useLeadStore();

  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('');
  const [category, setCategory] = useState('');
  const [stage, setStage] = useState('');
  const [source, setSource] = useState('');
  const [contactOnly, setContactOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortAsc, setSortAsc] = useState(false);

  const countries = useMemo(
    () => [...new Set(leads.map((l) => countryOf(l.address)).filter(Boolean))].sort(),
    [leads],
  );
  const categories = useMemo(
    () => [...new Set(leads.map((l) => l.category).filter(Boolean) as string[])].sort(),
    [leads],
  );
  const sources = useMemo(() => [...new Set(leads.map((l) => l.source))].sort(), [leads]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (q && !`${l.name} ${l.address ?? ''} ${l.category ?? ''}`.toLowerCase().includes(q))
        return false;
      if (country && countryOf(l.address) !== country) return false;
      if (category && l.category !== category) return false;
      if (stage && l.pipelineStage !== stage) return false;
      if (source && l.source !== source) return false;
      if (contactOnly && !l.emails?.length && !l.whatsapp?.length) return false;
      return true;
    });
  }, [leads, search, country, category, stage, source, contactOnly]);

  const sorted = useMemo(() => {
    const value = (l: LeadRow) =>
      sortKey === 'country' ? countryOf(l.address) : (l[sortKey] ?? '');
    return [...filtered].sort((a, b) => {
      const cmp = String(value(a)).localeCompare(String(value(b)), undefined, { numeric: true });
      return sortAsc ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(key !== 'createdAt');
    }
  };

  const activeFilters =
    [country, category, stage, source].filter(Boolean).length + (contactOnly ? 1 : 0);

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <button
      onClick={() => toggleSort(k)}
      className="flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {label}
      {sortKey === k &&
        (sortAsc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
    </button>
  );

  return (
    <div className="flex flex-col h-full min-w-0">
      {/* TOOLBAR */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border bg-background shrink-0">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter loaded leads by name, address, category..."
            className="w-full h-9 pl-9 pr-3 text-xs bg-accent/30 border border-border focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <Select value={country} onChange={setCountry} all="All countries" options={countries} />
        <Select value={category} onChange={setCategory} all="All categories" options={categories} />
        <Select value={stage} onChange={setStage} all="All stages" options={STAGES} />
        <Select
          value={source}
          onChange={setSource}
          all="All sources"
          options={sources}
          label={(v) => SOURCE_LABELS[v] ?? v}
        />

        <button
          onClick={() => setContactOnly((v) => !v)}
          className={`h-9 px-3 border text-[10px] font-bold uppercase tracking-widest transition-colors ${
            contactOnly
              ? 'bg-foreground text-background border-foreground'
              : 'bg-background text-muted-foreground border-border hover:border-primary/50'
          }`}
        >
          Contactable
        </button>

        {activeFilters > 0 && (
          <button
            onClick={() => {
              setCountry('');
              setCategory('');
              setStage('');
              setSource('');
              setContactOnly(false);
            }}
            className="h-9 px-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}

        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground tabular-nums ml-auto">
          {sorted.length} / {leads.length} leads
        </span>
        <AddLeadButton />
      </div>

      {/* TABLE */}
      <div className="flex-1 overflow-auto">
        {sorted.length === 0 ? (
          <EmptyState hasLeads={leads.length > 0} />
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-accent/40 backdrop-blur">
              <tr className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <th className="text-left px-4 py-2 border-b border-border">
                  <SortHeader label="Business" k="name" />
                </th>
                <th className="text-left px-3 py-2 border-b border-border w-[140px]">
                  <SortHeader label="Country" k="country" />
                </th>
                <th className="text-left px-3 py-2 border-b border-border w-[150px]">
                  <SortHeader label="Category" k="category" />
                </th>
                <th className="text-left px-3 py-2 border-b border-border w-[130px]">Contact</th>
                <th className="text-left px-3 py-2 border-b border-border w-[130px]">
                  <SortHeader label="Stage" k="pipelineStage" />
                </th>
                <th className="text-left px-3 py-2 border-b border-border w-[110px]">
                  <SortHeader label="Added" k="createdAt" />
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => setSelectedLeadId(lead.id)}
                  className={`cursor-pointer border-b border-border transition-colors ${
                    selectedLeadId === lead.id ? 'bg-accent' : 'hover:bg-accent/40'
                  }`}
                >
                  <td className="px-4 py-2.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold truncate">{lead.name}</span>
                      <span className="px-1.5 py-0.5 border border-border text-[8px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">
                        {SOURCE_LABELS[lead.source] ?? lead.source}
                      </span>
                      {isNew(lead.createdAt) && (
                        <span className="px-1.5 py-0.5 bg-green-600 text-white text-[8px] font-bold uppercase tracking-wider shrink-0">
                          New
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">{lead.address}</div>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground truncate">
                    {countryOf(lead.address) || '—'}
                  </td>
                  <td className="px-3 py-2.5 truncate">{lead.category ?? '—'}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      {lead.emails?.length ? <Mail className="w-3.5 h-3.5 text-primary" /> : null}
                      {lead.whatsapp?.length ? (
                        <MessageCircle className="w-3.5 h-3.5 text-green-600" />
                      ) : null}
                      {lead.phone ? <Phone className="w-3.5 h-3.5" /> : null}
                      {!lead.emails?.length && !lead.whatsapp?.length && !lead.phone && '—'}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    {lead.pipelineStage ? (
                      <span className="px-1.5 py-0.5 border border-border text-[9px] font-bold uppercase tracking-wider whitespace-nowrap">
                        {lead.pipelineStage}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                    {timeAgo(lead.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Select({
  value,
  onChange,
  all,
  options,
  label = (v) => v,
}: {
  value: string;
  onChange: (v: string) => void;
  all: string;
  options: string[];
  label?: (v: string) => string;
}) {
  if (options.length === 0) return null;
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 max-w-[150px] px-2 text-[11px] bg-background border border-border focus:outline-none focus:border-primary transition-colors"
    >
      <option value="">{all}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {label(o)}
        </option>
      ))}
    </select>
  );
}

function EmptyState({ hasLeads }: { hasLeads: boolean }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 p-16 text-center">
      <Search className="w-10 h-10 text-muted-foreground/40" />
      <div className="font-bold text-sm">{hasLeads ? 'No leads match' : 'No leads yet'}</div>
      <p className="text-[11px] text-muted-foreground max-w-[320px] leading-relaxed">
        {hasLeads
          ? 'Loosen the filters above to see more of your leads.'
          : 'Use the search bar at the top to scrape businesses — pick a country or search worldwide.'}
      </p>
    </div>
  );
}
