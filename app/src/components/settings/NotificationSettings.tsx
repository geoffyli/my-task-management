import { useState, useCallback, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Send } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useDevices, useNotificationPreferences } from "@/api/queries";
import { api } from "@/api/client";
import { Button } from "@/components/ui/Button";
import type { NotificationPreferencesRow, PushDevice } from "@/api/types";

// ── Toggle Switch ────────────────────────────────────────────────────────────
function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-[20px] w-[36px] shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:opacity-40 disabled:pointer-events-none ${
        checked ? "bg-accent" : "bg-[rgba(255,255,255,0.1)]"
      }`}
    >
      <span
        className={`inline-block h-[14px] w-[14px] rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? "translate-x-[18px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  );
}

// ── Styled time input ────────────────────────────────────────────────────────
function TimeInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="rounded-[6px] border border-border bg-[rgba(255,255,255,0.04)] px-2 py-1 text-[12px] font-[510] text-foreground-secondary focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-40 disabled:pointer-events-none [color-scheme:dark]"
    />
  );
}

// ── Day picker ───────────────────────────────────────────────────────────────
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function DayPicker({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      disabled={disabled}
      className="rounded-[6px] border border-border bg-[rgba(255,255,255,0.04)] px-2 py-1 text-[12px] font-[510] text-foreground-secondary focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-40 disabled:pointer-events-none appearance-none [color-scheme:dark]"
    >
      {DAYS.map((day, i) => (
        <option key={day} value={i}>
          {day}
        </option>
      ))}
    </select>
  );
}

// ── Threshold picker ─────────────────────────────────────────────────────────
function ThresholdPicker({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      disabled={disabled}
      className="rounded-[6px] border border-border bg-[rgba(255,255,255,0.04)] px-2 py-1 text-[12px] font-[510] text-foreground-secondary focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-40 disabled:pointer-events-none appearance-none [color-scheme:dark]"
    >
      {Array.from({ length: 14 }, (_, i) => i + 1).map((d) => (
        <option key={d} value={d}>
          {d} {d === 1 ? "day" : "days"}
        </option>
      ))}
    </select>
  );
}

// ── Preference row ───────────────────────────────────────────────────────────
function PrefRow({
  label,
  checked,
  onToggle,
  disabled,
  children,
}: {
  label: string;
  checked: boolean;
  onToggle: (v: boolean) => void;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-[13px] font-[510] text-foreground-secondary">{label}</span>
      <div className="flex items-center gap-2">
        {children}
        <Toggle checked={checked} onChange={onToggle} disabled={disabled} />
      </div>
    </div>
  );
}

