import { Suspense } from 'react';
import { getWorkspaceId } from '@/lib/get-workspace';
import { db, agentLogs, leads, swarmRuns } from '@repo/db';
import { eq, desc, and } from 'drizzle-orm';
import { Clock, Bot, MapPin, TrendingUp, DollarSign, BarChart3, Workflow } from 'lucide-react';

export const metadata = {
  title: 'History | UTune AI',
  description: 'Activity history and agent logs',
};

type AgentLogRow = {
  id: string;
  agentName: string;
  input: any;
  output: any;
  reasoning: string;
  tokensUsed: number | null;
  durationMs: number | null;
  createdAt: Date | null;
  leadId: string | null;
  handoffFrom: string | null;
  parallelGroup: string | null;
  leadName: string | null;
  leadCategory: string | null;
};

async function getActivityHistory(workspaceId: string) {
  // Get recent agent logs with lead info
  const logs: AgentLogRow[] = await db
    .select({
      id: agentLogs.id,
      agentName: agentLogs.agentName,
      input: agentLogs.input,
      output: agentLogs.output,
      reasoning: agentLogs.reasoning,
      tokensUsed: agentLogs.tokensUsed,
      durationMs: agentLogs.durationMs,
      createdAt: agentLogs.createdAt,
      leadId: agentLogs.leadId,
      handoffFrom: agentLogs.handoffFrom,
      parallelGroup: agentLogs.parallelGroup,
      // Lead info
      leadName: leads.name,
      leadCategory: leads.category,
    })
    .from(agentLogs)
    .leftJoin(leads, eq(agentLogs.leadId, leads.id))
    .where(eq(agentLogs.workspaceId, workspaceId))
    .orderBy(desc(agentLogs.createdAt))
    .limit(100);

  // Get recent swarm runs
  const swarmRunsData = await db
    .select()
    .from(swarmRuns)
    .where(eq(swarmRuns.workspaceId, workspaceId))
    .orderBy(desc(swarmRuns.createdAt))
    .limit(20);

  return { logs, swarmRuns: swarmRunsData };
}

function getAgentIcon(agentName: string) {
  if (agentName.includes('extractor')) return MapPin;
  if (agentName.includes('finance')) return DollarSign;
  if (agentName.includes('marketing')) return TrendingUp;
  if (agentName.includes('strategy')) return BarChart3;
  if (agentName.includes('coordinator')) return Workflow;
  return Bot;
}

function getAgentColor(agentName: string) {
  if (agentName.includes('extractor')) return 'text-blue-600 bg-blue-50 border-blue-200';
  if (agentName.includes('finance')) return 'text-green-600 bg-green-50 border-green-200';
  if (agentName.includes('marketing')) return 'text-purple-600 bg-purple-50 border-purple-200';
  if (agentName.includes('strategy')) return 'text-orange-600 bg-orange-50 border-orange-200';
  if (agentName.includes('coordinator')) return 'text-indigo-600 bg-indigo-50 border-indigo-200';
  return 'text-gray-600 bg-gray-50 border-gray-200';
}

function formatDuration(ms: number | null) {
  if (!ms) return 'N/A';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatTimestamp(date: Date | null) {
  if (!date) return 'Unknown';
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}

async function HistoryContent() {
  const workspaceId = await getWorkspaceId();
  const { logs, swarmRuns } = await getActivityHistory(workspaceId);

  // Group logs by date
  const logsByDate = logs.reduce((acc, log) => {
    const date = log.createdAt
      ? new Date(log.createdAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'Unknown Date';
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {} as Record<string, AgentLogRow[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity History</h1>
          <p className="mt-1 text-sm text-gray-600">
            Track agent executions, lead activities, and system events
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
          <Clock className="size-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            {logs.length} activities
          </span>
        </div>
      </div>

      {/* Swarm Runs Summary */}
      {swarmRuns.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Workflow className="size-5 text-indigo-600" />
            <h2 className="text-sm font-semibold text-gray-900">Recent Swarm Runs</h2>
          </div>
          <div className="space-y-2">
            {swarmRuns.slice(0, 5).map((run) => (
              <div
                key={run.id}
                className="flex items-center justify-between rounded border border-gray-100 bg-gray-50 px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-gray-500">{run.executionId.slice(0, 8)}</span>
                  <span className="font-medium text-gray-900">{run.workflowName}</span>
                  <span className="text-gray-600">→ {run.entryAgent}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-600">{run.totalSteps} steps</span>
                  <span
                    className={`rounded px-2 py-0.5 font-medium ${
                      run.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : run.status === 'failed'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {run.status}
                  </span>
                  <span className="text-gray-500">
                    {formatTimestamp(run.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agent Logs Timeline */}
      <div className="space-y-6">
        {Object.entries(logsByDate).map(([date, dateLogs]) => (
          <div key={date}>
            <div className="mb-3 flex items-center gap-2">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs font-medium text-gray-500">{date}</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <div className="space-y-3">
              {dateLogs.map((log: AgentLogRow) => {
                const Icon = getAgentIcon(log.agentName);
                const colorClass = getAgentColor(log.agentName);

                return (
                  <div
                    key={log.id}
                    className="group rounded-lg border border-gray-200 bg-white p-4 transition hover:border-gray-300 hover:shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div
                        className={`flex size-10 shrink-0 items-center justify-center rounded-lg border ${colorClass}`}
                      >
                        <Icon className="size-5" />
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900">
                                {log.agentName}
                              </h3>
                              {log.parallelGroup && (
                                <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                                  parallel
                                </span>
                              )}
                              {log.handoffFrom && (
                                <span className="text-xs text-gray-500">
                                  ← from {log.handoffFrom}
                                </span>
                              )}
                            </div>

                            {/* Lead context */}
                            {log.leadName && (
                              <p className="mt-1 text-sm text-gray-600">
                                Lead: <span className="font-medium">{log.leadName}</span>
                                {log.leadCategory && (
                                  <span className="ml-2 text-gray-400">({log.leadCategory})</span>
                                )}
                              </p>
                            )}
                          </div>

                          {/* Metadata */}
                          <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-gray-500">
                            <span>{formatTimestamp(log.createdAt)}</span>
                            {log.durationMs && (
                              <span className="font-mono">
                                {formatDuration(log.durationMs)}
                              </span>
                            )}
                            {log.tokensUsed && (
                              <span className="font-mono">{log.tokensUsed} tokens</span>
                            )}
                          </div>
                        </div>

                        {/* Reasoning & Output */}
                        {(log.reasoning || log.output) && (
                          <div className="mt-3 space-y-2">
                            {log.reasoning && (
                              <details className="cursor-pointer">
                                <summary className="text-sm font-medium text-gray-700">
                                  View reasoning
                                </summary>
                                <div className="mt-2 rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                                  {log.reasoning}
                                </div>
                              </details>
                            )}
                            {log.output && (
                              <details className="cursor-pointer">
                                <summary className="text-sm font-medium text-gray-700">
                                  View output (JSON)
                                </summary>
                                <pre className="mt-2 max-h-40 overflow-auto rounded border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
                                  {typeof log.output === 'string'
                                    ? log.output
                                    : JSON.stringify(log.output, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {logs.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
            <Clock className="mx-auto size-12 text-gray-400" />
            <h3 className="mt-4 text-sm font-semibold text-gray-900">No activity yet</h3>
            <p className="mt-1 text-sm text-gray-600">
              Agent logs will appear here as they execute
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-12">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="size-4 animate-spin" />
            Loading history...
          </div>
        </div>
      }
    >
      <HistoryContent />
    </Suspense>
  );
}
