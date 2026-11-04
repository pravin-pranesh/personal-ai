import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Link, useRouter } from "expo-router";
import type { DashboardPayload } from "@personal-ai/shared";
import { fetchDashboard, fetchHealth } from "../../src/api/client";
import { AssistantCharacter } from "../../src/components/AssistantCharacter";
import { TaskCard } from "../../src/components/dashboard/TaskCard";
import { OfflineBanner } from "../../src/components/ui/OfflineBanner";
import { PrimaryButton } from "../../src/components/ui/PrimaryButton";
import { Card } from "../../src/components/ui/Card";
import { sampleDashboardFallback } from "../../src/data/sampleDashboard";
import { colors, spacing, typography } from "../../src/theme";

export default function HomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [data, setData] = useState<DashboardPayload | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const online = await fetchHealth();
    setOffline(!online);
    if (!online) {
      setData(null);
      setLoading(false);
      return;
    }
    try {
      const dash = await fetchDashboard();
      setData(dash);
    } catch {
      setOffline(true);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const recentlyExecuted =
    data?.recentlyExecuted?.length
      ? data.recentlyExecuted
      : sampleDashboardFallback.recentlyExecuted;
  const recentResults =
    data?.recentResults?.length
      ? data.recentResults
      : sampleDashboardFallback.recentResults;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const welcome = data?.welcome ?? {
    greeting: "Welcome",
    subtitle: "Start the API to load your personalized dashboard.",
  };
  const assistantMessage = `${welcome.greeting}! ${welcome.subtitle}`;
  const featured = data?.featured ?? [];
  const favourites = data?.favourites ?? [];
  const categories = data?.categories ?? [];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {offline ? <OfflineBanner /> : null}

      <AssistantCharacter message={assistantMessage} />

      <Text style={typography.title}>{welcome.greeting}</Text>
      <Text style={styles.subtitle}>{welcome.subtitle}</Text>

      {data ? (
        <Text style={styles.stats}>
          {data.stats.installedCount} installed · {data.stats.favoriteCount}{" "}
          favourites
        </Text>
      ) : null}

      <Section title="Featured tasks">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {featured.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onPress={() => router.push(`/task/${task.id}`)}
            />
          ))}
        </ScrollView>
      </Section>

      <Section title="Recently executed">
        {recentlyExecuted.map((row) => (
          <Card key={row.id} style={styles.listRow}>
            <Text style={styles.rowIcon}>{row.icon}</Text>
            <View style={styles.rowBody}>
              <Text style={typography.subtitle}>{row.taskName}</Text>
              <Text style={typography.caption}>
                {new Date(row.completedAt).toLocaleString()}
              </Text>
            </View>
          </Card>
        ))}
      </Section>

      <Section title="Favourites">
        <View style={styles.chipRow}>
          {favourites.length === 0 ? (
            <Text style={typography.caption}>No favourites yet — star tasks in the store.</Text>
          ) : (
            favourites.map((f) => (
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
          )}
        </View>
      </Section>

      <Section title="Popular categories">
        <View style={styles.grid}>
          {categories.map((c) => (
            <Link key={c.id} href={{ pathname: "/store", params: { category: c.id } }} asChild>
              <Pressable style={styles.categoryTile}>
                <Text style={typography.subtitle}>{c.label}</Text>
                <Text style={typography.caption}>{c.taskCount} tasks</Text>
              </Pressable>
            </Link>
          ))}
        </View>
      </Section>

      <PrimaryButton
        label="Quick run (Stage 4)"
        onPress={() =>
          Alert.alert(
            "Coming in Stage 4",
            "Execution engine and run UI are not wired yet.",
          )
        }
        style={{ marginTop: spacing.md }}
      />

      <Section title="Recent research results">
        {recentResults.map((r) => (
          <Card key={r.id} style={styles.resultCard}>
            <Text style={typography.subtitle}>{r.title}</Text>
            <Text style={typography.caption}>{r.taskName}</Text>
            <Text style={typography.body}>{r.preview}</Text>
          </Card>
        ))}
      </Section>
    </ScrollView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
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
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: 4 },
  stats: { ...typography.caption, marginTop: spacing.sm, marginBottom: spacing.md },
  section: { marginTop: spacing.lg },
  sectionTitle: { ...typography.subtitle, marginBottom: spacing.sm },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  rowIcon: { fontSize: 24 },
  rowBody: { flex: 1 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 999,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  categoryTile: {
    width: "47%",
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultCard: { marginBottom: spacing.sm, gap: 4 },
});
