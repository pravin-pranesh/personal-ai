import { TextStyle } from "react-native";
import { colors } from "./colors";

export const typography: Record<string, TextStyle> = {
  title: { fontSize: 28, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 16, fontWeight: "600", color: colors.text },
  body: { fontSize: 15, color: colors.text, lineHeight: 22 },
  caption: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
};
