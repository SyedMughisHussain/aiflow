"use client"

import { MessageSquarePlus, MessagesSquare } from "lucide-react"

import type { ConversationSummaryDTO } from "@/app/dashboard/chat/actions"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/dashboard/empty-state"
import { cn } from "@/lib/utils"

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(iso))
}

interface ChatSidebarProps {
  conversations: ConversationSummaryDTO[]
  activeChatId: string | null
  onSelect: (id: string) => void
  onNewChat: () => void
  disabled: boolean
}

export function ChatSidebar({
  conversations,
  activeChatId,
  onSelect,
  onNewChat,
  disabled,
}: ChatSidebarProps) {
  return (
    <div className="flex h-[32rem] flex-col rounded-lg border border-border bg-card">
      <div className="border-b border-border p-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onNewChat}
          disabled={disabled}
        >
          <MessageSquarePlus /> New chat
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-1.5">
        {conversations.length === 0 ? (
          <div className="px-2 py-6">
            <EmptyState
              icon={MessagesSquare}
              title="No conversations"
              description="Start a new chat to begin."
            />
          </div>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {conversations.map((conversation) => (
              <li key={conversation.id}>
                <button
                  type="button"
                  onClick={() => onSelect(conversation.id)}
                  disabled={disabled}
                  aria-current={conversation.id === activeChatId}
                  className={cn(
                    "w-full rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50",
                    conversation.id === activeChatId && "bg-muted font-medium"
                  )}
                >
                  <span className="block truncate">
                    {conversation.title ?? "New conversation"}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {formatDate(conversation.updatedAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
