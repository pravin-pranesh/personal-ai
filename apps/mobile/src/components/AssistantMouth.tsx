import { StyleSheet, View } from "react-native";
import type { Viseme } from "./assistant/visemeSchedule";

type Props = {
  viseme: Viseme;
};

export function AssistantMouth({ viseme }: Props) {
  return (
    <View style={styles.anchor} pointerEvents="none">
      <View style={[styles.mouth, mouthShape[viseme]]} />
    </View>
  );
}

const mouthShape = StyleSheet.create({
  closed: {
    width: 22,
    height: 4,
    borderRadius: 2,
    marginTop: 10,
  },
  wide: {
    width: 28,
    height: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  narrow: {
    width: 12,
    height: 14,
    borderRadius: 8,
    marginTop: 4,
  },
  open: {
    width: 18,
    height: 20,
    borderRadius: 10,
    marginTop: 2,
  },
});

const styles = StyleSheet.create({
  anchor: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 52,
  },
  mouth: {
    backgroundColor: "#1E3A8A",
  },
});
