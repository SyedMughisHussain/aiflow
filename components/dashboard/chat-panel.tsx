"use client"

import { useState } from "react"

import {
  startConversation,
  loadConversationMessages,
  sendChatMessage,
  type ConversationSummaryDTO,
  type ChatMessageDTO,
} from "@/app/dashboard/chat/actions"
import { ChatSidebar } from "@/components/dashboard/chat-sidebar"
import { ChatThread } from "@/components/dashboard/chat-thread"

interface ChatPanelProps {
  initialConversations: ConversationSummaryDTO[]
  initialActiveChatId: string | null
  initialMessages: ChatMessageDTO[]
}

export function ChatPanel({
  initialConversations,
  initialActiveChatId,
  initialMessages,
}: ChatPanelProps) {
  const [conversations, setConversations] = useState(initialConversations)
  const [activeChatId, setActiveChatId] = useState(initialActiveChatId)
  const [messages, setMessages] = useState(initialMessages)
  const [input, setInput] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [isLoadingConversation, setIsLoadingConversation] = useState(false)

  async function handleSelectConversation(id: string) {
    if (id === activeChatId || isSending || isLoadingConversation) return

    setError(null)
    setIsLoadingConversation(true)
    const result = await loadConversationMessages(id)
    setIsLoadingConversation(false)

    if (result.ok) {
      setActiveChatId(id)
      setMessages(result.messages)
    } else {
      setError(result.error)
    }
  }

  async function handleNewChat() {
    if (isSending || isLoadingConversation) return

    setError(null)
    const chat = await startConversation()
    setConversations((prev) => [chat, ...prev])
    setActiveChatId(chat.id)
    setMessages([])
  }

  async function handleSend() {
    const content = input.trim()
    if (!content || isSending) return

    setError(null)
    setInput("")
    setIsSending(true)

    let chatId = activeChatId
    if (!chatId) {
      const chat = await startConversation()
      chatId = chat.id
      setActiveChatId(chat.id)
      setConversations((prev) => [chat, ...prev])
    }

    const result = await sendChatMessage(chatId, content)
    setIsSending(false)

    if (result.ok) {
      const { userMessage, assistantMessage, conversation } = result
      setMessages((prev) => [...prev, userMessage, assistantMessage])
      setConversations((prev) =>
        [...prev]
          .map((item) => (item.id === conversation.id ? conversation : item))
          .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
      )
    } else {
      setError(result.error)
      setInput(content)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
      <ChatSidebar
        conversations={conversations}
        activeChatId={activeChatId}
        onSelect={handleSelectConversation}
        onNewChat={handleNewChat}
        disabled={isSending || isLoadingConversation}
      />
      <ChatThread
        messages={messages}
        input={input}
        onInputChange={setInput}
        onSend={handleSend}
        isSending={isSending}
        isLoadingConversation={isLoadingConversation}
        error={error}
      />
    </div>
  )
}
