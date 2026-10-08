'use client';

import { useState, useTransition } from 'react';
import { Check, ExternalLink, KeyRound, Loader2, Trash2 } from 'lucide-react';
import { deleteApiKey, saveApiKey } from './api-keys-actions';

export interface ApiKeyRow {
  name: string;
  label: string;
  sources: readonly string[];
  url: string;
  /** Last 4 characters of the saved key, or null when this workspace has none. */
  last4: string | null;
}

export function ApiKeysForm({ rows }: { rows: ApiKeyRow[] }) {
  return (
    <div className="border border-border divide-y divide-border">
      {rows.map((row) => (
        <KeyRow key={row.name} row={row} />
      ))}
    </div>
  );
}

function KeyRow({ row }: { row: ApiKeyRow }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<void>) {
    setError('');
    startTransition(async () => {
      try {
        await action();
        setValue('');
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong');
      }
    });
  }

  return (
    <div className="p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-bold flex items-center gap-1.5">
            <KeyRound className="w-3 h-3 shrink-0" />
            {row.label}
            <a href={row.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground" aria-label={`Get a ${row.label} key`}>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
            {row.name}
            {row.sources.length > 0 && ` · source: ${row.sources.join(', ')}`}
          </div>
        </div>
        <span
          className={`shrink-0 text-[9px] font-bold uppercase tracking-widest px-2 py-1 border ${
            row.last4 ? 'border-green-600/40 text-green-700' : 'border-border text-muted-foreground'
          }`}
        >
          {row.last4 ? `Your key ••••${row.last4}` : 'Server default'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="password"
          autoComplete="off"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={row.last4 ? 'Paste a new key to replace' : 'Paste your key'}
          aria-label={`${row.label} API key`}
          className="flex-1 h-8 px-3 text-xs font-mono border border-border bg-background focus:outline-none focus:border-primary"
        />
        <button
          disabled={pending || !value.trim()}
          onClick={() => run(() => saveApiKey(row.name, value))}
          className="h-8 px-3 bg-foreground text-background text-[10px] font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-40 flex items-center gap-1.5"
        >
          {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : saved ? <Check className="w-3 h-3" /> : null}
          Save
        </button>
        {row.last4 && (
          <button
            disabled={pending}
            onClick={() => run(() => deleteApiKey(row.name))}
            aria-label={`Remove ${row.label} key`}
            className="h-8 w-8 flex items-center justify-center border border-border text-muted-foreground hover:text-red-600 hover:border-red-600/40 disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  );
}
