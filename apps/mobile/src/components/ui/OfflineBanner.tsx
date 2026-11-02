import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "../../theme";

export function OfflineBanner() {
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        API offline — showing sample runs/results. Start the server on port 3001.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.warningBg,
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  text: { ...typography.caption, color: colors.warningText },
});
