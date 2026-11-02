import { PropsWithChildren } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { colors, spacing } from "../../theme";

type Props = PropsWithChildren<{ style?: ViewStyle }>;

export function Card({ children, style }: Props) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.md,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});
