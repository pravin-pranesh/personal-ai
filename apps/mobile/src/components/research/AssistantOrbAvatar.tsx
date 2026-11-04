import { StyleSheet, View } from "react-native";
import { colors } from "../../theme";

type Props = {
  size?: number;
  active?: boolean;
};

/** Small mascot cue — primary orb gradient without Lottie. */
export function AssistantOrbAvatar({ size = 32, active = false }: Props) {
  const ring = active ? colors.primary : colors.border;
  return (
    <View
      style={[
        styles.outer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: ring,
        },
      ]}
    >
      <View
        style={[
          styles.core,
          {
            width: size * 0.72,
            height: size * 0.72,
            borderRadius: (size * 0.72) / 2,
          },
        ]}
      />
      <View style={[styles.highlight, { width: size * 0.22, height: size * 0.22 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    backgroundColor: colors.primaryMuted,
  },
  core: {
    backgroundColor: colors.primary,
    opacity: 0.92,
  },
  highlight: {
    position: "absolute",
    top: "18%",
    left: "22%",
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    opacity: 0.45,
  },
});
