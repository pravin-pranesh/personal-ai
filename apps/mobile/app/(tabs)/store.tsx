import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { TaskDefinitionSummary } from "@personal-ai/shared";
import { fetchTasks } from "../../src/api/client";
import { CategoryChips } from "../../src/components/store/CategoryChips";
import { OfflineBanner } from "../../src/components/ui/OfflineBanner";
import { colors, spacing, typography } from "../../src/theme";

export default function StoreScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string }>();
  const [category, setCategory] = useState(params.category ?? "all");
  const [query, setQuery] = useState("");
  const [tasks, setTasks] = useState<TaskDefinitionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetchTasks({ category, q: query });
      setTasks(res.tasks);
    } catch {
      setError(true);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [category, query]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (params.category) setCategory(params.category);
  }, [params.category]);

  return (
    <View style={styles.screen}>
      {error ? <OfflineBanner /> : null}
      <View style={styles.searchWrap}>
        <TextInput
          placeholder="Search tasks…"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => void load()}
          style={styles.search}
          placeholderTextColor={colors.textSecondary}
        />
      </View>
      <CategoryChips selected={category} onSelect={setCategory} />
      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.lg }} color={colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {tasks.map((task) => (
            <Pressable
              key={task.id}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              onPress={() => router.push(`/task/${task.id}`)}
            >
              <Text style={styles.icon}>{task.icon}</Text>
              <View style={styles.rowBody}>
                <Text style={typography.subtitle}>{task.name}</Text>
                <Text style={typography.caption} numberOfLines={2}>
                  {task.description}
                </Text>
              </View>
            </Pressable>
          ))}
          {tasks.length === 0 && !error ? (
            <Text style={typography.caption}>No tasks match your filters.</Text>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  searchWrap: { marginBottom: spacing.sm },
  search: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
    color: colors.text,
  },
  list: { paddingBottom: spacing.xl, gap: spacing.sm },
  row: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  icon: { fontSize: 32 },
  rowBody: { flex: 1, gap: 4 },
  pressed: { opacity: 0.92 },
});
