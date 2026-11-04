import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "../../theme";

type Block =
  | { kind: "heading"; text: string }
  | { kind: "bullet"; text: string }
  | { kind: "paragraph"; text: string };

function parseBriefingMarkdown(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = text.split(/\r?\n/);

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      blocks.push({ kind: "heading", text: h3[1].trim() });
      continue;
    }

    const bullet = line.match(/^[-*•]\s+(.+)$/);
    if (bullet) {
      blocks.push({ kind: "bullet", text: bullet[1].trim() });
      continue;
    }

    blocks.push({ kind: "paragraph", text: line });
  }

  return blocks;
}

function renderInline(text: string, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g);
  return parts.map((part, i) => {
    const bold = part.match(/^\*\*(.+)\*\*$/);
    if (bold) {
      return (
        <Text key={`${keyPrefix}-b-${i}`} style={styles.bold}>
          {bold[1]}
        </Text>
      );
    }
    const italic = part.match(/^_(.+)_$/);
    if (italic) {
      return (
        <Text key={`${keyPrefix}-i-${i}`} style={styles.italic}>
          {italic[1]}
        </Text>
      );
    }
    return part;
  });
}

type Props = {
  text: string;
};

export function ResearchBriefingText({ text }: Props) {
  const blocks = parseBriefingMarkdown(text);

  return (
    <View style={styles.wrap}>
      {blocks.map((block, i) => {
        if (block.kind === "heading") {
          return (
            <Text
              key={`h-${i}`}
              style={[styles.body, styles.sectionHeading, i > 0 && styles.sectionHeadingSpaced]}
            >
              {block.text}
            </Text>
          );
        }
        if (block.kind === "bullet") {
          return (
            <View key={`u-${i}`} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.body}>{renderInline(block.text, `u-${i}`)}</Text>
            </View>
          );
        }
        return (
          <Text key={`p-${i}`} style={styles.body}>
            {renderInline(block.text, `p-${i}`)}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  body: {
    ...typography.body,
    color: colors.text,
    lineHeight: 22,
    flex: 1,
    flexShrink: 1,
  },
  sectionHeading: {
    fontWeight: "700",
    color: colors.text,
  },
  sectionHeadingSpaced: {
    marginTop: spacing.sm,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
    paddingLeft: spacing.xs,
  },
  bulletDot: {
    ...typography.body,
    lineHeight: 22,
    color: colors.primary,
    width: 14,
  },
  bold: {
    fontWeight: "700",
  },
  italic: {
    fontStyle: "italic",
    color: colors.textSecondary,
  },
});
