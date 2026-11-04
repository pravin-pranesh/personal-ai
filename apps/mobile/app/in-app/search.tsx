import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { WebView } from "react-native-webview";
import { colors, spacing, typography } from "../../src/theme";

export default function InAppSearchScreen() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  const query = typeof q === "string" ? q : "";
  const url = `https://www.google.com/search?igu=1&q=${encodeURIComponent(query)}`;

  return (
    <View style={styles.flex}>
      <Stack.Screen options={{ title: "Search", headerShown: true }} />
      <WebView source={{ uri: url }} style={styles.flex} />
      <View style={styles.footer}>
        <Pressable
          style={styles.secondaryBtn}
          onPress={() => void Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(query)}`)}
        >
          <Text style={styles.secondaryText}>Open in Google app</Text>
        </Pressable>
        <Pressable style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={styles.closeText}>Close</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  footer: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  secondaryBtn: { flex: 1, padding: spacing.sm, alignItems: "center" },
  secondaryText: { ...typography.caption, color: colors.primary, fontWeight: "600" },
  closeBtn: { padding: spacing.sm },
  closeText: { fontWeight: "700", color: colors.text },
});
