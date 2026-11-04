import { Platform } from "react-native";
import * as Speech from "expo-speech";

export type AssistantSpeechHandlers = {
  onStart?: () => void;
  onBoundary?: (charIndex: number) => void;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: () => void;
};

let webUtterance: SpeechSynthesisUtterance | null = null;
let webHandlers: AssistantSpeechHandlers | null = null;

function ensureWebVoicesReady(): Promise<void> {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve();
      return;
    }

    const finish = () => {
      window.speechSynthesis.onvoiceschanged = null;
      resolve();
    };

    window.speechSynthesis.onvoiceschanged = finish;
    setTimeout(finish, 300);
  });
}

function speakWithWebSpeech(text: string, handlers: AssistantSpeechHandlers) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    handlers.onError?.();
    return;
  }

  webHandlers = handlers;
  window.speechSynthesis.cancel();

  void ensureWebVoicesReady().then(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      handlers.onError?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    webUtterance = utterance;

    utterance.onstart = () => {
      handlers.onStart?.();
    };
    utterance.onboundary = (event) => {
      handlers.onBoundary?.(event.charIndex);
    };
    utterance.onend = () => {
      webUtterance = null;
      webHandlers = null;
      handlers.onDone?.();
    };
    utterance.onerror = (event) => {
      webUtterance = null;
      webHandlers = null;
      const err = event.error?.toLowerCase?.() ?? "";
      if (err === "interrupted" || err === "canceled") {
        handlers.onStopped?.();
        return;
      }
      handlers.onError?.();
    };

    window.speechSynthesis.speak(utterance);
  });
}

function speakWithExpoSpeech(text: string, handlers: AssistantSpeechHandlers) {
  Speech.speak(text, {
    onStart: () => handlers.onStart?.(),
    onBoundary: (event: unknown) => {
      if (
        event &&
        typeof event === "object" &&
        "charIndex" in event &&
        typeof (event as { charIndex: unknown }).charIndex === "number"
      ) {
        handlers.onBoundary?.((event as { charIndex: number }).charIndex);
      }
    },
    onDone: () => handlers.onDone?.(),
    onStopped: () => handlers.onStopped?.(),
    onError: () => handlers.onError?.(),
  });
}

export function speakAssistantMessage(
  text: string,
  handlers: AssistantSpeechHandlers,
) {
  if (Platform.OS === "web") {
    speakWithWebSpeech(text, handlers);
    return;
  }
  speakWithExpoSpeech(text, handlers);
}

export function stopAssistantSpeech() {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    webUtterance = null;
    webHandlers = null;
    return;
  }
  Speech.stop();
}
