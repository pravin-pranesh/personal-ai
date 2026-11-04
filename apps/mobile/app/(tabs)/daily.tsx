import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { DailyTaskRun, DailyTaskRunStatus, DailyTasksPayload } from "@personal-ai/shared";
import {
  createDailyTaskTopic,
  deleteDailyTaskTopic,
  fetchDailyTasks,
  runEngineNow,
  updateDailyTaskSchedule,
} from "../../src/api/client";
import { isPhoneLocalMode } from "../../src/config/api";
import { NewsCard } from "../../src/components/research/NewsCard";
import { ResearchBriefing } from "../../src/components/research/ResearchBriefing";
import { useMascotOverlay } from "../../src/mascot/MascotOverlayContext";
import { subscribeDailyDataCleared } from "../../src/lib/dailyDataRefresh";
import { OfflineBanner } from "../../src/components/ui/OfflineBanner";
import { Card } from "../../src/components/ui/Card";
import { PrimaryButton } from "../../src/components/ui/PrimaryButton";
import { colors, spacing, typography } from "../../src/theme";

function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function statusLabel(status: DailyTaskRunStatus): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "running":
      return "Running…";
    case "done":
      return "Done";
    case "error":
      return "Failed";
    default:
      return status;
  }
}

function statusColor(status: DailyTaskRunStatus): string {
  switch (status) {
    case "done":
      return "#15803d";
    case "running":
      return colors.primary;
    case "error":
      return colors.danger;
    default:
      return colors.textSecondary;
  }
}

type WebTimeInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

function WebTimeInput({ value, onChange, disabled }: WebTimeInputProps) {
  if (Platform.OS !== "web") {
    return (
      <TextInput
        style={styles.timeInput}
        value={value}
        onChangeText={onChange}
        placeholder="HH:MM"
        placeholderTextColor={colors.textSecondary}
        editable={!disabled}
        autoCapitalize="none"
      />
    );
  }

  return (
    <input
      type="time"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      style={{
        flex: 1,
        minHeight: 44,
        padding: "8px 12px",
        fontSize: 16,
        borderRadius: 10,
        border: `1px solid ${colors.border}`,
        backgroundColor: colors.card,
        color: colors.text,
      }}
    />
  );
}

