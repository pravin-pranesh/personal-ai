import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
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
  testKimiSettings,
  updateSettings,
} from "../../src/api/client";
import { getApiBaseUrl } from "../../src/config/api";
import { Card } from "../../src/components/ui/Card";
import { PrimaryButton } from "../../src/components/ui/PrimaryButton";
import { notifyDailyDataCleared } from "../../src/lib/dailyDataRefresh";
import { colors, spacing, typography } from "../../src/theme";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const DEFAULT_KIMI_MODEL = "kimi-k3.1-pro";

const RESEARCH_PROVIDER_OPTIONS: { id: ResearchProvider; label: string }[] = [
  { id: "auto", label: "Auto" },
  { id: "kimi", label: "Kimi" },
  { id: "gemini", label: "Gemini" },
  { id: "wikipedia", label: "Wikipedia" },
];

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
  const [geminiDevStub, setGeminiDevStub] = useState(false);
  const [showOfflineDemo, setShowOfflineDemo] = useState(false);
  const [kimiConfigured, setKimiConfigured] = useState(false);
  const [kimiKeyPreview, setKimiKeyPreview] = useState<string | undefined>();
  const [kimiModel, setKimiModel] = useState(DEFAULT_KIMI_MODEL);
  const [kimiApiKeyDraft, setKimiApiKeyDraft] = useState("");
  const [kimiTesting, setKimiTesting] = useState(false);
  const [kimiSaving, setKimiSaving] = useState(false);
  const [researchProvider, setResearchProvider] = useState<ResearchProvider>("auto");
  const [providerSaving, setProviderSaving] = useState(false);

  const applySettings = useCallback((data: Awaited<ReturnType<typeof fetchSettings>>) => {
    setGeminiConfigured(data.geminiConfigured);
    setKeyPreview(data.geminiKeyPreview);
    setModel(data.geminiModel?.trim() || DEFAULT_GEMINI_MODEL);
    setGeminiDevStub(data.geminiDevStub === true);
    setKimiConfigured(data.kimiConfigured);
    setKimiKeyPreview(data.kimiKeyPreview);
    setKimiModel(data.kimiModel?.trim() || DEFAULT_KIMI_MODEL);
    setResearchProvider(data.researchProvider ?? "auto");
    if (data.geminiDevStub) {
      setShowOfflineDemo(false);
    }
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
    setShowOfflineDemo(false);
    try {
      const result = await testGeminiSettings();
      const data = await fetchSettings();
      applySettings(data);
      if (result.mode === "stub") {
        Alert.alert(
          "Demo mode",
          "Offline demo is active — research uses sample cards. Add an AI Studio key for live Gemini.",
        );
      } else {
        Alert.alert("Connected", "Gemini responded successfully using the key on this server.");
      }
    } catch (err) {
      const message = formatApiError(err, "Could not reach Gemini with the saved key.");
      setSettingsError(message);
      setShowOfflineDemo(true);
      Alert.alert("Test failed", message);
    } finally {
      setTesting(false);
    }
  };

  const onEnableOfflineDemo = async () => {
    if (saving || testing) return;
    setSaving(true);
    setSettingsError(null);
    try {
      await updateSettings({ geminiDevStub: true });
      const data = await fetchSettings();
      applySettings(data);
      setShowOfflineDemo(false);
      Alert.alert(
        "Demo mode enabled",
        "Research will use sample cards until you add a working AI Studio key.",
      );
    } catch (err) {
      const message = formatApiError(err, "Could not enable demo mode on the server.");
      setSettingsError(message);
      Alert.alert("Could not enable demo mode", message);
    } finally {
      setSaving(false);
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
        Alert.alert("Local data deleted", "Todos and research notes were cleared on this server.");
      })
      .catch(() => {
        Alert.alert("Could not delete data", "Check that the server is running and try again.");
      })
      .finally(() => setClearing(false));
  };

  const onDeleteLocalData = () => {
    Alert.alert(
      "Delete local data?",
      "This removes todos and research notes on this server. Task catalog DB is kept.",
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
                  geminiDevStub
                    ? styles.statusDemo
                    : geminiConfigured
                      ? styles.statusConnected
                      : styles.statusOff,
                ]}
              >
                {geminiDevStub ? "Demo mode" : geminiConfigured ? "Key saved" : "Not connected"}
              </Text>
            </View>
            {geminiDevStub ? (
              <Text style={typography.caption}>
                Offline demo — research uses sample cards. Add AI Studio key for live Gemini.
              </Text>
            ) : null}
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
              Paste an API key from Google AI Studio (AIza… or AQ.…). Keys stay on your server (
              {getApiBaseUrl()}) — never in the mobile bundle.
            </Text>
            <Text style={typography.caption}>
              Research sources: without a key (or in demo mode), briefings use **Wikipedia** when
              possible; with a key, **Gemini** generates web-style summaries and falls back to
              Wikipedia if the call fails.
            </Text>
            <Text style={typography.caption}>
              If Test connection fails, create a new Gemini API key in AI Studio (Get API key →
              Gemini API). Revoked or non-API credentials are rejected — the server sends the key as
              x-goog-api-key, not OAuth Bearer.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="AIza… or AQ.… (Google AI Studio)"
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
            {showOfflineDemo && !geminiDevStub ? (
              <PrimaryButton
                label={saving ? "…" : "Use offline demo mode"}
                onPress={() => void onEnableOfflineDemo()}
                disabled={saving || testing}
                variant="secondary"
              />
            ) : null}
          </>
        )}
      </Card>

      <Text style={styles.sectionLabel}>Data on this server</Text>
      <Card style={styles.row}>
        <View style={styles.rowText}>
          <Text style={typography.body}>Delete local data</Text>
          <Text style={typography.caption}>
            Clears todos and research markdown. Installed tasks in SQLite are kept.
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
  statusDemo: {
    color: colors.text,
    backgroundColor: `${colors.textSecondary}33`,
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
