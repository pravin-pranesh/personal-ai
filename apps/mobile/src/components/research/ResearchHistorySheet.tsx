import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { ResearchSessionSummary } from "@personal-ai/shared";
import { colors, spacing, typography } from "../../theme";

type Props = {
  visible: boolean;
  loading: boolean;
  sessions: ResearchSessionSummary[];
  onClose: () => void;
  onSelect: (id: string) => void;
};

function formatSessionDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function previewPrompt(prompt: string): string {
  const t = prompt.trim();
  if (t.length <= 72) return t;
  return `${t.slice(0, 69)}…`;
}

export function ResearchHistorySheet({
  visible,
  loading,
  sessions,
  onClose,
  onSelect,
}: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>History</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close history">
              <Text style={styles.close}>Done</Text>
            </Pressable>
          </View>
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : sessions.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.emptyTitle}>No saved research yet</Text>
              <Text style={styles.emptyHint}>
                Ask a question in the composer. Each chat thread is saved here for replay.
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.list}>
              {sessions.map((session) => (
                <Pressable
                  key={session.id}
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  onPress={() => onSelect(session.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open research from ${previewPrompt(session.prompt)}`}
                >
                  <Text style={styles.prompt} numberOfLines={2}>
                    {previewPrompt(session.prompt)}
                  </Text>
                  <Text style={styles.date}>{formatSessionDate(session.updatedAt)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "72%",
    backgroundColor: colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.subtitle,
  },
  close: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 16,
  },
  centered: {
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.subtitle,
    textAlign: "center",
  },
  emptyHint: {
    ...typography.caption,
    textAlign: "center",
    color: colors.textSecondary,
    maxWidth: 320,
    lineHeight: 20,
  },
  list: {
    padding: spacing.sm,
    gap: spacing.xs,
  },
  row: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  rowPressed: {
    opacity: 0.85,
  },
  prompt: {
    ...typography.body,
    fontWeight: "600",
  },
  date: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
