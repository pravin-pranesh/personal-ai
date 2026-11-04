import { Tabs } from "expo-router";
import { View, StyleSheet } from "react-native";
import { MascotOverlayProvider } from "../../src/mascot/MascotOverlayContext";
import { PhoneBootstrap } from "../../src/phone/PhoneBootstrap";
import { FloatingVoiceButton } from "../../src/voice/FloatingVoiceButton";
import { colors } from "../../src/theme";

export default function TabLayout() {
  return (
    <MascotOverlayProvider>
      <PhoneBootstrap />
      <View style={styles.shell}>
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { fontWeight: "700" },
        tabBarActiveTintColor: colors.primary,
        tabBarStyle: { backgroundColor: colors.card },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="today" options={{ title: "Today" }} />
      <Tabs.Screen name="daily" options={{ title: "Daily" }} />
      <Tabs.Screen name="research" options={{ title: "Research" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
      <FloatingVoiceButton />
      </View>
    </MascotOverlayProvider>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
});
