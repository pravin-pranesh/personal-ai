import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SmileyMascot } from "./SmileyMascot";
import { colors, spacing, typography } from "../theme";

export type MascotCue = {
  message: string;
  reason?: string;
};

type MascotContextValue = {
  speakCue: (cue: MascotCue) => void;
  dismiss: () => void;
  active: MascotCue | null;
};

const MascotContext = createContext<MascotContextValue | null>(null);

export function MascotOverlayProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<MascotCue | null>(null);

  const speakCue = useCallback((cue: MascotCue) => {
    setActive(cue);
  }, []);

  const dismiss = useCallback(() => setActive(null), []);

  const value = useMemo(
    () => ({ speakCue, dismiss, active }),
    [speakCue, dismiss, active],
  );

  return (
    <MascotContext.Provider value={value}>
      {children}
      <Modal visible={active !== null} transparent animationType="slide">
        <Pressable style={styles.backdrop} onPress={dismiss}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            {active ? (
              <>
                <SmileyMascot message={active.message} autoSpeak />
                {active.reason ? (
                  <Text style={styles.reason}>{active.reason}</Text>
                ) : null}
                <Pressable onPress={dismiss} style={styles.dismissBtn}>
                  <Text style={styles.dismissText}>Got it</Text>
                </Pressable>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </MascotContext.Provider>
  );
}

export function useMascotOverlay(): MascotContextValue {
  const ctx = useContext(MascotContext);
  if (!ctx) {
    throw new Error("useMascotOverlay must be used within MascotOverlayProvider");
  }
  return ctx;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
  },
  reason: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
  },
  dismissBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: 999,
  },
  dismissText: { color: "#fff", fontWeight: "700" },
});
