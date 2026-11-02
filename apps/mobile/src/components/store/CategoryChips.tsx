import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { STORE_CATEGORIES } from "@personal-ai/shared";
import { colors, spacing, typography } from "../../theme";

type Props = {
  selected: string;
  onSelect: (id: string) => void;
};

const ALL = "all";

export function CategoryChips({ selected, onSelect }: Props) {
  const items = [{ id: ALL, label: "All" }, ...STORE_CATEGORIES];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {items.map((item) => {
        const active = selected === item.id;
        return (
          <Pressable
            key={item.id}
            onPress={() => onSelect(item.id)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text
              style={[
                typography.caption,
                styles.chipText,
                active && styles.chipTextActive,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingVertical: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontWeight: "600" },
  chipTextActive: { color: "#FFFFFF" },
});
