import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import type { ResearchNewsCard } from "@personal-ai/shared";
import { colors, spacing, typography } from "../../theme";

type Props = {
  card: ResearchNewsCard;
};

function formatWhen(iso?: string): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

export function NewsCard({ card }: Props) {
  const when = formatWhen(card.publishedAt);

  const openUrl = () => {
    if (card.url) {
      void Linking.openURL(card.url);
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={card.url ? openUrl : undefined}
    >
      <Text style={styles.title} numberOfLines={3}>
        {card.title}
      </Text>
      <Text style={styles.snippet} numberOfLines={4}>
        {card.snippet}
      </Text>
      <View style={styles.metaRow}>
        <Text style={styles.source}>{card.source}</Text>
        {when ? <Text style={styles.when}>{when}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    gap: spacing.xs,
  },
  cardPressed: {
    opacity: 0.92,
  },
  title: {
    ...typography.body,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 22,
  },
  snippet: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  source: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
    flex: 1,
  },
  when: {
    fontSize: 11,
    color: colors.textSecondary,
  },
});
