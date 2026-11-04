import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import type {
  EngineStatusPayload,
  RagMode,
  ResearchProvider,
  ResearchRetentionDays,
} from "@personal-ai/shared";
import {
  ApiRequestError,
  clearAllResearchHistory,
  clearLocalDailyData,
  exportAllResearchLocal,
  fetchEngineStatus,
  fetchSettings,
  runEngineNow,
  testGeminiSettings,
  testOllamaSettings,
  updateSettings,
} from "../../src/api/client";
import { getApiBaseUrl, isPhoneLocalMode } from "../../src/config/api";
import { isOverlayNativeModuleAvailable } from "../../modules/overlay-assistant";
import { openOverlayPermissionSettings } from "../../src/overlay/overlayController";
import { useOverlayAssistant } from "../../src/overlay/OverlayAssistantProvider";
import { Card } from "../../src/components/ui/Card";
import { PrimaryButton } from "../../src/components/ui/PrimaryButton";
import { notifyDailyDataCleared } from "../../src/lib/dailyDataRefresh";
import { colors, spacing, typography } from "../../src/theme";

const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";

function formatApiError(err: unknown, fallback: string): string {
  if (err instanceof ApiRequestError) {
    if (err.status === 404) {
      return `${fallback} (${err.status}): settings API not found — restart the server on ${getApiBaseUrl()} and try again.`;
    }
    return err.message;
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}

export default function SettingsScreen() {
  const { refreshOverlayFromSettings, runtimeMode } = useOverlayAssistant();
  const [clearing, setClearing] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [geminiConfigured, setGeminiConfigured] = useState(false);
  const [keyPreview, setKeyPreview] = useState<string | undefined>();
  const [model, setModel] = useState(DEFAULT_GEMINI_MODEL);
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [kimiConfigured, setKimiConfigured] = useState(false);
  const [kimiPreview, setKimiPreview] = useState<string>();
  const [kimiModel, setKimiModel] = useState("moonshot-v1-8k");
  const [kimiKeyDraft, setKimiKeyDraft] = useState("");
  const [ollamaUrl, setOllamaUrl] = useState("http://127.0.0.1:11434");
  const [ollamaReachable, setOllamaReachable] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [researchProvider, setResearchProvider] = useState<ResearchProvider>("auto");
  const [testingOllama, setTestingOllama] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [engineStatus, setEngineStatus] = useState<EngineStatusPayload | null>(null);
  const [engineRunning, setEngineRunning] = useState(false);
  const [mcpEnabled, setMcpEnabled] = useState(false);
  const [mcpServerName, setMcpServerName] = useState("My MCP");
  const [mcpServerUrl, setMcpServerUrl] = useState("");
  const [mcpToolName, setMcpToolName] = useState("default");
  const [mcpScheduleEnabled, setMcpScheduleEnabled] = useState(false);
  const [mcpScheduleMode, setMcpScheduleMode] = useState<"interval" | "daily">("daily");
  const [mcpIntervalMinutes, setMcpIntervalMinutes] = useState("60");
  const [mcpRunTimeLocal, setMcpRunTimeLocal] = useState("09:00");
  const [researchRetentionDays, setResearchRetentionDays] = useState<ResearchRetentionDays>(30);
  const [ragMode, setRagMode] = useState<RagMode>("auto");
  const [ragActiveMode, setRagActiveMode] = useState<"semantic" | "keyword">("keyword");
  const [exportingResearch, setExportingResearch] = useState(false);
  const [overlayAssistantEnabled, setOverlayAssistantEnabled] = useState(false);
  const [assistantName, setAssistantName] = useState("Assistant");
  const [overlayUse3dAvatar, setOverlayUse3dAvatar] = useState(true);

  const applySettings = useCallback((data: Awaited<ReturnType<typeof fetchSettings>>) => {
    setGeminiConfigured(data.geminiConfigured);
    setKeyPreview(data.geminiKeyPreview);
    setModel(data.geminiModel?.trim() || DEFAULT_GEMINI_MODEL);
    setKimiConfigured(data.kimiConfigured);
    setKimiPreview(data.kimiKeyPreview);
    setKimiModel(data.kimiModel?.trim() || "moonshot-v1-8k");
    setOllamaUrl(data.ollamaUrl);
    setOllamaReachable(data.ollamaReachable);
    setDemoMode(data.demoMode);
    setResearchProvider(data.researchProvider);
    setMcpEnabled(data.mcpEnabled);
    const primary = data.mcpServers[0];
    setMcpServerName(primary?.name ?? "My MCP");
    setMcpServerUrl(primary?.url ?? "");
    setMcpToolName(data.mcpSchedule.toolName ?? "default");
    setMcpScheduleEnabled(data.mcpSchedule.enabled);
    setMcpScheduleMode(data.mcpSchedule.mode);
    setMcpIntervalMinutes(String(data.mcpSchedule.intervalMinutes ?? 60));
    setMcpRunTimeLocal(data.mcpSchedule.runTimeLocal ?? "09:00");
    setResearchRetentionDays(data.researchRetentionDays);
    setRagMode(data.ragMode);
    setRagActiveMode(data.ragActiveMode);
    setOverlayAssistantEnabled(data.overlayAssistantEnabled);
    setAssistantName(data.assistantName?.trim() || "Assistant");
    setOverlayUse3dAvatar(data.overlayUse3dAvatar !== false);
  }, []);

  const refreshEngineStatus = useCallback(async () => {
    try {
      const status = await fetchEngineStatus();
      setEngineStatus(status);
    } catch {
      setEngineStatus(null);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    setSettingsError(null);
    try {
      const data = await fetchSettings();
      applySettings(data);
      await refreshEngineStatus();
    } catch (err) {
      setGeminiConfigured(false);
      setKeyPreview(undefined);
      setSettingsError(formatApiError(err, "Could not load settings from the server."));
    } finally {
      setSettingsLoading(false);
    }
  }, [applySettings, refreshEngineStatus]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const onSaveAi = async () => {
    if (saving) return;
    setSaving(true);
    setSettingsError(null);
    try {
      const trimmedKey = apiKeyDraft.trim();
      const body: { geminiModel: string; geminiApiKey?: string } = {
        geminiModel: model.trim() || DEFAULT_GEMINI_MODEL,
      };
      if (trimmedKey.length > 0) {
        body.geminiApiKey = trimmedKey;
      }
      await updateSettings(body);
      setApiKeyDraft("");
      const data = await fetchSettings();
      applySettings(data);
      Alert.alert("Saved", "AI connection settings updated on this server.");
    } catch (err) {
      const message = formatApiError(err, "Check that the server is running and try again.");
      setSettingsError(message);
      Alert.alert("Save failed", message);
    } finally {
      setSaving(false);
    }
  };

  const onTestGemini = async () => {
    if (testing || saving) return;
    setTesting(true);
    setSettingsError(null);
    try {
      await testGeminiSettings();
      const data = await fetchSettings();
      applySettings(data);
      Alert.alert("Connected", "Gemini responded successfully using the key on this server.");
    } catch (err) {
      const message = formatApiError(err, "Could not reach Gemini with the saved key.");
      setSettingsError(message);
      Alert.alert("Test failed", message);
    } finally {
      setTesting(false);
    }
  };

  const onSaveResearchPrefs = async () => {
    setSaving(true);
    try {
      await updateSettings({
        demoMode,
        researchProvider,
        ollamaUrl: ollamaUrl.trim(),
        kimiApiKey: kimiKeyDraft.trim() || undefined,
        kimiModel: kimiModel.trim(),
        researchRetentionDays,
        ragMode,
      });
      setKimiKeyDraft("");
      const data = await fetchSettings();
      applySettings(data);
      Alert.alert("Saved", "Research preferences updated.");
    } catch (err) {
      Alert.alert("Save failed", formatApiError(err, "Try again."));
    } finally {
      setSaving(false);
    }
  };

  const onTestOllama = async () => {
    setTestingOllama(true);
    try {
      await testOllamaSettings();
      const data = await fetchSettings();
      applySettings(data);
      Alert.alert("Ollama", "Reachable at configured URL.");
    } catch (err) {
      Alert.alert("Ollama offline", formatApiError(err, "Start Ollama on your laptop."));
    } finally {
      setTestingOllama(false);
    }
  };

  const onRemoveGeminiKey = () => {
    Alert.alert("Remove Gemini API key?", "Research will use sample cards until a key is set again.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          setSaving(true);
          void updateSettings({ geminiApiKey: "" })
            .then(() => fetchSettings())
            .then((data) => {
              applySettings(data);
              setApiKeyDraft("");
              Alert.alert("Removed", "Gemini key cleared on this server.");
            })
            .catch((err) => {
              const message = formatApiError(err, "Try again when the server is reachable.");
              setSettingsError(message);
              Alert.alert("Could not remove key", message);
            })
            .finally(() => setSaving(false));
        },
      },
    ]);
  };

  const runClear = () => {
    setClearing(true);
    void clearLocalDailyData()
      .then(() => {
        notifyDailyDataCleared();
        Alert.alert(
          "Local data deleted",
          "Todos, research, daily tasks, and reminders were cleared on this server.",
        );
      })
      .catch(() => {
        Alert.alert("Could not delete data", "Check that the server is running and try again.");
      })
      .finally(() => setClearing(false));
  };

  const onDeleteLocalData = () => {
    Alert.alert(
      "Delete local data?",
      "This removes todos, research, daily schedule, and reminders on this server.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert("Are you sure?", "This cannot be undone.", [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: runClear },
            ]);
          },
        },
      ],
    );
  };

  const onSaveMcp = async () => {
    const url = mcpServerUrl.trim();
    if (mcpEnabled && !url) {
      Alert.alert("MCP URL required", "Add a server URL or turn MCP off.");
      return;
    }
    setSaving(true);
    try {
      const interval = Math.max(5, parseInt(mcpIntervalMinutes, 10) || 60);
      await updateSettings({
        mcpEnabled,
        mcpServers: url
          ? [{ id: "primary", name: mcpServerName.trim() || "MCP", url }]
          : [],
        mcpSchedule: {
          enabled: mcpScheduleEnabled && mcpEnabled,
          mode: mcpScheduleMode,
          intervalMinutes: interval,
          runTimeLocal: mcpRunTimeLocal.trim() || "09:00",
          serverId: url ? "primary" : undefined,
          toolName: mcpToolName.trim() || "default",
          arguments: {},
        },
      });
      const data = await fetchSettings();
      applySettings(data);
      Alert.alert("Saved", "MCP scheduling updated on this device.");
    } catch (err) {
      Alert.alert("Save failed", formatApiError(err, "Try again."));
    } finally {
      setSaving(false);
    }
  };

  const onRunEngine = async () => {
    if (engineRunning) return;
    setEngineRunning(true);
    try {
      await runEngineNow();
      await refreshEngineStatus();
      Alert.alert("Engine", "Processed pending tasks.");
    } catch (err) {
      Alert.alert("Engine failed", formatApiError(err, "Try again."));
    } finally {
      setEngineRunning(false);
    }
  };

  const onExportAllResearch = async () => {
    if (!isPhoneLocalMode()) {
      Alert.alert("Phone only", "Export runs in phone-local mode (no laptop server URL).");
      return;
    }
    setExportingResearch(true);
    try {
      await exportAllResearchLocal();
    } catch (err) {
      Alert.alert("Export failed", err instanceof Error ? err.message : "Try again.");
    } finally {
      setExportingResearch(false);
    }
  };

  const onClearResearchHistory = () => {
    Alert.alert("Clear research history?", "Deletes all saved briefings (markdown + index).", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => {
          setClearingHistory(true);
          void clearAllResearchHistory()
            .then(() => {
              notifyDailyDataCleared();
              Alert.alert("Cleared", "Research history removed from this server.");
            })
            .catch(() => Alert.alert("Failed", "Check server connection."))
            .finally(() => setClearingHistory(false));
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={typography.subtitle}>Preferences</Text>
      <Text style={typography.caption}>
        {isPhoneLocalMode()
          ? "All data stays on this phone (document storage + SecureStore for API keys)."
          : `Dev mode: syncing to laptop server at ${getApiBaseUrl() ?? ""}.`}
      </Text>

      <Text style={styles.sectionLabel}>On-screen assistant (MA-38–40)</Text>
      <Card style={styles.aiCard}>
        <View style={styles.switchRow}>
          <Text style={typography.body}>Show assistant on screen</Text>
          <Switch
            value={overlayAssistantEnabled}
            onValueChange={(v) => setOverlayAssistantEnabled(v)}
          />
        </View>
        <Text style={typography.caption}>
          {isOverlayNativeModuleAvailable()
            ? `Native overlay: ${runtimeMode}. Requires display-over-other-apps permission.`
            : "Expo Go / web: in-app draggable bubble only. Use EAS Android build for system overlay."}
        </Text>
        <Text style={typography.caption}>
          Battery: foreground overlay + mic use extra power. Disable when not needed. Some OEMs
          may stop the service unless battery optimization is off for this app.
        </Text>
        <Text style={styles.fieldLabel}>Assistant name (wake phrase)</Text>
        <TextInput
          style={styles.input}
          value={assistantName}
          onChangeText={setAssistantName}
          placeholder="Assistant"
        />
        <View style={styles.switchRow}>
          <Text style={typography.body}>3D avatar in bubble</Text>
          <Switch value={overlayUse3dAvatar} onValueChange={setOverlayUse3dAvatar} />
        </View>
        <View style={styles.aiActions}>
          <PrimaryButton
            label={saving ? "…" : "Save overlay"}
            onPress={() =>
              void (async () => {
                setSaving(true);
                try {
                  await updateSettings({
                    overlayAssistantEnabled,
                    assistantName: assistantName.trim() || "Assistant",
                    overlayUse3dAvatar,
                  });
                  await refreshOverlayFromSettings();
                  const data = await fetchSettings();
                  applySettings(data);
                  Alert.alert("Saved", "Overlay assistant updated.");
                } catch (err) {
                  Alert.alert("Save failed", formatApiError(err, "Try again."));
                } finally {
                  setSaving(false);
                }
              })()
            }
            disabled={saving}
          />
          {isOverlayNativeModuleAvailable() ? (
            <PrimaryButton
              label="Overlay permission"
              variant="secondary"
              onPress={() =>
                void openOverlayPermissionSettings().catch((err) =>
                  Alert.alert("Settings", err instanceof Error ? err.message : "Unavailable"),
                )
              }
            />
          ) : null}
        </View>
      </Card>

      <Text style={styles.sectionLabel}>Phone notifications</Text>
      <Card style={styles.aiCard}>
        <Text style={typography.body}>Reminders use phone notifications</Text>
        <Text style={typography.caption}>
          Works in background when Android allows (Expo Go has limits; dev builds are better).
          Scheduled research runs when the server is up and the app can reach it — not true 24×7
          while the app is killed.
        </Text>
      </Card>

      <Text style={styles.sectionLabel}>AI connection</Text>
      <Card style={styles.aiCard}>
        {settingsLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <View style={styles.statusRow}>
              <Text style={typography.body}>Gemini</Text>
              <Text
                style={[
                  styles.statusBadge,
                  geminiConfigured ? styles.statusConnected : styles.statusOff,
                ]}
              >
                {geminiConfigured ? "Connected" : "Not connected"}
              </Text>
            </View>
            {settingsError ? (
              <Text style={styles.errorText}>{settingsError}</Text>
            ) : null}
            {keyPreview ? (
              <Text style={typography.caption}>Key on server: {keyPreview}</Text>
            ) : null}
            {apiKeyDraft.trim().length > 0 && !geminiConfigured ? (
              <Text style={styles.saveHint}>Tap Save to connect this key to the server.</Text>
            ) : null}
            <Text style={typography.caption}>
              Paste an API key from Google AI Studio. Keys stay on{" "}
              {isPhoneLocalMode() ? "this phone (SecureStore)" : `your server (${getApiBaseUrl()})`}.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="AIza… (Google AI Studio API key)"
              placeholderTextColor={colors.textSecondary}
              value={apiKeyDraft}
              onChangeText={setApiKeyDraft}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!saving}
            />
            <Text style={styles.fieldLabel}>Model</Text>
            <TextInput
              style={styles.input}
              placeholder={DEFAULT_GEMINI_MODEL}
              placeholderTextColor={colors.textSecondary}
              value={model}
              onChangeText={setModel}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!saving}
            />
            <View style={styles.aiActions}>
              <PrimaryButton
                label={saving ? "…" : "Save"}
                onPress={() => void onSaveAi()}
                disabled={saving || testing}
                style={styles.saveBtn}
              />
              {geminiConfigured ? (
                <PrimaryButton
                  label={testing ? "…" : "Test connection"}
                  onPress={() => void onTestGemini()}
                  disabled={saving || testing}
                  variant="secondary"
                  style={styles.testBtn}
                />
              ) : null}
              {geminiConfigured ? (
                <Pressable
                  onPress={onRemoveGeminiKey}
                  disabled={saving || testing}
                  accessibilityRole="button"
                  accessibilityLabel="Remove Gemini API key"
                >
                  <Text style={styles.removeKeyText}>Remove key</Text>
                </Pressable>
              ) : null}
            </View>
          </>
        )}
      </Card>

      <Text style={styles.sectionLabel}>Kimi (Moonshot)</Text>
      <Card style={styles.aiCard}>
        <View style={styles.statusRow}>
          <Text style={typography.body}>Kimi API</Text>
          <Text style={[styles.statusBadge, kimiConfigured ? styles.statusConnected : styles.statusOff]}>
            {kimiConfigured ? "Connected" : "Not connected"}
          </Text>
        </View>
        {kimiPreview ? <Text style={typography.caption}>Key: {kimiPreview}</Text> : null}
        <TextInput
          style={styles.input}
          placeholder="Moonshot API key"
          placeholderTextColor={colors.textSecondary}
          value={kimiKeyDraft}
          onChangeText={setKimiKeyDraft}
          secureTextEntry
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="moonshot-v1-8k"
          value={kimiModel}
          onChangeText={setKimiModel}
          autoCapitalize="none"
        />
      </Card>

      <Text style={styles.sectionLabel}>Research sources</Text>
      <Card style={styles.aiCard}>
        <View style={styles.switchRow}>
          <Text style={typography.body}>Offline demo mode</Text>
          <Switch value={demoMode} onValueChange={setDemoMode} />
        </View>
        <Text style={typography.caption}>
          When on, Research uses template cards only (no Wikipedia/RSS/cloud).
        </Text>
        <Text style={styles.fieldLabel}>Provider priority</Text>
        <View style={styles.providerRow}>
          {(["auto", "gemini", "kimi", "free"] as ResearchProvider[]).map((p) => (
            <Pressable
              key={p}
              style={[styles.chip, researchProvider === p && styles.chipActive]}
              onPress={() => setResearchProvider(p)}
            >
              <Text style={[styles.chipText, researchProvider === p && styles.chipTextActive]}>
                {p}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.fieldLabel}>Ollama URL (RAG / health)</Text>
        <TextInput
          style={styles.input}
          value={ollamaUrl}
          onChangeText={setOllamaUrl}
          autoCapitalize="none"
        />
        <Text style={typography.caption}>
          Ollama: {ollamaReachable ? "reachable" : "not reachable"} — embeddings for semantic RAG when
          reachable (`nomic-embed-text`).
        </Text>
        <Text style={styles.fieldLabel}>Research retention</Text>
        <View style={styles.providerRow}>
          {(
            [
              [0, "Forever"],
              [30, "30 days"],
              [7, "7 days"],
              [1, "1 day"],
            ] as const
          ).map(([days, label]) => (
            <Pressable
              key={days}
              style={[
                styles.chip,
                researchRetentionDays === days && styles.chipActive,
              ]}
              onPress={() => setResearchRetentionDays(days)}
            >
              <Text
                style={[
                  styles.chipText,
                  researchRetentionDays === days && styles.chipTextActive,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.fieldLabel}>RAG search mode</Text>
        <View style={styles.providerRow}>
          {(["auto", "semantic", "keyword"] as const).map((m) => (
            <Pressable
              key={m}
              style={[styles.chip, ragMode === m && styles.chipActive]}
              onPress={() => setRagMode(m)}
            >
              <Text style={[styles.chipText, ragMode === m && styles.chipTextActive]}>{m}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={typography.caption}>
          Active RAG: {ragActiveMode} (auto picks semantic when Ollama + embeddings exist).
        </Text>
        <View style={styles.aiActions}>
          <PrimaryButton
            label={saving ? "…" : "Save research prefs"}
            onPress={() => void onSaveResearchPrefs()}
            disabled={saving}
          />
          <PrimaryButton
            label={testingOllama ? "…" : "Test Ollama"}
            variant="secondary"
            onPress={() => void onTestOllama()}
            disabled={testingOllama}
          />
        </View>
      </Card>

      <Text style={styles.sectionLabel}>Task engine (MA-5)</Text>
      <Card style={styles.aiCard}>
        <Text style={typography.body}>
          Queue:{" "}
          {engineStatus
            ? `${engineStatus.pending} pending · ${engineStatus.running} running · ${engineStatus.done} done · ${engineStatus.error} error`
            : "—"}
        </Text>
        <Text style={typography.caption}>
          Tasks persist in `daily/engine-queue.json`. PhoneBootstrap ticks the processor; use Run now
          to drain pending work immediately.
        </Text>
        <PrimaryButton
          label={engineRunning ? "…" : "Run engine now"}
          variant="secondary"
          onPress={() => void onRunEngine()}
          disabled={engineRunning}
        />
      </Card>

      <Text style={styles.sectionLabel}>MCP scheduling (MA-8)</Text>
      <Card style={styles.aiCard}>
        <View style={styles.switchRow}>
          <Text style={typography.body}>Enable MCP</Text>
          <Switch value={mcpEnabled} onValueChange={setMcpEnabled} />
        </View>
        {!mcpEnabled ? (
          <Text style={typography.caption}>
            Turn on to schedule HTTP MCP tool calls on this phone (results in `daily/mcp-runs.json`).
          </Text>
        ) : !mcpServerUrl.trim() ? (
          <Text style={typography.caption}>
            Add a server URL below — JSON-RPC POST to the endpoint with tool name and timeout.
          </Text>
        ) : (
          <Text style={typography.caption}>Server: {mcpServerUrl.trim()}</Text>
        )}
        <Text style={styles.fieldLabel}>Server name</Text>
        <TextInput style={styles.input} value={mcpServerName} onChangeText={setMcpServerName} />
        <Text style={styles.fieldLabel}>Server URL</Text>
        <TextInput
          style={styles.input}
          value={mcpServerUrl}
          onChangeText={setMcpServerUrl}
          placeholder="https://example.com/mcp"
          autoCapitalize="none"
        />
        <Text style={styles.fieldLabel}>Tool name</Text>
        <TextInput style={styles.input} value={mcpToolName} onChangeText={setMcpToolName} />
        <View style={styles.switchRow}>
          <Text style={typography.body}>Schedule MCP runs</Text>
          <Switch value={mcpScheduleEnabled} onValueChange={setMcpScheduleEnabled} />
        </View>
        <View style={styles.providerRow}>
          {(["daily", "interval"] as const).map((m) => (
            <Pressable
              key={m}
              style={[styles.chip, mcpScheduleMode === m && styles.chipActive]}
              onPress={() => setMcpScheduleMode(m)}
            >
              <Text
                style={[styles.chipText, mcpScheduleMode === m && styles.chipTextActive]}
              >
                {m === "daily" ? "Daily time" : "Interval"}
              </Text>
            </Pressable>
          ))}
        </View>
        {mcpScheduleMode === "daily" ? (
          <>
            <Text style={styles.fieldLabel}>Run at (local HH:MM)</Text>
            <TextInput
              style={styles.input}
              value={mcpRunTimeLocal}
              onChangeText={setMcpRunTimeLocal}
              placeholder="09:00"
            />
          </>
        ) : (
          <>
            <Text style={styles.fieldLabel}>Every N minutes</Text>
            <TextInput
              style={styles.input}
              value={mcpIntervalMinutes}
              onChangeText={setMcpIntervalMinutes}
              keyboardType="number-pad"
            />
          </>
        )}
        <PrimaryButton
          label={saving ? "…" : "Save MCP"}
          onPress={() => void onSaveMcp()}
          disabled={saving}
        />
      </Card>

      <Text style={styles.sectionLabel}>Data on this device</Text>
      <Card style={styles.row}>
        <View style={styles.rowText}>
          <Text style={typography.body}>Clear research history</Text>
          <Text style={typography.caption}>
            Removes all saved briefings. Pruning otherwise follows your retention setting above.
          </Text>
        </View>
        <Pressable
          style={[styles.deleteBtn, clearingHistory && styles.deleteBtnDisabled]}
          onPress={onClearResearchHistory}
          disabled={clearingHistory}
        >
          <Text style={styles.deleteBtnText}>{clearingHistory ? "…" : "Clear"}</Text>
        </Pressable>
      </Card>
      <Card style={styles.row}>
        <View style={styles.rowText}>
          <Text style={typography.body}>Export all research</Text>
          <Text style={typography.caption}>
            Share a combined markdown export (phone-local mode).
          </Text>
        </View>
        <Pressable
          style={[styles.deleteBtn, styles.exportBtn, exportingResearch && styles.deleteBtnDisabled]}
          onPress={() => void onExportAllResearch()}
          disabled={exportingResearch}
        >
          <Text style={styles.deleteBtnText}>{exportingResearch ? "…" : "Export"}</Text>
        </Pressable>
      </Card>
      <Card style={styles.row}>
        <View style={styles.rowText}>
          <Text style={typography.body}>Delete local data</Text>
          <Text style={typography.caption}>
            Clears todos, research, daily tasks, reminders, and engine queue on this device.
          </Text>
        </View>
        <Pressable
          style={[styles.deleteBtn, clearing && styles.deleteBtnDisabled]}
          onPress={onDeleteLocalData}
          disabled={clearing}
          accessibilityRole="button"
          accessibilityLabel="Delete local data"
        >
          <Text style={styles.deleteBtnText}>{clearing ? "…" : "Delete"}</Text>
        </Pressable>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
  sectionLabel: {
    ...typography.caption,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    color: colors.textSecondary,
  },
  aiCard: { gap: spacing.sm },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusBadge: {
    fontSize: 13,
    fontWeight: "700",
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: 999,
    overflow: "hidden",
  },
  statusConnected: {
    color: colors.primary,
    backgroundColor: `${colors.primary}22`,
  },
  statusOff: {
    color: colors.textSecondary,
    backgroundColor: colors.border,
  },
  fieldLabel: { ...typography.caption, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: 15,
  },
  aiActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  saveBtn: { flex: 0 },
  testBtn: { flex: 0 },
  saveHint: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "600",
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: "600",
  },
  removeKeyText: { color: colors.danger, fontWeight: "600", fontSize: 14 },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  providerRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  chipTextActive: { color: colors.primary },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  rowText: { flex: 1, gap: spacing.xs },
  deleteBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.danger,
  },
  deleteBtnDisabled: { opacity: 0.6 },
  exportBtn: { backgroundColor: colors.primary },
  deleteBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
