import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Alert, Platform } from "react-native";
import { fetchSettings } from "../api/client";
import {
  speakAssistantMessage,
  stopAssistantSpeech,
} from "../components/assistant/assistantSpeech";
import { visemeAtCharIndex } from "../components/assistant/visemeSchedule";
import { startSpeechToText } from "../voice/stt";
import {
  addOverlayListenListener,
  disableOverlayAssistant,
  enableOverlayAssistant,
  type OverlayRuntimeMode,
} from "./overlayController";
import { greetingForAssistant, handleOverlayUtterance } from "./overlayVoice";
import { ScreenAssistantBubble } from "./ScreenAssistantBubble";

type OverlayContextValue = {
  runtimeMode: OverlayRuntimeMode;
  overlayEnabled: boolean;
  refreshOverlayFromSettings: () => Promise<void>;
  speakOnOverlay: (message: string) => void;
};

const OverlayContext = createContext<OverlayContextValue | null>(null);

export function OverlayAssistantProvider({ children }: { children: ReactNode }) {
  const [runtimeMode, setRuntimeMode] = useState<OverlayRuntimeMode>("off");
  const [overlayEnabled, setOverlayEnabled] = useState(false);
  const [assistantName, setAssistantName] = useState("Assistant");
  const [use3d, setUse3d] = useState(true);
  const [mouthOpen, setMouthOpen] = useState(0);
  const [listening, setListening] = useState(false);
  const [lastReply, setLastReply] = useState<string | null>(null);
  const sttRef = useRef<{ stop: () => void } | null>(null);

  const speakOnOverlay = useCallback((message: string) => {
    stopAssistantSpeech();
    speakAssistantMessage(message, {
      onStart: () => setMouthOpen(0.35),
      onBoundary: (idx) => {
        const viseme = visemeAtCharIndex(message, idx);
        setMouthOpen(viseme === "closed" ? 0.05 : 0.55);
      },
      onDone: () => setMouthOpen(0),
      onStopped: () => setMouthOpen(0),
      onError: () => setMouthOpen(0),
    });
  }, []);

  const refreshOverlayFromSettings = useCallback(async () => {
    const settings = await fetchSettings();
    setAssistantName(settings.assistantName?.trim() || "Assistant");
    setUse3d(settings.overlayUse3dAvatar !== false);
    setOverlayEnabled(settings.overlayAssistantEnabled === true);

    if (!settings.overlayAssistantEnabled) {
      await disableOverlayAssistant();
      setRuntimeMode("off");
      return;
    }

    const result = await enableOverlayAssistant(settings.assistantName || "Assistant");
    setRuntimeMode(result.mode);
    if (result.needsPermission && Platform.OS === "android") {
      speakOnOverlay(greetingForAssistant(settings.assistantName));
    }
  }, [speakOnOverlay]);

  useEffect(() => {
    void refreshOverlayFromSettings();
  }, [refreshOverlayFromSettings]);

  const onListenPress = useCallback(
    async (pushToTalk: boolean) => {
      if (listening) return;
      setListening(true);
      if (!pushToTalk) {
        speakOnOverlay(`Yes?`);
      }
      const session = await startSpeechToText(
        async (result) => {
          setListening(false);
          sttRef.current = null;
          try {
            const reply = await handleOverlayUtterance(result.text, assistantName, {
              pushToTalk,
            });
            setLastReply(reply);
            speakOnOverlay(reply);
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Command failed.";
            setLastReply(msg);
            speakOnOverlay(msg);
          }
        },
        (message) => {
          setListening(false);
          sttRef.current = null;
          Alert.alert("Mic", message);
        },
      );
      if (!session) {
        setListening(false);
        return;
      }
      sttRef.current = session;
    },
    [assistantName, listening, speakOnOverlay],
  );

  const listenRef = useRef(onListenPress);
  listenRef.current = onListenPress;

  useEffect(() => {
    const sub = addOverlayListenListener(() => {
      void listenRef.current(true);
    });
    return () => sub?.remove();
  }, []);

  useEffect(
    () => () => {
      sttRef.current?.stop();
      stopAssistantSpeech();
    },
    [],
  );

  const value = useMemo(
    () => ({ runtimeMode, overlayEnabled, refreshOverlayFromSettings, speakOnOverlay }),
    [runtimeMode, overlayEnabled, refreshOverlayFromSettings, speakOnOverlay],
  );

  const showInAppBubble = overlayEnabled && runtimeMode === "in-app";

  return (
    <OverlayContext.Provider value={value}>
      {children}
      {showInAppBubble ? (
        <ScreenAssistantBubble
          assistantName={assistantName}
          use3d={use3d}
          mouthOpen={mouthOpen}
          listening={listening}
          onListenPress={onListenPress}
          lastReply={lastReply}
        />
      ) : null}
    </OverlayContext.Provider>
  );
}

export function useOverlayAssistant(): OverlayContextValue {
  const ctx = useContext(OverlayContext);
  if (!ctx) {
    throw new Error("useOverlayAssistant must be used within OverlayAssistantProvider");
  }
  return ctx;
}
