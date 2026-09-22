import { eq, desc } from 'drizzle-orm';
import { Clock, Calendar, Database, Plus } from 'lucide-react';
import { db, scrapeSchedules, type ScrapeSchedule } from '@repo/db';
import { getWorkspaceId } from '@/lib/get-workspace';
import { ScheduleActions } from '@/features/scrape/ScheduleActions';

export const dynamic = 'force-dynamic';

export default async function ScrapeSchedulesPage() {
  const workspaceId = await getWorkspaceId();
  const schedules = await db
    .select()
    .from(scrapeSchedules)
    .where(eq(scrapeSchedules.workspaceId, workspaceId))
    .orderBy(desc(scrapeSchedules.createdAt));

  const totalCount = schedules.length;
  const activeCount = schedules.filter((s) => s.isActive).length;
  const categoriesCount = new Set(schedules.map((s) => s.category)).size;

  return (
    <div className="p-6 h-full flex flex-col gap-6 overflow-auto">
      {/* HEADER */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Scrape Schedules</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Automated lead scraping jobs — configure intervals, categories, and query targets.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 h-10 px-4 border border-border bg-background text-[10px] font-bold uppercase tracking-widest hover:bg-accent/50 transition-colors">
          <Plus className="w-3.5 h-3.5" />
          Add Schedule
        </button>
      </div>

      {/* STATS ROW */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Schedules" value={totalCount} icon={Calendar} />
        <StatCard label="Active" value={activeCount} icon={Clock} />
        <StatCard label="Categories Covered" value={categoriesCount} icon={Database} />
      </div>

      {/* SCHEDULE LIST */}
      {schedules.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="border border-border bg-background flex flex-col">
          {/* TABLE HEADER */}
          <div className="grid grid-cols-[1fr_140px_80px_80px_100px_130px_100px_200px] gap-3 px-4 py-2 border-b border-border text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-accent/20">
            <div>Category / Query</div>
            <div>Interval</div>
            <div>Limit/Run</div>
            <div>Status</div>
            <div>Last Run</div>
            <div>Last Status</div>
            <div>Retries</div>
            <div className="text-right">Actions</div>
          </div>

          {/* TABLE ROWS */}
          {schedules.map((s: ScrapeSchedule) => (
            <ScheduleRow key={s.id} schedule={s} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Stat Card
   ============================================================ */
function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Calendar;
}) {
  return (
    <div className="border border-border bg-background p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
          {label}
        </div>
        <div className="w-8 h-8 border border-border bg-accent/50 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
      </div>
      <div className="text-2xl font-bold tabular-nums">{value === 0 ? '—' : value}</div>
    </div>
  );
}

/* ============================================================
   Schedule Row
   ============================================================ */
function ScheduleRow({ schedule: s }: { schedule: ScrapeSchedule }) {
  const intervalLabel = formatInterval(s.intervalMinutes);
  const lastRunLabel = s.lastRunAt
    ? new Date(s.lastRunAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
    : 'Never';

  return (
    <div className="grid grid-cols-[1fr_140px_80px_80px_100px_130px_100px_200px] gap-3 px-4 py-3 border-b border-border last:border-b-0 items-center text-[12px]">
      {/* Category + Query */}
      <div className="min-w-0">
        <div className="font-bold truncate">{s.category}</div>
        <div className="font-mono text-[10px] text-muted-foreground truncate mt-0.5">
          {s.query}
          <span className="ml-2 uppercase">{s.country ? `· ${s.country}` : '· 🌍 global'}</span>
        </div>
      </div>

      {/* Interval */}
      <div className="font-mono text-[11px] text-muted-foreground">{intervalLabel}</div>

      {/* Limit per run */}
      <div className="font-mono text-[11px] tabular-nums">{s.limitPerRun}</div>

      {/* isActive badge */}
      <div>
        {s.isActive ? (
          <span className="inline-flex items-center px-2 py-1 border border-border bg-accent/20 text-[10px] font-bold uppercase tracking-widest text-primary">
            Active
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-1 border border-border bg-accent/20 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Paused
          </span>
        )}
      </div>

      {/* Last run */}
      <div className="font-mono text-[10px] text-muted-foreground">{lastRunLabel}</div>

      {/* Last run status badge */}
      <div>
        <LastRunStatusBadge status={s.lastRunStatus} />
      </div>

      {/* Retries */}
      <div className="font-mono text-[11px] text-muted-foreground tabular-nums">
        {s.retryCount ?? 0}/{s.maxRetries}
      </div>

      {/* Actions */}
      <div className="flex justify-end">
        <ScheduleActions id={s.id} isActive={s.isActive} />
      </div>
    </div>
  );
}

/* ============================================================
   Badges
   ============================================================ */
function LastRunStatusBadge({ status }: { status: string | null }) {
  if (!status) {
    return (
      <span className="inline-flex items-center px-2 py-1 border border-border bg-accent/10 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        —
      </span>
    );
  }
  const isSuccess = status === 'success' || status === 'completed';
  const isFailed = status === 'failed' || status === 'error';
  const cls = isSuccess
    ? 'bg-accent/20 text-primary border-border'
    : isFailed
      ? 'bg-destructive/20 text-destructive border-destructive/30'
      : 'bg-accent/10 text-muted-foreground border-border';

  return (
    <span
      className={`inline-flex items-center px-2 py-1 border text-[10px] font-bold uppercase tracking-widest ${cls}`}
    >
      {status}
    </span>
  );
}

/* ============================================================
   Empty state
   ============================================================ */
function EmptyState() {
  return (
    <div className="border border-dashed border-border bg-background flex flex-col items-center justify-center p-16 gap-4">
      <Clock className="w-10 h-10 text-muted-foreground/40" />
      <div className="text-center max-w-[320px]">
        <div className="font-bold text-sm mb-1">No Scrape Schedules</div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Add a schedule to automate lead scraping by category and query. Each schedule runs at a
          fixed interval and feeds new leads into the pipeline.
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   Helpers
   ============================================================ */
function formatInterval(minutes: number): string {
  if (minutes < 60) return `every ${minutes}m`;
  const hours = minutes / 60;
  if (Number.isInteger(hours)) return `every ${hours}h`;
  const days = minutes / (60 * 24);
  if (Number.isInteger(days)) return `every ${days}d`;
  return `every ${minutes}m`;
}
