'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X } from 'lucide-react';
import { useLeadStore } from './store';
import { apiUrl } from '@/lib/workspace';
import { useWorkspaceId } from '@/lib/workspace-context';
import { AddLeadDialog } from './AddLeadDialog';
import { DeleteLeadButton } from './DeleteLeadDialog';
import { GenerateEmailButton } from './GenerateEmailModal';

interface AiInsight {
  id: string;
  leadId: string;
  agentType: string;
  content: Record<string, unknown>;
  createdAt: string;
}

interface Note {
  id: string;
  leadId: string;
  content: string;
  author: string;
  createdAt: string;
}

interface EmailHistory {
  id: string;
  toEmail: string;
  subject: string;
  status: string;
  sentAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  createdAt: string;
}

interface Lead {
  id: string;
  name: string;
  address: string | null;
  emails: string[] | null;
  whatsapp: string[] | null;
  category: string | null;
  mapsUrl: string | null;
  phone: string | null;
  createdAt: string;
}

function renderInsightValue(val: unknown): React.ReactNode {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) {
    if (val.length === 0) return null;
    return (
      <ul className="mt-0.5 space-y-0.5 pl-3">
        {val.map((item, i) => (
          <li key={i} className="list-disc list-inside">
            {typeof item === 'string'
              ? item
              : typeof item === 'object' && item !== null
              ? Object.entries(item as Record<string, unknown>)
                  .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
                  .join(' · ')
              : String(item)}
          </li>
        ))}
      </ul>
    );
  }
  if (typeof val === 'object') {
    return (
      <div className="mt-0.5 pl-3 space-y-0.5 border-l border-border">
        {Object.entries(val as Record<string, unknown>).map(([k, v]) => (
          <div key={k}>
            <span className="text-foreground/60 capitalize">{k.replace(/_/g, ' ')}: </span>
            <span>{typeof v === 'string' ? v : String(v)}</span>
          </div>
        ))}
      </div>
    );
  }
  return String(val);
}

