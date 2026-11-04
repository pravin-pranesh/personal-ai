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
import type { ResearchProvider } from "@personal-ai/shared";
import {
  ApiRequestError,
  clearLocalDailyData,
  fetchSettings,
  testGeminiSettings,
  testOllamaSettings,
  updateSettings,
} from "../../src/api/client";
import { getApiBaseUrl } from "../../src/config/api";
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
  }, []);

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    setSettingsError(null);
    try {
      const data = await fetchSettings();
      applySettings(data);
    } catch (err) {
      setGeminiConfigured(false);
      setKeyPreview(undefined);
      setSettingsError(formatApiError(err, "Could not load settings from the server."));
    } finally {
      setSettingsLoading(false);
    }
  }, [applySettings]);

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

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={typography.subtitle}>Preferences</Text>

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
              Paste an API key from Google AI Studio. Keys stay on your server ({getApiBaseUrl()})
              — never in the mobile bundle.
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
          Ollama: {ollamaReachable ? "reachable" : "not reachable"} — used for MA-18 keyword+RAG hint.
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

      <Text style={styles.sectionLabel}>MCP (MA-8)</Text>
      <Card style={styles.aiCard}>
        <Text style={typography.body}>MCP scheduling — not enabled</Text>
        <Text style={typography.caption}>
          Placeholder for future laptop MCP triggers. Daily research uses the local JSON scheduler
          today.
        </Text>
      </Card>

      <Text style={styles.sectionLabel}>Data on this server</Text>
      <Card style={styles.row}>
        <View style={styles.rowText}>
          <Text style={typography.body}>Delete local data</Text>
          <Text style={typography.caption}>
            Clears todos, research, daily tasks, and reminders JSON on this server.
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
  deleteBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
