import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { colors, spacing, typography } from "../../theme";

type Props = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  style?: ViewStyle;
  disabled?: boolean;
};

export function PrimaryButton({
  label,
  onPress,
  variant = "primary",
  style,
  disabled,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variant === "primary" && styles.primary,
        variant === "secondary" && styles.secondary,
        variant === "danger" && styles.danger,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text
        style={[
          typography.subtitle,
          styles.label,
          variant === "secondary" && styles.secondaryLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    alignItems: "center",
  },
  primary: { backgroundColor: colors.primary },
  secondary: {
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  danger: { backgroundColor: colors.danger },
  label: { color: "#FFFFFF", fontSize: 15 },
  secondaryLabel: { color: colors.primary },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.5 },
});
