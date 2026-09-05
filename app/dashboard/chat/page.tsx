import type { Metadata } from "next"

import { requireUser } from "@/lib/auth-guard"
import { listConversationsForUser, getConversationMessages } from "@/lib/chat-service"
import { PageHeader } from "@/components/dashboard/page-header"
import { ChatPanel } from "@/components/dashboard/chat-panel"

export const metadata: Metadata = {
  title: "Chat — Promptly",
}

export default async function ChatPage() {
  const user = await requireUser()

  const chats = await listConversationsForUser(user.id)
  const activeChat = chats[0] ?? null
  const messages = activeChat ? await getConversationMessages(user.id, activeChat.id) : []

  return (
    <>
      <PageHeader
        title="Chat"
        description="Chat with your AI assistant for quick answers and ideas."
      />
      <ChatPanel
        initialConversations={chats.map((chat) => ({
          id: chat.id,
          title: chat.title,
          updatedAt: chat.updatedAt.toISOString(),
        }))}
        initialActiveChatId={activeChat?.id ?? null}
        initialMessages={messages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          createdAt: message.createdAt.toISOString(),
        }))}
      />
    </>
  )
}
