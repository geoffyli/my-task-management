import { useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Clock, Database, Webhook, Activity, Copy, CheckCircle2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useSyncStatus, useSyncEvents, useWebhookStatus } from "@/api/queries";
import { api } from "@/api/client";
import { StatCard } from "@/components/cards/StatCard";
import { ErrorFallback } from "@/components/shared/ErrorFallback";

export function SettingsPage() {
  const [syncing, setSyncing] = useState(false);
  const [page, setPage] = useState(0);
  const limit = 20;

  const queryClient = useQueryClient();
  const { data: status, isLoading: statusLoading, isError: statusError } = useSyncStatus();
  const { data: events, isLoading: eventsLoading } = useSyncEvents(limit, page * limit);
  const { data: webhookStatus } = useWebhookStatus();

  const [copied, setCopied] = useState<string | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(null), 2000);
  }, []);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      await api.triggerSync();
      await queryClient.invalidateQueries();
    } finally {
      setSyncing(false);
    }
  }, [queryClient]);

  if (statusError) {
    return <ErrorFallback message="Failed to load sync status." />;
  }

  if (statusLoading) {
    return <div className="flex h-full items-center justify-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Settings</h2>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
        >
          <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Syncing..." : "Force Sync"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Last Full Sync"
          value={status?.lastFullSync ? format(parseISO(status.lastFullSync), "MMM d HH:mm") : "Never"}
          icon={RefreshCw}
        />
        <StatCard
          title="Last Reconciliation"
          value={status?.lastReconciliation ? format(parseISO(status.lastReconciliation), "MMM d HH:mm") : "Never"}
          icon={Clock}
        />
        <StatCard
          title="Last Webhook"
          value={status?.lastWebhook ? format(parseISO(status.lastWebhook), "MMM d HH:mm") : "Never"}
          icon={Webhook}
        />
        <StatCard
          title="Pages Tracked"
          value={status ? status.pagesTracked.tasks + status.pagesTracked.projects + status.pagesTracked.areas : 0}
          icon={Database}
          trend={status ? `${status.pagesTracked.tasks}T / ${status.pagesTracked.projects}P / ${status.pagesTracked.areas}A` : undefined}
        />
        <StatCard
          title="Total Events"
          value={status?.totalEvents ?? 0}
          icon={Activity}
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 text-sm font-medium text-foreground">Webhook Setup</h3>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Webhook URL</p>
            {webhookStatus?.webhookUrl ? (
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-muted px-2 py-1 text-xs text-foreground break-all">
                  {webhookStatus.webhookUrl}
                </code>
                <button
                  onClick={() => copyToClipboard(webhookStatus.webhookUrl!, "url")}
                  className="rounded p-1 text-muted-foreground hover:bg-muted"
                >
                  {copied === "url" ? <CheckCircle2 size={14} className="text-green-500" /> : <Copy size={14} />}
                </button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Set NOTION_WEBHOOK_URL in .env</p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Status</p>
            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${webhookStatus?.verified ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${webhookStatus?.verified ? "bg-green-500" : "bg-yellow-500"}`} />
              {webhookStatus?.verified ? "Verified" : "Not verified"}
            </span>
          </div>
          {webhookStatus?.verificationToken && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Verification Token (paste into Notion)</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-muted px-2 py-1 text-xs text-foreground break-all">
                  {webhookStatus.verificationToken}
                </code>
                <button
                  onClick={() => copyToClipboard(webhookStatus.verificationToken!, "token")}
                  className="rounded p-1 text-muted-foreground hover:bg-muted"
                >
                  {copied === "token" ? <CheckCircle2 size={14} className="text-green-500" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          )}
          {!webhookStatus?.verified && (
            <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
              <p className="text-xs text-muted-foreground">
                1. Add the webhook URL in Notion connection settings &rarr; 2. Notion sends verification &rarr; 3. Copy the token above and paste into Notion
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-4 text-sm font-medium text-foreground">Event Log</h3>

        {eventsLoading ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">Loading events...</div>
        ) : !events || events.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">No events recorded</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2 pr-4 text-left text-xs font-medium text-muted-foreground">Time</th>
                    <th className="py-2 pr-4 text-left text-xs font-medium text-muted-foreground">Type</th>
                    <th className="py-2 pr-4 text-left text-xs font-medium text-muted-foreground">Source</th>
                    <th className="py-2 text-left text-xs font-medium text-muted-foreground">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id} className="border-b border-border/50">
                      <td className="py-2 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                        {format(parseISO(event.created_at), "MMM d HH:mm:ss")}
                      </td>
                      <td className="py-2 pr-4 text-xs text-foreground">{event.event_type}</td>
                      <td className="py-2 pr-4 text-xs text-foreground">{event.source}</td>
                      <td className="py-2 text-xs text-muted-foreground max-w-xs truncate">
                        {event.payload ? (event.payload.length > 80 ? event.payload.slice(0, 80) + "..." : event.payload) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-xs text-muted-foreground">Page {page + 1}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={events.length < limit}
                className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
