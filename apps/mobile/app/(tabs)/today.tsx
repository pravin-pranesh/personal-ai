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
import type { DailyTodo } from "@personal-ai/shared";
import {
  createDailyTodo,
  deleteDailyTodo,
  fetchDailyTodos,
  updateDailyTodo,
} from "../../src/api/client";
import { subscribeDailyDataCleared } from "../../src/lib/dailyDataRefresh";
import { OfflineBanner } from "../../src/components/ui/OfflineBanner";
import { Card } from "../../src/components/ui/Card";
import { PrimaryButton } from "../../src/components/ui/PrimaryButton";
import { colors, spacing, typography } from "../../src/theme";

export default function TodayScreen() {
  const [items, setItems] = useState<DailyTodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchDailyTodos();
      setItems(data.items);
    } catch {
      setError(true);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => subscribeDailyDataCleared(() => void load()), [load]);

  const onAdd = async () => {
    const title = draft.trim();
    if (!title || adding) return;
    setAdding(true);
    try {
      const item = await createDailyTodo(title);
      setItems((prev) => [item, ...prev]);
      setDraft("");
    } catch {
      Alert.alert("Could not add todo", "Check that the server is running.");
    } finally {
      setAdding(false);
    }
  };

  const onToggle = (todo: DailyTodo) => {
    void updateDailyTodo(todo.id, { done: !todo.done })
      .then((updated) => {
        setItems((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      })
      .catch(() => {
        Alert.alert("Update failed", "Try again when back online.");
      });
  };

  const onDelete = (todo: DailyTodo) => {
    Alert.alert("Delete todo?", todo.title, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void deleteDailyTodo(todo.id)
            .then(() => setItems((prev) => prev.filter((t) => t.id !== todo.id)))
            .catch(() => Alert.alert("Delete failed", "Try again."));
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

  const openCount = items.filter((t) => !t.done).length;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {error ? <OfflineBanner /> : null}

      <Text style={typography.subtitle}>
        {openCount === 0 ? "All clear for today" : `${openCount} open for today`}
      </Text>

      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder="Add a todo…"
          placeholderTextColor={colors.textSecondary}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={() => void onAdd()}
          returnKeyType="done"
          editable={!adding}
        />
        <PrimaryButton
          label={adding ? "…" : "Add"}
          onPress={() => void onAdd()}
          disabled={!draft.trim() || adding}
          style={styles.addBtn}
        />
      </View>

      {items.length ? (
        items.map((todo) => (
          <Card key={todo.id} style={styles.row}>
            <Pressable style={styles.toggle} onPress={() => onToggle(todo)}>
              <View style={[styles.checkbox, todo.done && styles.checkboxDone]}>
                {todo.done ? <Text style={styles.checkMark}>✓</Text> : null}
              </View>
              <Text style={[styles.title, todo.done && styles.titleDone]}>{todo.title}</Text>
            </Pressable>
            <Pressable
              style={styles.deleteBtn}
              onPress={() => onDelete(todo)}
              accessibilityLabel="Delete todo"
            >
              <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
          </Card>
        ))
      ) : (
        <Text style={typography.caption}>No todos yet — add one above.</Text>
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  toggle: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxDone: { backgroundColor: colors.primary },
  checkMark: { color: "#fff", fontWeight: "700", fontSize: 14 },
  title: { ...typography.body, flex: 1 },
  titleDone: { textDecorationLine: "line-through", color: colors.textSecondary },
  deleteBtn: { paddingVertical: spacing.xs, paddingHorizontal: spacing.xs },
  deleteText: { color: colors.danger, fontSize: 14, fontWeight: "600" },
});
