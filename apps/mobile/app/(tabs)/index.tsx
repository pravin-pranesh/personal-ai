import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Link } from "expo-router";
import type { DashboardPayload } from "@personal-ai/shared";
import { fetchDashboard, fetchHealth } from "../../src/api/client";
import { isPhoneLocalMode } from "../../src/config/api";
import { AssistantCharacter } from "../../src/components/AssistantCharacter";
import { OfflineBanner } from "../../src/components/ui/OfflineBanner";
import { Card } from "../../src/components/ui/Card";
import { sampleDashboardFallback } from "../../src/data/sampleDashboard";
import { colors, spacing, typography } from "../../src/theme";

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [data, setData] = useState<DashboardPayload | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const online = await fetchHealth();
    setOffline(!online && !isPhoneLocalMode());
    if (!online && !isPhoneLocalMode()) {
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
    subtitle: "Your daily assistant — todos and research in one place.",
  };
  const assistantMessage = `${welcome.greeting}! ${welcome.subtitle}`;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {offline ? <OfflineBanner /> : null}

      <AssistantCharacter message={assistantMessage} />

      <Text style={typography.title}>{welcome.greeting}</Text>
      <Text style={styles.subtitle}>{welcome.subtitle}</Text>

      <Section title="Today">
        <Link href="/today" asChild>
          <Pressable style={styles.navTile}>
            <Text style={styles.navEmoji}>✓</Text>
            <View style={styles.navBody}>
              <Text style={typography.subtitle}>Todos</Text>
              <Text style={typography.caption}>
                Add, complete, and clear your list for the day.
              </Text>
            </View>
          </Pressable>
        </Link>
      </Section>

      <Section title="Research">
        <Link href="/research" asChild>
          <Pressable style={styles.navTile}>
            <Text style={styles.navEmoji}>🔍</Text>
            <View style={styles.navBody}>
              <Text style={typography.subtitle}>Ask anything</Text>
              <Text style={typography.caption}>
                Chat-style summaries and headline cards on any topic.
              </Text>
            </View>
          </Pressable>
        </Link>
      </Section>

      <Section title="Recent research">
        {recentResults.length === 0 ? (
          <Text style={typography.caption}>
            No research yet — open the Research tab to start.
          </Text>
        ) : (
          recentResults.map((r) => (
            <Card key={r.id} style={styles.resultCard}>
              <Text style={typography.subtitle}>{r.title}</Text>
              <Text style={typography.caption}>{r.taskName}</Text>
              <Text style={typography.body}>{r.preview}</Text>
            </Card>
          ))
        )}
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
  section: { marginTop: spacing.lg },
  sectionTitle: { ...typography.subtitle, marginBottom: spacing.sm },
  navTile: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  navEmoji: { fontSize: 28 },
  navBody: { flex: 1, gap: 4 },
  resultCard: { marginBottom: spacing.sm, gap: 4 },
});
