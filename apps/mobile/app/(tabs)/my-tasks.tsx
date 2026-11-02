import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import type { InstalledPayload } from "@personal-ai/shared";
import { fetchInstalled, uninstallTask } from "../../src/api/client";
import { OfflineBanner } from "../../src/components/ui/OfflineBanner";
import { PrimaryButton } from "../../src/components/ui/PrimaryButton";
import { Card } from "../../src/components/ui/Card";
import { colors, spacing, typography } from "../../src/theme";

export default function MyTasksScreen() {
  const router = useRouter();
  const [data, setData] = useState<InstalledPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setData(await fetchInstalled());
    } catch {
      setError(true);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onUninstall = (taskId: string, name: string) => {
    Alert.alert("Uninstall task?", name, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Uninstall",
        style: "destructive",
        onPress: () => {
          void uninstallTask(taskId).then(load);
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {error ? <OfflineBanner /> : null}

      <Text style={typography.subtitle}>Installed</Text>
      {data?.installed.length ? (
        data.installed.map((row) => (
          <Card key={row.taskId} style={styles.installedRow}>
            <Pressable
              style={styles.installedMain}
              onPress={() => router.push(`/task/${row.taskId}`)}
            >
              <Text style={styles.icon}>{row.icon}</Text>
              <View>
                <Text style={typography.subtitle}>{row.name}</Text>
                <Text style={typography.caption}>
                  Installed {new Date(row.installedAt).toLocaleDateString()}
                </Text>
              </View>
            </Pressable>
            <PrimaryButton
              label="Uninstall"
              variant="danger"
              onPress={() => onUninstall(row.taskId, row.name)}
              style={styles.uninstallBtn}
            />
          </Card>
        ))
      ) : (
        <Text style={typography.caption}>No installed tasks — browse the Store tab.</Text>
      )}

      <Text style={[typography.subtitle, styles.sectionGap]}>Favourites</Text>
      <View style={styles.chipRow}>
        {data?.favorites.length ? (
          data.favorites.map((f) => (
            <Pressable
              key={f.id}
              style={styles.chip}
              onPress={() => router.push(`/task/${f.id}`)}
            >
              <Text style={typography.caption}>
                {f.icon} {f.name}
              </Text>
            </Pressable>
          ))
        ) : (
          <Text style={typography.caption}>No favourites yet.</Text>
        )}
      </View>

      <Text style={[typography.subtitle, styles.sectionGap]}>Recent runs</Text>
      <Text style={typography.caption}>Empty until Stage 4 execution engine.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  installedRow: { marginTop: spacing.sm, gap: spacing.sm },
  installedMain: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  icon: { fontSize: 28 },
  uninstallBtn: { alignSelf: "flex-start" },
  sectionGap: { marginTop: spacing.lg, marginBottom: spacing.sm },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 999,
  },
});
