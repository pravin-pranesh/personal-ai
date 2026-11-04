import { StyleSheet, Text, View } from "react-native";
import type { ResearchSource } from "@personal-ai/shared";
import { colors, spacing, typography } from "../../theme";

const LABELS: Record<ResearchSource, string> = {
  wikipedia: "Wikipedia",
  gemini: "Gemini",
  kimi: "Kimi",
  stub: "Demo",
};

type Props = {
  sources: ResearchSource[];
};

export function ResearchSourceChips({ sources }: Props) {
  const unique = [...new Set(sources)].filter((s) => LABELS[s]);
  if (unique.length === 0) return null;

  return (
    <View style={styles.row} accessibilityRole="text" accessibilityLabel={`Sources: ${unique.map((s) => LABELS[s]).join(", ")}`}>
      {unique.map((source) => (
        <View key={source} style={styles.chip}>
          <Text style={styles.chipText}>{LABELS[source]}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  chip: {
    backgroundColor: `${colors.primary}18`,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: `${colors.primary}44`,
  },
  chipText: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.primary,
    fontSize: 12,
  },
});
