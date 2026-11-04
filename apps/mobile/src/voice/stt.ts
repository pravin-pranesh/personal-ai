import { Platform } from "react-native";

export type SttResult = { text: string };

export type SttSession = {
  stop: () => void;
};

export async function startSpeechToText(
  onResult: (result: SttResult) => void,
  onError: (message: string) => void,
): Promise<SttSession | null> {
  if (Platform.OS === "web") {
    const W = globalThis as typeof globalThis & {
      webkitSpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        onresult: (ev: { results: { 0: { 0: { transcript: string } } } }) => void;
        onerror: () => void;
        start: () => void;
        stop: () => void;
      };
    };
    const SR = W.webkitSpeechRecognition;
    if (!SR) {
      onError("Speech recognition not supported in this browser.");
      return null;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.onresult = (ev) => {
      const text = ev.results[0][0].transcript;
      if (text?.trim()) onResult({ text: text.trim() });
    };
    rec.onerror = () => onError("Speech recognition failed.");
    rec.start();
    return { stop: () => rec.stop() };
  }

  try {
    const Voice = require("@react-native-voice/voice").default;
    Voice.onSpeechResults = (e: { value?: string[] }) => {
      const text = e.value?.[0];
      if (text?.trim()) onResult({ text: text.trim() });
    };
    Voice.onSpeechError = () => onError("Mic speech failed — use text command.");
    await Voice.start("en-US");
    return {
      stop: () => {
        void Voice.stop();
        void Voice.destroy();
      },
    };
  } catch {
    onError("Voice module unavailable — use Expo dev build or type a command.");
    return null;
  }
}
