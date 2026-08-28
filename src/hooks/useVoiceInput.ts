import { useState } from "react";

interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: () => void;
  onresult: (event: SpeechRecognitionEventLike) => void;
  onerror: () => void;
  onend: () => void;
  start: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

interface SpeechWindow extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

export function useVoiceInput(onTranscript: (transcript: string) => void) {
  const [isRecording, setIsRecording] = useState(false);

  const startVoiceInput = () => {
    const speechWindow = window as SpeechWindow;
    const SpeechRecognition =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Ваш браузер не поддерживает голосовой ввод.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "ru-RU";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    let transcript = "";
    let recognitionFailed = false;

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event) => {
      transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(" ")
        .trim();
    };
    recognition.onerror = () => {
      recognitionFailed = true;
      setIsRecording(false);
    };
    recognition.onend = () => {
      setIsRecording(false);
      if (!recognitionFailed && transcript) onTranscript(transcript);
    };

    recognition.start();
  };

  return { isRecording, startVoiceInput };
}
