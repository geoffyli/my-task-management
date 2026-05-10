import { useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Clock, Database, Webhook, Activity, Copy, CheckCircle2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useSyncStatus, useSyncEvents, useWebhookStatus } from "@/api/queries";
import { api } from "@/api/client";
import { StatCard } from "@/components/cards/StatCard";
import { ErrorFallback } from "@/components/shared/ErrorFallback";
import { LoadingState } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { NotificationSettings } from "@/components/settings/NotificationSettings";

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
    return <LoadingState variant="page" />;
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-[20px] font-[590] text-foreground tracking-[-0.24px]">Settings</h2>
        <Button variant="primary" onClick={handleSync} disabled={syncing}>
          <RefreshCw size={14} strokeWidth={1.5} className={syncing ? "animate-spin" : ""} />
          <span className="ml-2">{syncing ? "Syncing..." : "Force Sync"}</span>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5 md:gap-4">
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

      {/* Webhook Setup */}
      <div className="rounded-[8px] border border-border bg-[rgba(255,255,255,0.02)] p-5">
        <h3 className="mb-3 text-[14px] font-[510] text-foreground">Webhook Setup</h3>
        <div className="space-y-3">
          <div>
            <p className="text-[12px] font-[510] text-foreground-tertiary mb-1">Webhook URL</p>
            {webhookStatus?.webhookUrl ? (
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-[4px] bg-[rgba(255,255,255,0.04)] px-2.5 py-1.5 text-[12px] font-mono text-foreground-secondary break-all">
                  {webhookStatus.webhookUrl}
                </code>
                <Button
                  variant="icon"
                  size="sm"
                  onClick={() => copyToClipboard(webhookStatus.webhookUrl!, "url")}
                >
                  {copied === "url" ? <CheckCircle2 size={14} className="text-success" /> : <Copy size={14} />}
                </Button>
              </div>
            ) : (
              <p className="text-[12px] text-foreground-quaternary italic">Set NOTION_WEBHOOK_URL in .env</p>
            )}
          </div>
          <div>
            <p className="text-[12px] font-[510] text-foreground-tertiary mb-1">Status</p>
            <Badge variant={webhookStatus?.verified ? "success" : "neutral"}>
              <span className={`mr-1.5 h-1.5 w-1.5 rounded-full inline-block ${webhookStatus?.verified ? "bg-success" : "bg-[#d97706]"}`} />
              {webhookStatus?.verified ? "Verified" : "Not verified"}
            </Badge>
          </div>
          {!webhookStatus?.verified && (
            <div className="rounded-[6px] border border-border-subtle bg-[rgba(255,255,255,0.02)] px-3 py-2">
              <p className="text-[12px] text-foreground-quaternary">
                1. Add the webhook URL in Notion connection settings &rarr; 2. Notion sends verification &rarr; 3. Copy the token above and paste into Notion
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      <NotificationSettings />

      {/* Event Log */}
      <div className="rounded-[8px] border border-border bg-[rgba(255,255,255,0.02)] p-5">
        <h3 className="mb-4 text-[14px] font-[510] text-foreground">Event Log</h3>

        {eventsLoading ? (
          <div className="flex h-32 items-center justify-center text-foreground-tertiary text-[13px] font-[510]">Loading events...</div>
        ) : !events || events.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-[13px] font-[510] text-foreground-quaternary">No events recorded</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-subtle">
                    <th className="py-2 pr-4 text-left text-[12px] font-[510] text-foreground-tertiary">Time</th>
                    <th className="py-2 pr-4 text-left text-[12px] font-[510] text-foreground-tertiary">Type</th>
                    <th className="py-2 pr-4 text-left text-[12px] font-[510] text-foreground-tertiary">Source</th>
                    <th className="py-2 text-left text-[12px] font-[510] text-foreground-tertiary">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id} className="border-b border-border-subtle">
                      <td className="py-2.5 pr-4 text-[12px] font-mono text-foreground-quaternary whitespace-nowrap">
                        {format(parseISO(event.created_at), "MMM d HH:mm:ss")}
                      </td>
                      <td className="py-2.5 pr-4 text-[13px] font-[510] text-foreground-secondary">{event.event_type}</td>
                      <td className="py-2.5 pr-4 text-[13px] text-foreground-secondary">{event.source}</td>
                      <td className="py-2.5 text-[12px] text-foreground-quaternary max-w-xs truncate">
                        {event.payload ? (event.payload.length > 80 ? event.payload.slice(0, 80) + "..." : event.payload) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                Previous
              </Button>
              <span className="text-[12px] font-[510] text-foreground-quaternary">Page {page + 1}</span>
              <Button variant="ghost" size="sm" onClick={() => setPage((p) => p + 1)} disabled={events.length < limit}>
                Next
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
