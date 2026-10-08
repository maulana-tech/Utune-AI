'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { BookOpen, Check, Copy, Loader2, Mail, MessageCircle, Pencil, Phone, Plus, Search, Trash2, X } from 'lucide-react';
import { deleteTemplate, logFollowUp, saveTemplate, sendLeadEmail } from '@/app/(app)/dashboard/contacts/actions';
import { TEMPLATE_VARS, renderTemplate, waNumber } from './template';
import { TEMPLATE_LIBRARY, TEMPLATE_TYPES, type TemplateType } from './library';

export interface Contact {
  id: string;
  name: string;
  category: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  emails: string[] | null;
  whatsapp: string[] | null;
  pipelineStage: string | null;
  lastFollowUp: string | null;
}

export interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
}

type Filter = 'all' | 'whatsapp' | 'email' | 'pending';
type Draft = { id?: string; name: string; subject: string; body: string };

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Not contacted' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'email', label: 'Email' },
];

const waOf = (c: Contact) => waNumber(c.whatsapp?.[0] ?? c.phone);
const emailOf = (c: Contact) => c.emails?.[0] ?? null;

function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return 'today';
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function ContactsClient({ contacts, templates }: { contacts: Contact[]; templates: Template[] }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(contacts[0]?.id ?? null);
  const [templateId, setTemplateId] = useState<string | null>(templates[0]?.id ?? null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const template = templates.find((t) => t.id === templateId) ?? templates[0] ?? null;
  const selected = contacts.find((c) => c.id === selectedId) ?? null;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts.filter((c) => {
      if (q && ![c.name, c.category, c.address].some((v) => v?.toLowerCase().includes(q))) return false;
      if (filter === 'whatsapp') return waOf(c) !== null;
      if (filter === 'email') return emailOf(c) !== null;
      if (filter === 'pending') return !c.lastFollowUp;
      return true;
    });
  }, [contacts, search, filter]);

  const pendingCount = contacts.filter((c) => !c.lastFollowUp).length;

  function send(contact: Contact, channel: 'whatsapp' | 'email' | 'copy') {
    if (!template) return;
    const subject = renderTemplate(template.subject, contact);
    const body = renderTemplate(template.body, contact);

    if (channel === 'whatsapp') {
      const wa = waOf(contact);
      if (!wa) return;
      window.open(`https://wa.me/${wa}?text=${encodeURIComponent(body)}`, '_blank', 'noopener');
    } else if (channel === 'email') {
      const email = emailOf(contact);
      if (!email) return;
      window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    } else {
      void navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
    startTransition(() => logFollowUp(contact.id, channel, template.name));
  }

  return (
    <div className="p-6 h-full flex flex-col gap-5">
      {/* HEADER */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {contacts.length} reachable lead{contacts.length !== 1 ? 's' : ''} · {pendingCount} not contacted yet
          </p>
        </div>
        {pending && (
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" /> Saving
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-5">
        {/* CONTACT LIST */}
        <section className="flex-1 min-w-0 min-h-0 flex flex-col border border-border bg-background">
          <div className="p-3 border-b border-border flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, category, address"
                className="w-full h-8 pl-8 pr-3 text-xs border border-border bg-background focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex border border-border">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`h-8 px-3 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                    filter === f.key ? 'bg-foreground text-background' : 'hover:bg-accent'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {visible.length === 0 ? (
              <div className="p-10 text-center text-xs text-muted-foreground">
                {contacts.length === 0
                  ? 'No leads with a phone, email or WhatsApp yet — run a scrape first.'
                  : 'No contacts match this filter.'}
              </div>
            ) : (
              visible.map((c) => {
                const active = c.id === selectedId;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`px-4 py-3 border-b border-border flex items-center gap-4 cursor-pointer transition-colors ${
                      active ? 'bg-accent' : 'hover:bg-accent/40'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate">{c.name}</div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {[c.category, c.phone ?? emailOf(c)].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <div className="hidden md:block text-right shrink-0">
                      <div className="text-[9px] font-bold uppercase tracking-widest">{c.pipelineStage ?? 'Prospecting'}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {c.lastFollowUp ? `Followed up ${timeAgo(c.lastFollowUp)}` : 'Not contacted'}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <IconButton label="Send WhatsApp" disabled={!template || !waOf(c)} onClick={() => send(c, 'whatsapp')}>
                        <MessageCircle className="w-3.5 h-3.5" />
                      </IconButton>
                      <IconButton label="Send email" disabled={!template || !emailOf(c)} onClick={() => send(c, 'email')}>
                        <Mail className="w-3.5 h-3.5" />
                      </IconButton>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* TEMPLATE + PREVIEW PANEL */}
        <aside className="lg:w-[420px] shrink-0 min-h-0 flex flex-col border border-border bg-background">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest">Follow-up templates</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  setShowLibrary((v) => !v);
                  setDraft(null);
                }}
                className={`h-7 px-2 flex items-center gap-1 border text-[10px] font-bold uppercase tracking-widest ${
                  showLibrary ? 'border-foreground bg-foreground text-background' : 'border-border hover:bg-accent'
                }`}
              >
                <BookOpen className="w-3 h-3" /> Library
              </button>
              <button
                onClick={() => {
                  setDraft({ name: '', subject: '', body: '' });
                  setShowLibrary(false);
                }}
                className="h-7 px-2 flex items-center gap-1 border border-border text-[10px] font-bold uppercase tracking-widest hover:bg-accent"
              >
                <Plus className="w-3 h-3" /> New
              </button>
            </div>
          </div>

          <div className="p-3 border-b border-border flex flex-wrap gap-1.5">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTemplateId(t.id);
                  setDraft(null);
                  setShowLibrary(false);
                }}
                className={`px-2.5 py-1.5 border text-[11px] font-medium transition-colors ${
                  t.id === template?.id && !draft && !showLibrary ? 'border-foreground bg-foreground text-background' : 'border-border hover:bg-accent'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {showLibrary ? (
              <TemplateLibrary
                existingNames={new Set(templates.map((t) => t.name))}
                onEdit={(t) => {
                  setDraft({ name: t.name, subject: t.subject, body: t.body });
                  setShowLibrary(false);
                }}
              />
            ) : draft ? (
              <TemplateEditor
                key={draft.id ?? `new:${draft.name}`}
                draft={draft}
                onCancel={() => setDraft(null)}
                onSaved={() => setDraft(null)}
              />
            ) : !template ? (
              <p className="text-xs text-muted-foreground">Create a template to start following up.</p>
            ) : !selected ? (
              <div className="flex flex-col gap-3">
                <p className="text-[11px] text-muted-foreground">Pick a contact to see this message filled in with their details.</p>
                <div className="border border-border bg-muted/30">
                  {template.subject && (
                    <div className="px-3 py-2 border-b border-border text-xs">
                      <span className="text-muted-foreground">Subject: </span>
                      <span className="font-medium">{template.subject}</span>
                    </div>
                  )}
                  <p className="px-3 py-3 text-xs leading-relaxed whitespace-pre-wrap">{template.body}</p>
                </div>
                <button
                  onClick={() => setDraft({ ...template })}
                  className="self-start h-8 px-3 flex items-center gap-1.5 border border-border text-[10px] font-bold uppercase tracking-widest hover:bg-accent"
                >
                  <Pencil className="w-3 h-3" /> Edit template
                </button>
              </div>
            ) : (
              <Preview
                contact={selected}
                template={template}
                copied={copied}
                key={`${selected.id}:${template.id}`}
                onSend={(channel) => send(selected, channel)}
                onEdit={() => setDraft({ ...template })}
              />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Preview({
  contact,
  template,
  copied,
  onSend,
  onEdit,
}: {
  contact: Contact;
  template: Template;
  copied: boolean;
  onSend: (channel: 'whatsapp' | 'email' | 'copy') => void;
  onEdit: () => void;
}) {
  const wa = waOf(contact);
  const email = emailOf(contact);
  const subject = renderTemplate(template.subject, contact);
  const body = renderTemplate(template.body, contact);
  const [mail, setMail] = useState<{ state: 'idle' | 'sending' | 'sent' | 'error'; note?: string }>({ state: 'idle' });

  async function sendNow() {
    setMail({ state: 'sending' });
    const res = await sendLeadEmail(contact.id, subject, body, template.name);
    setMail(res.ok ? { state: 'sent', note: `Sent via ${res.provider}` } : { state: 'error', note: res.error });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="font-bold text-sm">{contact.name}</div>
        <div className="mt-1 flex flex-col gap-0.5 text-[11px] text-muted-foreground">
          {contact.phone && <span className="flex items-center gap-1.5"><Phone className="w-3 h-3" />{contact.phone}</span>}
          {email && <span className="flex items-center gap-1.5"><Mail className="w-3 h-3" />{email}</span>}
        </div>
      </div>

      <div className="border border-border bg-muted/30">
        {subject && (
          <div className="px-3 py-2 border-b border-border text-xs">
            <span className="text-muted-foreground">Subject: </span>
            <span className="font-medium">{subject}</span>
          </div>
        )}
        <p className="px-3 py-3 text-xs leading-relaxed whitespace-pre-wrap">{body}</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <ActionButton disabled={!wa} onClick={() => onSend('whatsapp')} primary>
          <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
        </ActionButton>
        <ActionButton disabled={!email || mail.state === 'sending' || mail.state === 'sent'} onClick={sendNow}>
          {mail.state === 'sending' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : mail.state === 'sent' ? <Check className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
          {mail.state === 'sent' ? 'Sent' : 'Send email'}
        </ActionButton>
        <ActionButton onClick={() => onSend('copy')}>
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Copied' : 'Copy'}
        </ActionButton>
      </div>
      {mail.note && (
        <p className={`text-[11px] ${mail.state === 'error' ? 'text-red-600' : 'text-green-700'}`}>{mail.note}</p>
      )}
      {email && (
        <button onClick={() => onSend('email')} className="self-start text-[10px] text-muted-foreground underline hover:text-foreground">
          Or open it in your own mail app
        </button>
      )}
      <p className="text-[10px] text-muted-foreground">
        Sending logs a note on the lead and moves it from Prospecting to Contacted.
      </p>

      <button
        onClick={onEdit}
        className="self-start flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
      >
        <Pencil className="w-3 h-3" /> Edit template
      </button>
    </div>
  );
}

function TemplateEditor({ draft, onCancel, onSaved }: { draft: Draft; onCancel: () => void; onSaved: () => void }) {
  const [value, setValue] = useState(draft);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  function insertVar(v: string) {
    const el = bodyRef.current;
    const token = `{{${v}}}`;
    const at = el?.selectionStart ?? value.body.length;
    setValue((d) => ({ ...d, body: d.body.slice(0, at) + token + d.body.slice(at) }));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(at + token.length, at + token.length);
    });
  }

  function run(action: () => Promise<void>) {
    setError('');
    startTransition(async () => {
      try {
        await action();
        onSaved();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong');
      }
    });
  }

  const field = 'w-full px-3 py-2 text-xs border border-border bg-background focus:outline-none focus:border-primary';
  const label = 'block mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground';

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className={label} htmlFor="tpl-name">Name</label>
        <input id="tpl-name" className={field} value={value.name} onChange={(e) => setValue({ ...value, name: e.target.value })} placeholder="Follow-up 2 (7 hari)" />
      </div>
      <div>
        <label className={label} htmlFor="tpl-subject">Email subject <span className="normal-case font-normal">(ignored on WhatsApp)</span></label>
        <input id="tpl-subject" className={field} value={value.subject} onChange={(e) => setValue({ ...value, subject: e.target.value })} />
      </div>
      <div>
        <label className={label} htmlFor="tpl-body">Message</label>
        <textarea id="tpl-body" ref={bodyRef} className={`${field} h-80 resize-y font-mono text-[11px] leading-relaxed`} value={value.body} onChange={(e) => setValue({ ...value, body: e.target.value })} />
        <div className="mt-2 flex flex-wrap gap-1">
          {TEMPLATE_VARS.map((v) => (
            <button key={v} type="button" onClick={() => insertVar(v)} className="px-1.5 py-0.5 border border-border font-mono text-[10px] hover:bg-accent">
              {`{{${v}}}`}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-[11px] text-red-600">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          disabled={pending}
          onClick={() => run(() => saveTemplate(value))}
          className="h-8 px-4 bg-foreground text-background text-[10px] font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
        >
          {pending && <Loader2 className="w-3 h-3 animate-spin" />} Save
        </button>
        <button onClick={onCancel} className="h-8 px-3 border border-border text-[10px] font-bold uppercase tracking-widest hover:bg-accent flex items-center gap-1">
          <X className="w-3 h-3" /> Cancel
        </button>
        {draft.id && (
          <button
            disabled={pending}
            onClick={() => (confirmDelete ? run(() => deleteTemplate(draft.id!)) : setConfirmDelete(true))}
            className="ml-auto h-8 px-3 border border-red-600/40 text-red-600 text-[10px] font-bold uppercase tracking-widest hover:bg-red-600/10 flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" /> {confirmDelete ? 'Confirm delete' : 'Delete'}
          </button>
        )}
      </div>
    </div>
  );
}

function IconButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="w-8 h-8 flex items-center justify-center border border-border hover:bg-foreground hover:text-background transition-colors disabled:opacity-25 disabled:pointer-events-none"
    >
      {children}
    </button>
  );
}

function ActionButton({ disabled, primary, onClick, children }: { disabled?: boolean; primary?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`h-9 flex items-center justify-center gap-1.5 border text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-30 disabled:pointer-events-none ${
        primary ? 'border-foreground bg-foreground text-background hover:opacity-90' : 'border-border hover:bg-accent'
      }`}
    >
      {children}
    </button>
  );
}

/** Browse the built-in library (library.ts) and copy templates into this workspace. */
function TemplateLibrary({
  existingNames,
  onEdit,
}: {
  existingNames: Set<string>;
  onEdit: (t: { name: string; subject: string; body: string }) => void;
}) {
  const [lang, setLang] = useState<'id' | 'en'>('id');
  const [type, setType] = useState<TemplateType | ''>('');
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [, startTransition] = useTransition();

  const items = TEMPLATE_LIBRARY.filter((t) => t.lang === lang && (!type || t.type === type));

  function add(id: string) {
    const t = TEMPLATE_LIBRARY.find((x) => x.id === id);
    if (!t) return;
    setError('');
    setAdding(id);
    startTransition(async () => {
      try {
        await saveTemplate({ name: t.name, subject: t.subject, body: t.body });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not add template');
      } finally {
        setAdding(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="flex border border-border">
          {(['id', 'en'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`h-7 px-2.5 text-[10px] font-bold uppercase tracking-widest ${lang === l ? 'bg-foreground text-background' : 'hover:bg-accent'}`}
            >
              {l === 'id' ? 'Indonesia' : 'English'}
            </button>
          ))}
        </div>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as TemplateType | '')}
          aria-label="Template type"
          className="flex-1 h-7 px-2 text-[11px] border border-border bg-background focus:outline-none focus:border-primary"
        >
          <option value="">All types ({TEMPLATE_LIBRARY.filter((t) => t.lang === lang).length})</option>
          {TEMPLATE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-[11px] text-red-600">{error}</p>}
      {items.length === 0 && <p className="text-xs text-muted-foreground">No template of this type in this language yet.</p>}

      {items.map((t) => {
        const added = existingNames.has(t.name);
        return (
          <div key={t.id} className="border border-border">
            <button onClick={() => setOpen(open === t.id ? null : t.id)} className="w-full text-left px-3 py-2 hover:bg-accent/40">
              <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{t.type}</div>
              <div className="text-xs font-bold mt-0.5">{t.name}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 truncate">Subject: {t.subject}</div>
            </button>
            {open === t.id && (
              <p className="px-3 pb-3 text-[11px] leading-relaxed whitespace-pre-wrap border-t border-border pt-2">{t.body}</p>
            )}
            <div className="px-3 pb-2 flex justify-end gap-1.5">
              <button
                onClick={() => onEdit(t)}
                className="h-7 px-3 flex items-center gap-1.5 border border-border text-[10px] font-bold uppercase tracking-widest hover:bg-accent"
              >
                <Pencil className="w-3 h-3" /> Edit &amp; add
              </button>
              <button
                disabled={added || adding === t.id}
                onClick={() => add(t.id)}
                className="h-7 px-3 flex items-center gap-1.5 border border-border text-[10px] font-bold uppercase tracking-widest hover:bg-foreground hover:text-background disabled:opacity-50 disabled:pointer-events-none"
              >
                {adding === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : added ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                {added ? 'Added' : 'Add'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
