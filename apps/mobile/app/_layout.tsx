import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="in-app/search" options={{ headerShown: true, title: "Search" }} />
        <Stack.Screen name="in-app/map" options={{ headerShown: true, title: "Map" }} />
      </Stack>
    </>
  );
}
