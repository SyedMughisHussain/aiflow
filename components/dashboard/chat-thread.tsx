"use client"

import { useEffect, useRef } from "react"
import { AlertTriangle, Bot, Send, User } from "lucide-react"

import type { ChatMessageDTO } from "@/app/dashboard/chat/actions"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/dashboard/empty-state"
import { cn } from "@/lib/utils"

interface ChatThreadProps {
  messages: ChatMessageDTO[]
  input: string
  onInputChange: (value: string) => void
  onSend: () => void
  isSending: boolean
  isLoadingConversation: boolean
  error: string | null
}

export function ChatThread({
  messages,
  input,
  onInputChange,
  onSend,
  isSending,
  isLoadingConversation,
  error,
}: ChatThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ block: "end" })
  }, [messages, isSending])

  const disabled = isSending || isLoadingConversation
  const canSend = input.trim().length > 0 && !disabled

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (canSend) onSend()
  }

  return (
    <Card className="flex h-[32rem] flex-col">
      <CardContent className="flex-1 overflow-y-auto">
        {isLoadingConversation ? (
          <div className="flex flex-col gap-3" role="status" aria-label="Loading conversation">
            <div className="h-10 w-2/3 animate-pulse rounded-lg bg-muted" />
            <div className="ml-auto h-10 w-1/2 animate-pulse rounded-lg bg-muted" />
            <div className="h-10 w-3/5 animate-pulse rounded-lg bg-muted" />
          </div>
        ) : messages.length === 0 ? (
          <EmptyState
            icon={Bot}
            title="Nothing here yet"
            description="Send a message to start the conversation."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex items-start gap-2",
                  message.role === "USER" && "flex-row-reverse"
                )}
              >
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  {message.role === "USER" ? (
                    <User className="size-3.5" />
                  ) : (
                    <Bot className="size-3.5" />
                  )}
                </span>
                <p
                  className={cn(
                    "max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                    message.role === "USER"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  {message.content}
                </p>
              </div>
            ))}
            {isSending ? (
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Bot className="size-3.5" />
                </span>
                <div
                  className="flex items-center gap-1 rounded-lg bg-muted px-3 py-2.5"
                  role="status"
                  aria-label="Assistant is typing"
                >
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
                </div>
              </div>
            ) : null}
            <div ref={scrollRef} />
          </div>
        )}
      </CardContent>
      {error ? (
        <div className="mx-4 mb-2 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}
      <CardFooter>
        <form onSubmit={handleSubmit} className="flex w-full gap-2">
          <Input
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            placeholder="Ask anything..."
            disabled={disabled}
            aria-label="Message"
          />
          <Button type="submit" size="icon" disabled={!canSend} aria-label="Send message">
            <Send />
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}
