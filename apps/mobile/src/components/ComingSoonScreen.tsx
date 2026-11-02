import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "../theme";

type Props = { title: string; subtitle?: string };

export function ComingSoonScreen({ title, subtitle }: Props) {
  return (
    <View style={styles.container}>
      <Text style={typography.title}>{title}</Text>
      {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: "center",
  },
  sub: { ...typography.body, marginTop: spacing.sm, color: colors.textSecondary },
});