// ── Device row ───────────────────────────────────────────────────────────────
function DeviceRow({
  device,
  isCurrent,
  disabled,
}: {
  device: PushDevice;
  isCurrent: boolean;
  disabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(device.device_name ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const saveName = useCallback(async () => {
    setEditing(false);
    const trimmed = name.trim();
    if (trimmed && trimmed !== device.device_name) {
      await api.updateDevice(device.id, trimmed);
      queryClient.invalidateQueries({ queryKey: ["push", "devices"] });
    } else {
      setName(device.device_name ?? "");
    }
  }, [name, device, queryClient]);

  const handleRemove = useCallback(async () => {
    await api.deleteDevice(device.id);
    queryClient.invalidateQueries({ queryKey: ["push", "devices"] });
  }, [device.id, queryClient]);

  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="flex items-center gap-2 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveName();
              if (e.key === "Escape") {
                setName(device.device_name ?? "");
                setEditing(false);
              }
            }}
            className="rounded-[4px] border border-border bg-[rgba(255,255,255,0.04)] px-2 py-0.5 text-[13px] font-[510] text-foreground-secondary focus:outline-none focus:ring-1 focus:ring-accent"
          />
        ) : (
          <span className="text-[13px] font-[510] text-foreground-secondary truncate">
            {device.device_name || "Unnamed device"}
            {isCurrent && (
              <span className="ml-1.5 text-[11px] text-foreground-tertiary">(this device)</span>
            )}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {!editing && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setEditing(true)}
            className="rounded-[4px] p-1 text-foreground-tertiary hover:text-foreground hover:bg-[rgba(255,255,255,0.06)] transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            <Pencil size={13} />
          </button>
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={handleRemove}
          className="rounded-[4px] p-1 text-foreground-tertiary hover:text-[#e5484d] hover:bg-[rgba(229,72,77,0.08)] transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export function NotificationSettings() {
  const queryClient = useQueryClient();
  const { isSupported, permission, subscription, subscribe } = usePushNotifications();
  const { data: devices } = useDevices();
  const { data: preferences } = useNotificationPreferences();
  const [testSending, setTestSending] = useState(false);

  const prefs = preferences?.global;
  const masterEnabled = prefs?.enabled === 1;
  const controlsDisabled = !masterEnabled;

  // Helper to update a single preference field
  const updatePref = useCallback(
    async (field: keyof NotificationPreferencesRow, value: number | string) => {
      await api.updateGlobalPreferences({ [field]: value });
      queryClient.invalidateQueries({ queryKey: ["push", "preferences"] });
    },
    [queryClient],
  );

  const toggleField = useCallback(
    (field: keyof NotificationPreferencesRow) => (v: boolean) => {
      updatePref(field, v ? 1 : 0);
    },
    [updatePref],
  );

  const handleSendTest = useCallback(async () => {
    if (!subscription) return;
    setTestSending(true);
    try {
      await api.sendTestNotification(subscription.endpoint);
    } finally {
      setTestSending(false);
    }
  }, [subscription]);

  return (
    <div className="rounded-[8px] border border-border bg-[rgba(255,255,255,0.02)] p-5">
      <h3 className="mb-4 text-[14px] font-[510] text-foreground">Notifications</h3>

      {/* Master toggle */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-border-subtle">
        <span className="text-[13px] font-[510] text-foreground">Enable Notifications</span>
        <Toggle
          checked={masterEnabled}
          onChange={(v) => updatePref("enabled", v ? 1 : 0)}
          disabled={!isSupported}
        />
      </div>

      {/* Permission status */}
      {isSupported && permission !== "granted" && (
        <div className="mt-3 flex items-center justify-between gap-3 pb-3 border-b border-border-subtle">
          <span className="text-[13px] text-foreground-tertiary">
            Browser notifications not enabled
          </span>
          <Button variant="primary" size="sm" onClick={subscribe}>
            Enable
          </Button>
        </div>
      )}

      {/* System Alerts */}
      <div className="mt-4">
        <h4 className="mb-2 text-[12px] font-[510] text-foreground-tertiary uppercase tracking-wide">
          System Alerts
        </h4>
        <PrefRow
          label="Sync failure"
          checked={prefs?.sync_failure === 1}
          onToggle={toggleField("sync_failure")}
          disabled={controlsDisabled}
        />
        <PrefRow
          label="Sync recovery"
          checked={prefs?.sync_recovery === 1}
          onToggle={toggleField("sync_recovery")}
          disabled={controlsDisabled}
        />
        <PrefRow
          label="Database health"
          checked={prefs?.db_health === 1}
          onToggle={toggleField("db_health")}
          disabled={controlsDisabled}
        />
      </div>

      {/* Deadlines */}
      <div className="mt-4 pt-3 border-t border-border-subtle">
        <h4 className="mb-2 text-[12px] font-[510] text-foreground-tertiary uppercase tracking-wide">
          Deadlines
        </h4>
        <PrefRow
          label="Tasks due today"
          checked={prefs?.tasks_due_today === 1}
          onToggle={toggleField("tasks_due_today")}
          disabled={controlsDisabled}
        >
          <TimeInput
            value={prefs?.due_today_time ?? "08:00"}
            onChange={(v) => updatePref("due_today_time", v)}
            disabled={controlsDisabled}
          />
        </PrefRow>
        <PrefRow
          label="Tasks due tomorrow"
          checked={prefs?.tasks_due_tomorrow === 1}
          onToggle={toggleField("tasks_due_tomorrow")}
          disabled={controlsDisabled}
        >
          <TimeInput
            value={prefs?.due_tomorrow_time ?? "08:00"}
            onChange={(v) => updatePref("due_tomorrow_time", v)}
            disabled={controlsDisabled}
          />
        </PrefRow>
        <PrefRow
          label="Overdue tasks"
          checked={prefs?.overdue_tasks === 1}
          onToggle={toggleField("overdue_tasks")}
          disabled={controlsDisabled}
        />
      </div>

      {/* Productivity */}
      <div className="mt-4 pt-3 border-t border-border-subtle">
        <h4 className="mb-2 text-[12px] font-[510] text-foreground-tertiary uppercase tracking-wide">
          Productivity
        </h4>
        <PrefRow
          label="Daily digest"
          checked={prefs?.daily_digest === 1}
          onToggle={toggleField("daily_digest")}
          disabled={controlsDisabled}
        >
          <TimeInput
            value={prefs?.daily_digest_time ?? "07:30"}
            onChange={(v) => updatePref("daily_digest_time", v)}
            disabled={controlsDisabled}
          />
        </PrefRow>
        <PrefRow
          label="Weekly review"
          checked={prefs?.weekly_review === 1}
          onToggle={toggleField("weekly_review")}
          disabled={controlsDisabled}
        >
          <DayPicker
            value={prefs?.weekly_review_day ?? 0}
            onChange={(v) => updatePref("weekly_review_day", v)}
            disabled={controlsDisabled}
          />
          <TimeInput
            value={prefs?.weekly_review_time ?? "18:00"}
            onChange={(v) => updatePref("weekly_review_time", v)}
            disabled={controlsDisabled}
          />
        </PrefRow>
        <PrefRow
          label="Blocked alert"
          checked={prefs?.blocked_alert === 1}
          onToggle={toggleField("blocked_alert")}
          disabled={controlsDisabled}
        >
          <TimeInput
            value={prefs?.blocked_alert_time ?? "09:00"}
            onChange={(v) => updatePref("blocked_alert_time", v)}
            disabled={controlsDisabled}
          />
          <ThresholdPicker
            value={prefs?.blocked_threshold_days ?? 3}
            onChange={(v) => updatePref("blocked_threshold_days", v)}
            disabled={controlsDisabled}
          />
        </PrefRow>
        <PrefRow
          label="Stale alert"
          checked={prefs?.stale_alert === 1}
          onToggle={toggleField("stale_alert")}
          disabled={controlsDisabled}
        >
          <TimeInput
            value={prefs?.stale_alert_time ?? "09:00"}
            onChange={(v) => updatePref("stale_alert_time", v)}
            disabled={controlsDisabled}
          />
          <ThresholdPicker
            value={prefs?.stale_threshold_days ?? 7}
            onChange={(v) => updatePref("stale_threshold_days", v)}
            disabled={controlsDisabled}
          />
        </PrefRow>
      </div>

      {/* Devices */}
      {devices && devices.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border-subtle">
          <h4 className="mb-2 text-[12px] font-[510] text-foreground-tertiary uppercase tracking-wide">
            Devices
          </h4>
          {devices.map((device) => (
            <DeviceRow
              key={device.id}
              device={device}
              isCurrent={subscription?.endpoint === device.endpoint}
              disabled={controlsDisabled}
            />
          ))}
        </div>
      )}

      {/* Test notification */}
      {subscription && (
        <div className="mt-4 pt-3 border-t border-border-subtle">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSendTest}
            disabled={controlsDisabled || testSending}
          >
            <Send size={13} strokeWidth={1.5} />
            <span className="ml-1.5">{testSending ? "Sending..." : "Send Test Notification"}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
