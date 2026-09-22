'use client';

import { useState, useRef } from 'react';
import { Search, Loader2, ChevronDown, ChevronUp, ExternalLink, Terminal, MapPin } from 'lucide-react';
import { useWorkspaceId } from '@/lib/workspace-context';
import { apiUrl } from '@/lib/workspace';
import { useLeadStore } from '@/features/leads/store';

const EXAMPLES = [
  'Semua klinik gigi di Surabaya yang punya email',
  'Leads yang ditambahkan minggu ini',
  'Restoran di Bali yang punya website',
  'Leads dengan WhatsApp yang belum dikontak',
  'Coffee shop di Jakarta Selatan',
  'Bisnis dengan pipeline stage Prospecting',
];

interface LeadRow {
  id: string;
  name: string;
  category: string | null;
  address: string | null;
  phone: string | null;
  emails: string[] | null;
  whatsapp: string[] | null;
  website: string | null;
  maps_url: string | null;
  pipeline_stage: string | null;
  created_at: string;
  lat: number | null;
  lng: number | null;
}

interface QueryResult {
  results: LeadRow[];
  generatedSql: string | null;
  reasoning: string | null;
}

export default function QueryPage() {
  const workspaceId = useWorkspaceId();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sqlOpen, setSqlOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { selectedLeadId, setSelectedLeadId } = useLeadStore();

  const run = async (q: string) => {
    if (!q.trim()) return;
    setQuery(q);
    setLoading(true);
    setError(null);
    setResult(null);
    setSqlOpen(false);

    try {
      const params = new URLSearchParams({ workspaceId, q: q.trim(), limit: '100' });
      const res = await fetch(`${apiUrl()}/leads/search?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Query failed');
      }
      const data = await res.json();
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    run(query);
  };

  return (
    <div className="h-full flex overflow-hidden">

      {/* Left side — Query + Results */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <div className="p-6 flex flex-col gap-4 overflow-y-auto flex-1">

          {/* Header */}
          <div>
            <h1 className="text-sm font-bold uppercase tracking-widest">AI Query</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Tanya database leads kamu pakai bahasa sehari-hari. AI akan generate SQL dan jalankan secara otomatis.
            </p>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder='Contoh: "Semua klinik di Jakarta yang punya email"'
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-border bg-accent/20 focus:outline-none focus:border-primary transition-colors"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-5 py-2.5 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              {loading ? 'Running...' : 'Run'}
            </button>
          </form>

          {/* Example queries */}
          {!result && !loading && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Contoh query</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map(ex => (
                  <button
                    key={ex}
                    onClick={() => run(ex)}
                    className="px-3 py-1.5 border border-border text-xs text-muted-foreground hover:border-primary hover:text-foreground transition-colors text-left"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="border border-red-500/40 bg-red-500/5 px-4 py-3 text-xs text-red-600">
              {error}
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="flex flex-col gap-4">

              {/* SQL accordion */}
              <div className="border border-border">
                <button
                  onClick={() => setSqlOpen(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Generated SQL</span>
                    {result.generatedSql
                      ? <span className="text-green-600">● AI</span>
                      : <span className="text-muted-foreground">● Fallback ILIKE</span>
                    }
                  </div>
                  {sqlOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {sqlOpen && (
                  <div className="border-t border-border px-4 py-3 bg-accent/10">
                    {result.generatedSql ? (
                      <pre className="text-[11px] font-mono text-foreground whitespace-pre-wrap break-all">
                        {result.generatedSql}
                      </pre>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        SQL agent unavailable — used keyword search fallback.
                      </p>
                    )}
                    {result.reasoning && (
                      <p className="mt-2 text-[10px] text-muted-foreground border-t border-border pt-2">
                        <span className="font-bold">Reasoning:</span> {result.reasoning}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Results count */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  <span className="font-bold text-foreground">{result.results.length}</span> lead{result.results.length !== 1 ? 's' : ''} ditemukan
                </p>
                {result.results.length > 0 && (
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                    Klik baris untuk buka di Maps
                  </p>
                )}
              </div>

              {/* Table */}
              {result.results.length === 0 ? (
                <div className="border border-dashed border-border py-12 text-center">
                  <p className="text-xs text-muted-foreground">Tidak ada lead yang cocok dengan query ini.</p>
                </div>
              ) : (
                <div className="border border-border overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-accent/30">
                        {['#', 'Nama', 'Kategori', 'Alamat', 'Phone', 'Email', 'WA', 'Stage', 'Actions'].map(h => (
                          <th
                            key={h}
                            className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.results.map((lead, i) => (
                        <tr
                          key={lead.id}
                          onClick={() => {
                            if (lead.lat && lead.lng) {
                              setSelectedLeadId(selectedLeadId === lead.id ? null : lead.id);
                            }
                          }}
                          className={`border-b border-border transition-colors ${
                            lead.lat && lead.lng ? 'cursor-pointer' : ''
                          } ${
                            selectedLeadId === lead.id
                              ? 'bg-primary/10 border-l-2 border-l-primary'
                              : 'hover:bg-accent/20'
                          }`}
                        >
                          <td className="px-3 py-2.5 text-muted-foreground tabular-nums">{i + 1}</td>
                          <td className="px-3 py-2.5 font-bold max-w-[180px] truncate">
                            <div className="flex items-center gap-1.5">
                              {lead.lat && lead.lng && <MapPin className="w-3 h-3 text-primary shrink-0" />}
                              {lead.name}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground max-w-[120px] truncate">
                            {lead.category ?? '—'}
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground max-w-[200px] truncate">
                            {lead.address ?? '—'}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            {lead.phone
                              ? <a href={`tel:${lead.phone}`} className="hover:text-primary transition-colors">{lead.phone}</a>
                              : <span className="text-muted-foreground">—</span>
                            }
                          </td>
                          <td className="px-3 py-2.5 max-w-[160px] truncate">
                            {lead.emails && lead.emails.length > 0
                              ? <a href={`mailto:${lead.emails[0]}`} className="hover:text-primary transition-colors">{lead.emails[0]}</a>
                              : <span className="text-muted-foreground">—</span>
                            }
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            {lead.whatsapp && lead.whatsapp.length > 0
                              ? (
                                <a
                                  href={`https://wa.me/${lead.whatsapp[0].replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-green-600 hover:text-green-700 transition-colors font-medium"
                                >
                                  {lead.whatsapp[0]}
                                </a>
                              )
                              : <span className="text-muted-foreground">—</span>
                            }
                          </td>
                          <td className="px-3 py-2.5">
                            {lead.pipeline_stage
                              ? <span className="px-1.5 py-0.5 border border-border text-[9px] font-bold uppercase tracking-wider">{lead.pipeline_stage}</span>
                              : <span className="text-muted-foreground">—</span>
                            }
                          </td>
                          <td className="px-3 py-2.5">
                            {lead.maps_url && (
                              <a
                                href={lead.maps_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-primary hover:underline whitespace-nowrap"
                              >
                                Maps <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Back / new query */}
              <button
                onClick={() => { setResult(null); setError(null); setQuery(''); setSelectedLeadId(null); inputRef.current?.focus(); }}
                className="self-start text-[10px] uppercase font-bold text-muted-foreground hover:text-primary transition-colors tracking-widest"
              >
                ← Query baru
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
