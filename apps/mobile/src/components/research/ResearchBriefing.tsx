import { Platform, StyleSheet, Text, View } from "react-native";
import Markdown from "react-native-markdown-display";
import { researchBriefingTheme } from "./researchBriefingTheme";
import { colors, spacing } from "../../theme";

type Props = {
  markdown: string;
};

function WebMarkdown({ markdown }: Props) {
  if (Platform.OS !== "web") return null;
  const ReactMarkdown = require("react-markdown").default;
  const remarkGfm = require("remark-gfm").default;
  return (
    <View style={styles.webWrap}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </View>
  );
}

export function ResearchBriefing({ markdown }: Props) {
  const trimmed = markdown.trim();
  if (!trimmed) return null;

  if (Platform.OS === "web") {
    return <WebMarkdown markdown={trimmed} />;
  }

  return (
    <View style={styles.nativeWrap}>
      <Markdown style={researchBriefingTheme}>{trimmed}</Markdown>
    </View>
  );
}

export function ResearchBriefingFallback({ markdown }: Props) {
  return <Text style={styles.fallback}>{markdown.trim()}</Text>;
}

const styles = StyleSheet.create({
  nativeWrap: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: spacing.sm,
    marginVertical: spacing.xs,
  },
  webWrap: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: spacing.sm,
    marginVertical: spacing.xs,
    maxWidth: 720,
  },
  fallback: {
    color: colors.text,
    lineHeight: 22,
  },
});
