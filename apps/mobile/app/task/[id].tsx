import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import type { TaskDetail } from "@personal-ai/shared";
import {
  favoriteTask,
  fetchTask,
  installTask,
  unfavoriteTask,
  uninstallTask,
} from "../../src/api/client";
import { PrimaryButton } from "../../src/components/ui/PrimaryButton";
import { Card } from "../../src/components/ui/Card";
import { OfflineBanner } from "../../src/components/ui/OfflineBanner";
import { colors, spacing, typography } from "../../src/theme";

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(false);
    try {
      setTask(await fetchTask(id));
    } catch {
      setError(true);
      setTask(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const runInstall = async () => {
    if (!task) return;
    setBusy(true);
    try {
      const res = await installTask(task.id);
      setTask(res.task);
    } finally {
      setBusy(false);
    }
  };

  const runUninstall = async () => {
    if (!task) return;
    setBusy(true);
    try {
      await uninstallTask(task.id);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const toggleFavorite = async () => {
    if (!task) return;
    setBusy(true);
    try {
      if (task.isFavorite) {
        await unfavoriteTask(task.id);
        await load();
      } else {
        const res = await favoriteTask(task.id);
        setTask(res.task);
      }
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.center}>
        {error ? <OfflineBanner /> : null}
        <Text style={typography.body}>Task not found or API unavailable.</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: task.name }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {error ? <OfflineBanner /> : null}
        <Text style={styles.icon}>{task.icon}</Text>
        <Text style={typography.title}>{task.name}</Text>
        <Text style={styles.meta}>{task.category}</Text>
        <Text style={typography.body}>{task.description}</Text>

        <Card style={styles.block}>
          <Text style={typography.subtitle}>Features</Text>
          {task.features.map((f) => (
            <Text key={f} style={typography.body}>
              • {f}
            </Text>
          ))}
        </Card>

        <Card style={styles.block}>
          <Text style={typography.subtitle}>Required inputs</Text>
          {task.requiredInputs.map((input) => (
            <Text key={input.key} style={typography.body}>
              {input.label} ({input.type})
              {input.required ? " *" : ""}
            </Text>
          ))}
        </Card>

        <View style={styles.actions}>
          {task.isInstalled ? (
            <PrimaryButton
              label="Uninstall"
              variant="secondary"
              onPress={() => void runUninstall()}
              disabled={busy}
            />
          ) : (
            <PrimaryButton
              label="Install"
              onPress={() => void runInstall()}
              disabled={busy}
            />
          )}
          <PrimaryButton
            label={task.isFavorite ? "Remove favourite" : "Add favourite"}
            variant="secondary"
            onPress={() => void toggleFavorite()}
            disabled={busy}
          />
          <PrimaryButton
            label="Run task"
            onPress={() =>
              Alert.alert(
                "Stage 4",
                "Execution engine and run UI arrive in the next stage.",
              )
            }
            disabled={!task.isInstalled}
          />
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  icon: { fontSize: 48, marginBottom: spacing.sm },
  meta: {
    ...typography.caption,
    textTransform: "capitalize",
    marginBottom: spacing.sm,
  },
  block: { marginTop: spacing.md, gap: spacing.xs },
  actions: { marginTop: spacing.lg, gap: spacing.sm },
});
