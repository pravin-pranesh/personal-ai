import { Pressable, StyleSheet, Text, View } from "react-native";
import type { TaskDefinitionSummary } from "@personal-ai/shared";
import { colors, spacing, typography } from "../../theme";

type Props = {
  task: TaskDefinitionSummary;
  onPress?: () => void;
  compact?: boolean;
};

export function TaskCard({ task, onPress, compact }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        compact && styles.compact,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.icon}>{task.icon}</Text>
      <View style={styles.body}>
        <Text style={typography.subtitle} numberOfLines={1}>
          {task.name}
        </Text>
        {!compact && (
          <Text style={typography.caption} numberOfLines={2}>
            {task.description}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.md,
    width: 220,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  compact: { width: 160, padding: spacing.sm },
  icon: { fontSize: 28, marginBottom: spacing.sm },
  body: { gap: 4 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
});
