import { useEffect, useRef, useState } from "react";
import { sendProcessChatMessage } from "../services/aiService";
import { loadAttachmentFiles } from "../services/attachmentStorage";
import type { BusinessProcess, ChatMessage } from "../types";

export function useProcessChat(
  process: BusinessProcess | null,
  organizationId: string,
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !process?.result) return;

    const currentInput = input;
    const userMessage: ChatMessage = { role: "user", text: currentInput };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const attachments = await loadAttachmentFiles(
        organizationId,
        process.attachments,
      );
      const response = await sendProcessChatMessage(
        process,
        messages,
        currentInput,
        attachments,
      );
      if (response) {
        setMessages((current) => [
          ...current,
          { role: "model", text: response },
        ]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((current) => [
        ...current,
        {
          role: "model",
          text: "Извините, произошла ошибка при обработке вашего запроса.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    input,
    isLoading,
    endRef,
    setInput,
    sendMessage,
    clearMessages: () => setMessages([]),
  };
}
