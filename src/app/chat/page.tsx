import type { Metadata } from "next";
import { ChatWindow } from "./chat-window";

export const metadata: Metadata = { title: "Chat to book | Trims by K" };

export default function ChatPage() {
  return <ChatWindow />;
}
