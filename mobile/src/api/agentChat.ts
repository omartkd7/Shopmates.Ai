import { API_BASE_URL } from "../config/api";
import { getTokens } from "../auth/tokenStorage";
import { apiClient } from "./client";

export interface ChatSource {
  name: string;
  score: number;
}

export interface StreamEventPayload {
  type:
    | "start"
    | "source"
    | "tool_call"
    | "tool_result"
    | "token"
    | "confirmation"
    | "done"
    | "error";
  conversationId?: number;
  sources?: ChatSource[];
  tool?: string;
  args?: any;
  result?: any;
  token?: string;
  confirmed?: boolean;
  orderId?: number;
  messageId?: number;
  message?: string;
}

export interface StreamChatCallbacks {
  onStart?: (conversationId: number) => void;
  onSources?: (sources: ChatSource[]) => void;
  onToolCall?: (tool: string, args: any) => void;
  onToolResult?: (tool: string, result: any) => void;
  onToken?: (token: string) => void;
  onConfirmation?: (confirmed: boolean, orderId?: number) => void;
  onDone?: (payload: {
    conversationId: number;
    messageId?: number;
    orderId?: number;
  }) => void;
  onError?: (error: {
    status?: number;
    message: string;
    isRateLimit?: boolean;
  }) => void;
}

export interface ActiveStream {
  abort: () => void;
}

/**
 * Robust React Native / Expo Server-Sent Events (SSE) client using XMLHttpRequest.
 * Supports token streaming, real-time tool telemetry, source citation, cancellation on unmount,
 * and handles rate limits (HTTP 429) & network disconnects.
 */
export async function streamAgentChat(
  params: {
    message: string;
    conversationId?: number;
  },
  callbacks: StreamChatCallbacks
): Promise<ActiveStream> {
  const { accessToken } = await getTokens();
  const xhr = new XMLHttpRequest();
  let lastIndex = 0;
  let buffer = "";
  let isAborted = false;

  xhr.open("POST", `${API_BASE_URL}/api/agent/chat`, true);
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.setRequestHeader("Accept", "text/event-stream");
  if (accessToken) {
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
  }

  const processBuffer = () => {
    const newText = xhr.responseText.slice(lastIndex);
    lastIndex = xhr.responseText.length;
    buffer += newText;

    const parts = buffer.split("\n\n");
    // Keep incomplete trailing event chunk in buffer
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      const lines = trimmed.split("\n");
      for (const line of lines) {
        if (line.startsWith("data:")) {
          const raw = line.slice(5).trim();
          if (!raw) continue;
          try {
            const event: StreamEventPayload = JSON.parse(raw);
            switch (event.type) {
              case "start":
                if (event.conversationId) callbacks.onStart?.(event.conversationId);
                break;
              case "source":
                if (event.sources) callbacks.onSources?.(event.sources);
                break;
              case "tool_call":
                if (event.tool) callbacks.onToolCall?.(event.tool, event.args);
                break;
              case "tool_result":
                if (event.tool) callbacks.onToolResult?.(event.tool, event.result);
                break;
              case "token":
                if (event.token) callbacks.onToken?.(event.token);
                break;
              case "confirmation":
                callbacks.onConfirmation?.(!!event.confirmed, event.orderId);
                break;
              case "done":
                callbacks.onDone?.({
                  conversationId: event.conversationId ?? params.conversationId ?? 0,
                  messageId: event.messageId,
                  orderId: event.orderId,
                });
                break;
              case "error":
                callbacks.onError?.({
                  status: xhr.status,
                  message: event.message || "Une erreur est survenue.",
                });
                break;
            }
          } catch {
            // Ignore incomplete or transient JSON parsing errors
          }
        }
      }
    }
  };

  xhr.onprogress = () => {
    if (isAborted) return;
    if (xhr.status === 200) {
      processBuffer();
    }
  };

  xhr.onreadystatechange = () => {
    if (isAborted) return;

    if (xhr.readyState === 3 && xhr.status === 200) {
      processBuffer();
    } else if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        processBuffer();
      } else if (xhr.status === 429) {
        callbacks.onError?.({
          status: 429,
          isRateLimit: true,
          message:
            "Trop de requêtes vers l'assistant IA (max 20 messages / minute). Veuillez patienter quelques instants.",
        });
      } else if (xhr.status === 401) {
        callbacks.onError?.({
          status: 401,
          message: "Session expirée. Veuillez vous reconnecter.",
        });
      } else if (xhr.status > 0) {
        let errorMsg = "Erreur de communication avec le serveur.";
        try {
          const parsed = JSON.parse(xhr.responseText);
          errorMsg = parsed.error || parsed.message || errorMsg;
        } catch {}
        callbacks.onError?.({
          status: xhr.status,
          message: errorMsg,
        });
      }
    }
  };

  xhr.onerror = () => {
    if (isAborted) return;
    callbacks.onError?.({
      message: "Erreur de connexion réseau. Vérifiez votre connexion Internet.",
    });
  };

  xhr.send(
    JSON.stringify({
      message: params.message,
      conversationId: params.conversationId,
    })
  );

  return {
    abort: () => {
      isAborted = true;
      xhr.abort();
    },
  };
}

export interface ConversationSummary {
  id: number;
  title: string;
  updatedAt: string;
  messages: Array<{
    id: number;
    role: "user" | "assistant";
    content: string;
    createdAt: string;
  }>;
}

/**
 * Fetch customer's past conversation history from the backend.
 */
export async function fetchConversationHistory(): Promise<ConversationSummary[]> {
  const response = await apiClient.get<{
    conversations: ConversationSummary[];
  }>("/api/agent/conversations");
  return response.data.conversations;
}

/**
 * Fetch a single conversation with all its messages.
 */
export async function fetchSingleConversation(id: number): Promise<ConversationSummary> {
  const response = await apiClient.get<{
    conversation: ConversationSummary;
  }>(`/api/agent/conversations/${id}`);
  return response.data.conversation;
}
