import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { WebView } from "react-native-webview";
import { colors, spacing, typography } from "../../src/theme";

export default function InAppMapScreen() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  const query = typeof q === "string" ? q : "";
  const osm = `https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}`;
  const uri = query ? osm : osm;

  return (
    <View style={styles.flex}>
      <Stack.Screen options={{ title: "Map", headerShown: true }} />
      <WebView source={{ uri }} style={styles.flex} />
      <View style={styles.footer}>
        <Pressable
          style={styles.secondaryBtn}
          onPress={() =>
            void Linking.openURL(
              `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
            )
          }
        >
          <Text style={styles.secondaryText}>Open in Google Maps</Text>
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