/** Side panel for whichever lead is selected in the table. Renders nothing when none is. */
export function LeadDetailPanel() {
  const workspaceId = useWorkspaceId();
  const { selectedLeadId, setSelectedLeadId } = useLeadStore();

  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteInput, setNoteInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [emailHistory, setEmailHistory] = useState<EmailHistory[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  useEffect(() => {
    if (!selectedLeadId) {
      setSelectedLead(null);
      return;
    }
    fetch(`${apiUrl()}/leads/${selectedLeadId}?workspaceId=${workspaceId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setSelectedLead(data as Lead); })
      .catch(() => {});
  }, [selectedLeadId, workspaceId]);

  const fetchInsights = useCallback(async (leadId: string) => {
    setInsightsLoading(true);
    fetch(`${apiUrl()}/leads/${leadId}/insights`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setInsights)
      .catch(() => setInsights([]))
      .finally(() => setInsightsLoading(false));
  }, []);

  const fetchNotes = useCallback(async (leadId: string) => {
    fetch(`${apiUrl()}/leads/${leadId}/notes`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setNotes)
      .catch(() => setNotes([]));
  }, []);

  const fetchEmailHistory = useCallback(async (leadId: string) => {
    fetch(`${apiUrl()}/leads/${leadId}/emails`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setEmailHistory)
      .catch(() => setEmailHistory([]));
  }, []);

  useEffect(() => {
    if (!selectedLeadId) {
      setInsights([]);
      setNotes([]);
      setEmailHistory([]);
      return;
    }
    fetchInsights(selectedLeadId);
    fetchNotes(selectedLeadId);
    fetchEmailHistory(selectedLeadId);
  }, [selectedLeadId, fetchInsights, fetchNotes, fetchEmailHistory]);

  const handleAddNote = async () => {
    if (!noteInput.trim() || !selectedLeadId) return;
    setNoteSubmitting(true);
    try {
      const res = await fetch(`${apiUrl()}/leads/${selectedLeadId}/notes?workspaceId=${workspaceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteInput.trim(), author: 'User' }),
      });
      if (res.ok) {
        setNoteInput('');
        fetchNotes(selectedLeadId);
        setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 50);
      }
    } catch {
      // ignore
    } finally {
      setNoteSubmitting(false);
    }
  };

  if (!selectedLeadId) return null;

  return (
    <aside className="w-[380px] shrink-0 border-l border-border bg-background flex flex-col">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
        <span className="font-bold text-sm uppercase tracking-tight">Lead Details</span>
        <button
          onClick={() => setSelectedLeadId(null)}
          title="Close"
          className="w-7 h-7 flex items-center justify-center border border-border hover:bg-accent transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-2 flex flex-col gap-2">
        {editingLead && (
          <AddLeadDialog
            initial={{
              id: editingLead.id,
              name: editingLead.name,
              address: editingLead.address ?? undefined,
              phone: editingLead.phone ?? undefined,
              category: editingLead.category ?? undefined,
              emails: editingLead.emails ?? undefined,
              mapsUrl: editingLead.mapsUrl ?? undefined,
            }}
            onClose={() => setEditingLead(null)}
          />
        )}

        {selectedLead ? (
          <div className="p-4 flex flex-col gap-4">
            <div>
              <h2 className="font-bold text-lg leading-tight">{selectedLead.name}</h2>
              <p className="text-xs text-muted-foreground">{selectedLead.address}</p>
            </div>

            <div className="space-y-1.5 text-xs">
              {selectedLead.category && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-16 shrink-0">Category</span>
                  <span className="font-medium">{selectedLead.category}</span>
                </div>
              )}
              {selectedLead.phone && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-16 shrink-0">Phone</span>
                  <a href={`tel:${selectedLead.phone}`} className="font-medium hover:text-primary transition-colors">
                    {selectedLead.phone}
                  </a>
                </div>
              )}
              {selectedLead.emails && selectedLead.emails.length > 0 && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-16 shrink-0">Email</span>
                  <a href={`mailto:${selectedLead.emails[0]}`} className="font-medium break-all hover:text-primary transition-colors">
                    {selectedLead.emails[0]}
                  </a>
                </div>
              )}
              {selectedLead.whatsapp && selectedLead.whatsapp.length > 0 && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-16 shrink-0">WhatsApp</span>
                  <a
                    href={`https://wa.me/${selectedLead.whatsapp[0].replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-green-600 hover:text-green-700 transition-colors"
                  >
                    {selectedLead.whatsapp[0]} ↗
                  </a>
                </div>
              )}
              {selectedLead.mapsUrl && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-16 shrink-0">Maps</span>
                  <a
                    href={selectedLead.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline truncate"
                  >
                    Open in Google Maps ↗
                  </a>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setEditingLead(selectedLead)}
                className="flex-1 py-2 bg-background border border-border text-[10px] font-bold uppercase tracking-widest hover:bg-accent transition-colors"
              >
                Edit
              </button>
              <div className="flex-1">
                <DeleteLeadButton leadId={selectedLead.id} leadName={selectedLead.name} />
              </div>
            </div>

            <div className="mt-4 p-4 border border-border bg-accent/20">
              <h3 className="text-[10px] font-bold uppercase tracking-widest mb-3 text-primary">AI Strategy Insights</h3>
              {insightsLoading ? (
                <div className="text-xs space-y-3">
                  <div className="animate-pulse flex flex-col gap-2">
                    <div className="h-2 bg-muted w-full"></div>
                    <div className="h-2 bg-muted w-3/4"></div>
                    <div className="h-2 bg-muted w-5/6"></div>
                  </div>
                </div>
              ) : insights.length === 0 ? (
                <p className="text-[10px] text-muted-foreground italic">No AI insights yet. Run a pipeline to generate insights for this lead.</p>
              ) : (
                <div className="space-y-3">
                  {insights.map((insight) => (
                    <div key={insight.id} className="text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[9px] font-bold uppercase tracking-wider">
                          {insight.agentType}
                        </span>
                        <span className="text-[9px] text-muted-foreground">
                          {new Date(insight.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-muted-foreground space-y-1.5">
                        {Object.entries(insight.content).map(([key, val]) => (
                          <div key={key}>
                            <span className="font-medium text-foreground capitalize">{key.replace(/_/g, ' ')}: </span>
                            {renderInsightValue(val)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-2 space-y-2">
              <button
                onClick={async () => {
                  if (!selectedLeadId) return;
                  setAnalyzing(true);
                  try {
                    const res = await fetch(`${apiUrl()}/leads/${selectedLeadId}/analyze?workspaceId=${workspaceId}`, { method: 'POST' });
                    if (res.ok) {
                      fetchInsights(selectedLeadId);
                    }
                  } catch {}
                  setAnalyzing(false);
                }}
                disabled={analyzing}
                className="w-full py-2 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {analyzing ? 'Analyzing...' : 'Analyze for My Business'}
              </button>
              <GenerateEmailButton
                leadId={selectedLeadId!}
                leadEmail={selectedLead.emails?.[0]}
                leadPhone={selectedLead.phone}
                onGenerated={() => {
                  fetchInsights(selectedLeadId!);
                  fetchEmailHistory(selectedLeadId!);
                }}
              />
              <button className="w-full py-2 bg-background border border-border text-[10px] font-bold uppercase tracking-widest hover:bg-accent transition-colors">
                Analyze Financial Potential
              </button>
            </div>

            {/* Email History */}
            {emailHistory.length > 0 && (
              <div className="mt-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest mb-3 text-primary">Email History</h3>
                <div className="space-y-2">
                  {emailHistory.map((email) => (
                    <div key={email.id} className="p-3 border border-border bg-accent/10">
                      <div className="text-xs font-medium mb-1">{email.subject}</div>
                      <div className="text-[10px] text-muted-foreground space-y-0.5">
                        <div>To: {email.toEmail}</div>
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ${
                            email.status === 'sent' || email.status === 'delivered' ? 'bg-green-100 text-green-700' :
                            email.status === 'failed' || email.status === 'bounced' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {email.status}
                          </span>
                          {email.sentAt && (
                            <span>{new Date(email.sentAt).toLocaleString()}</span>
                          )}
                        </div>
                        {email.openedAt && (
                          <div className="text-green-600">✓ Opened {new Date(email.openedAt).toLocaleString()}</div>
                        )}
                        {email.clickedAt && (
                          <div className="text-blue-600">✓ Clicked {new Date(email.clickedAt).toLocaleString()}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes / Activity */}
            <div className="mt-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest mb-3 text-primary">Notes & Activity</h3>
              <div
                ref={scrollRef}
                className="max-h-48 overflow-auto space-y-2 mb-3"
              >
                {notes.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground italic">No notes yet.</p>
                ) : (
                  notes.map((note) => (
                    <div key={note.id} className="p-2 border border-border bg-accent/10">
                      <p className="text-xs whitespace-pre-wrap">{note.content}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{note.author}</span>
                        <span className="text-[9px] text-muted-foreground">
                          {new Date(note.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddNote(); } }}
                  placeholder="Add a note..."
                  className="flex-1 px-2 py-1.5 text-xs border border-border bg-background focus:outline-none focus:border-primary"
                />
                <button
                  onClick={handleAddNote}
                  disabled={noteSubmitting || !noteInput.trim()}
                  className="px-3 py-1.5 bg-foreground text-background text-[9px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-muted-foreground">Loading lead...</div>
        )}
      </div>
    </aside>
  );
}