export default function DailyTasksScreen() {
  const { speakCue } = useMascotOverlay();
  const announcedDone = useRef<Set<string>>(new Set());
  const [payload, setPayload] = useState<DailyTasksPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [runTime, setRunTime] = useState("08:00");
  const [timezone, setTimezone] = useState(deviceTimezone);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [runningEngine, setRunningEngine] = useState(false);

  const applyPayload = useCallback(
    (data: DailyTasksPayload) => {
      for (const run of data.todayRuns) {
        if (run.status === "done" && !announcedDone.current.has(run.id)) {
          announcedDone.current.add(run.id);
          const result = data.results?.[run.id];
          speakCue({
            message: result?.summary ?? `Daily research finished for ${run.topic}.`,
            reason: "Daily schedule",
          });
        }
      }
      setPayload(data);
      setRunTime(data.schedule.runTimeLocal);
      setTimezone(data.schedule.timezone);
    },
    [speakCue],
  );

  const load = useCallback(async () => {
    setError(false);
    try {
      const data = await fetchDailyTasks();
      applyPayload(data);
    } catch {
      setError(true);
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [applyPayload]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => subscribeDailyDataCleared(() => void load()), [load]);

  useEffect(() => {
    const id = setInterval(() => {
      void fetchDailyTasks().then(applyPayload).catch(() => {});
    }, 60_000);
    return () => clearInterval(id);
  }, [applyPayload]);

  const runsByTopicId = useMemo(() => {
    const map = new Map<string, DailyTaskRun>();
    for (const run of payload?.todayRuns ?? []) {
      map.set(run.topicId, run);
    }
    return map;
  }, [payload?.todayRuns]);

  const onAddTopic = async () => {
    const topic = draft.trim();
    if (!topic || adding) return;
    setAdding(true);
    try {
      await createDailyTaskTopic(topic);
      setDraft("");
      await load();
    } catch {
      Alert.alert("Could not add topic", "Check that the server is running.");
    } finally {
      setAdding(false);
    }
  };

  const onDeleteTopic = (id: string, label: string) => {
    Alert.alert("Remove topic?", label, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          void deleteDailyTaskTopic(id)
            .then(() => load())
            .catch(() => Alert.alert("Remove failed", "Try again."));
        },
      },
    ]);
  };

  const onSaveSchedule = async () => {
    setSavingSchedule(true);
    try {
      await updateDailyTaskSchedule({
        runTimeLocal: runTime,
        timezone: timezone.trim() || deviceTimezone(),
      });
      await load();
    } catch {
      Alert.alert("Invalid schedule", "Use HH:MM for time and a valid timezone.");
    } finally {
      setSavingSchedule(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const topics = payload?.topics ?? [];
  const empty = topics.length === 0;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {error ? <OfflineBanner /> : null}

      <Text style={typography.subtitle}>Daily schedule</Text>
      <Text style={styles.hint}>
        Set daily topics and time here. When the time passes, the task engine runs the same research
        pipeline as the Research tab (on-device when phone-local).
      </Text>
      {isPhoneLocalMode() ? (
        <PrimaryButton
          label={runningEngine ? "…" : "Run engine now"}
          variant="secondary"
          onPress={() => {
            setRunningEngine(true);
            void runEngineNow()
              .then(() => load())
              .catch(() => Alert.alert("Engine", "Could not process queue."))
              .finally(() => setRunningEngine(false));
          }}
          disabled={runningEngine}
        />
      ) : null}

      <Card style={styles.scheduleCard}>
        <Text style={styles.sectionTitle}>Run time (local)</Text>
        <View style={styles.timeRow}>
          <WebTimeInput value={runTime} onChange={setRunTime} disabled={savingSchedule} />
          <PrimaryButton
            label={savingSchedule ? "…" : "Save"}
            onPress={() => void onSaveSchedule()}
            disabled={savingSchedule}
            style={styles.saveBtn}
          />
        </View>
        <Text style={styles.tzLabel}>Timezone: {timezone}</Text>
        <Pressable
          onPress={() => setTimezone(deviceTimezone())}
          accessibilityRole="button"
        >
          <Text style={styles.tzSync}>Use device timezone</Text>
        </Pressable>
      </Card>

      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder="Topic to research daily…"
          placeholderTextColor={colors.textSecondary}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={() => void onAddTopic()}
          returnKeyType="done"
          editable={!adding}
        />
        <PrimaryButton
          label={adding ? "…" : "Add"}
          onPress={() => void onAddTopic()}
          disabled={!draft.trim() || adding}
          style={styles.addBtn}
        />
      </View>

      <Text style={styles.sectionTitle}>Today</Text>

      {empty ? (
        <Text style={typography.caption}>
          Set daily topics and time here — add your first topic above.
        </Text>
      ) : (
        topics.map((topic) => {
          const run = runsByTopicId.get(topic.id);
          const status: DailyTaskRunStatus = run?.status ?? "pending";
          const result = run ? payload?.results?.[run.id] : undefined;
          const expanded = run && expandedRunId === run.id;

          return (
            <Card key={topic.id} style={styles.topicCard}>
              <View style={styles.topicHeader}>
                <View style={styles.topicTitleCol}>
                  <Text style={styles.topicTitle}>{topic.topic}</Text>
                  <View style={styles.statusRow}>
                    <Text style={[styles.statusText, { color: statusColor(status) }]}>
                      {statusLabel(status)}
                    </Text>
                    {status === "running" ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : null}
                  </View>
                  {run?.status === "error" && run.error ? (
                    <Text style={styles.errorText}>{run.error}</Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={() => onDeleteTopic(topic.id, topic.topic)}
                  accessibilityLabel="Remove topic"
                >
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
              </View>

              {result ? (
                <Pressable
                  onPress={() =>
                    setExpandedRunId(expanded ? null : run?.id ?? null)
                  }
                  accessibilityRole="button"
                >
                  <Text style={styles.viewResult}>
                    {expanded ? "Hide briefing" : "View briefing"}
                  </Text>
                </Pressable>
              ) : null}

              {expanded && result ? (
                <View style={styles.resultBlock}>
                  {result.briefingMarkdown ? (
                    <ResearchBriefing markdown={result.briefingMarkdown} />
                  ) : null}
                  <Text style={styles.summaryText}>{result.summary}</Text>
                  <View style={styles.cardStack}>
                    {result.cards.map((card, i) => (
                      <NewsCard key={`${run?.id}-card-${i}`} card={card} />
                    ))}
                  </View>
                </View>
              ) : null}
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  scheduleCard: { gap: spacing.sm, marginTop: spacing.xs },
  sectionTitle: { ...typography.subtitle, fontSize: 16 },
  timeRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  timeInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveBtn: { minWidth: 72 },
  tzLabel: { ...typography.caption, color: colors.textSecondary },
  tzSync: { color: colors.primary, fontWeight: "600", fontSize: 14 },
  addRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center", marginTop: spacing.sm },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: 16,
  },
  addBtn: { minWidth: 72 },
  topicCard: { gap: spacing.sm },
  topicHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  topicTitleCol: { flex: 1, gap: 4 },
  topicTitle: { ...typography.body, fontWeight: "600" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusText: { ...typography.caption, fontWeight: "600" },
  errorText: { ...typography.caption, color: colors.danger },
  removeText: { color: colors.danger, fontWeight: "600", fontSize: 14 },
  viewResult: { color: colors.primary, fontWeight: "700", fontSize: 14 },
  resultBlock: { gap: spacing.sm, marginTop: spacing.xs },
  summaryText: { ...typography.body, lineHeight: 22 },
  cardStack: { gap: spacing.sm },
});
