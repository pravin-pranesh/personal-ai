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
import { clearLocalDailyData, fetchSettings, updateSettings } from "../../src/api/client";
import { Card } from "../../src/components/ui/Card";
import { PrimaryButton } from "../../src/components/ui/PrimaryButton";
import { notifyDailyDataCleared } from "../../src/lib/dailyDataRefresh";
import { colors, spacing, typography } from "../../src/theme";

const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";

export default function SettingsScreen() {
  const [clearing, setClearing] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [geminiConfigured, setGeminiConfigured] = useState(false);
  const [keyPreview, setKeyPreview] = useState<string | undefined>();
  const [model, setModel] = useState(DEFAULT_GEMINI_MODEL);
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const data = await fetchSettings();
      setGeminiConfigured(data.geminiConfigured);
      setKeyPreview(data.geminiKeyPreview);
      setModel(data.geminiModel?.trim() || DEFAULT_GEMINI_MODEL);
    } catch {
      setGeminiConfigured(false);
      setKeyPreview(undefined);
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const onSaveAi = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const body: { geminiModel: string; geminiApiKey?: string } = {
        geminiModel: model.trim() || DEFAULT_GEMINI_MODEL,
      };
      if (apiKeyDraft.length > 0) {
        body.geminiApiKey = apiKeyDraft;
      }
      const data = await updateSettings(body);
      setGeminiConfigured(data.geminiConfigured);
      setKeyPreview(data.geminiKeyPreview);
      setModel(data.geminiModel?.trim() || DEFAULT_GEMINI_MODEL);
      setApiKeyDraft("");
      Alert.alert("Saved", "AI connection settings updated on this server.");
    } catch {
      Alert.alert("Save failed", "Check that the server is running and try again.");
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
            .then((data) => {
              setGeminiConfigured(data.geminiConfigured);
              setKeyPreview(data.geminiKeyPreview);
              setApiKeyDraft("");
              Alert.alert("Removed", "Gemini key cleared on this server.");
            })
            .catch(() => {
              Alert.alert("Could not remove key", "Try again when the server is reachable.");
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
                  geminiConfigured ? styles.statusConnected : styles.statusOff,
                ]}
              >
                {geminiConfigured ? "Connected" : "Not connected"}
              </Text>
            </View>
            {keyPreview ? (
              <Text style={typography.caption}>Key on server: {keyPreview}</Text>
            ) : null}
            <Text style={typography.caption}>
              Paste an API key from Google AI Studio. Keys stay on your server — never in the
              mobile bundle.
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
                disabled={saving}
                style={styles.saveBtn}
              />
              {geminiConfigured ? (
                <Pressable
                  onPress={onRemoveGeminiKey}
                  disabled={saving}
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
