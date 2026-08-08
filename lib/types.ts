export type SessionStatus = "idle" | "connecting" | "active" | "ended";

export type Role = "interviewer" | "observer" | "user";

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
}

export interface Session {
  id: string;
  status: SessionStatus;
  messages: Message[];
}
