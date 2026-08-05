import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, X, Send, Info, ChevronRight } from 'lucide-react'
import { useOrdersQuery } from '@/entities/order'
import { useMachinesQuery } from '@/entities/machine'
import { useProductsQuery } from '@/entities/product'
import { useAssignmentsWindowQuery } from '@/entities/schedule-assignment'
import { RANGE_START_DAYS, RANGE_END_DAYS } from '@/shared/lib/schedule-window'
import { answerQuery, type AssistantResultItem } from '../lib/answer-query'

const DAY_MS = 86_400_000
const THINK_DELAY_MS = 350

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  items?: AssistantResultItem[]
}

const GREETING: ChatMessage = {
  id: 'greeting',
  role: 'assistant',
  text: 'Спросите про заказы, станки или загрузку — отвечаю по текущим данным приложения, локально, без обращения к внешним AI-сервисам.',
}

export function AiAssistantMenu() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const from = useRef(new Date(Date.now() + RANGE_START_DAYS * DAY_MS).toISOString()).current
  const to = useRef(new Date(Date.now() + RANGE_END_DAYS * DAY_MS).toISOString()).current
  const ordersQuery = useOrdersQuery({ limit: 30000 }, { enabled: open })
  const machinesQuery = useMachinesQuery()
  const productsQuery = useProductsQuery()
  const assignmentsQuery = useAssignmentsWindowQuery(from, to, open)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, thinking])

  const handleSelectItem = (item: AssistantResultItem) => {
    setOpen(false)
    navigate(item.navigate.path, { state: item.navigate.state })
  }

  const handleSubmit = () => {
    const question = input.trim()
    if (!question || thinking) return
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', text: question }])
    setInput('')
    setThinking(true)
    window.setTimeout(() => {
      const answer = answerQuery(question, {
        orders: ordersQuery.data ?? [],
        machines: machinesQuery.data ?? [],
        products: productsQuery.data ?? [],
        assignments: assignmentsQuery.data ?? [],
      })
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text: answer.text, items: answer.items }])
      setThinking(false)
    }, THINK_DELAY_MS)
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-ink-600)] hover:bg-[var(--color-canvas)]" aria-label="AI-помощник">
        <Bot className="h-[18px] w-[18px]" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={() => setOpen(false)} />
          <div className="relative flex h-full w-full max-w-sm flex-col overflow-hidden border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3.5">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-ink-900)]">
                <Bot className="h-4 w-4 text-[var(--color-brand-600)]" />
                AI-помощник
              </h2>
              <button onClick={() => setOpen(false)} aria-label="Закрыть" className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-ink-600)] hover:bg-[var(--color-canvas)]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {messages.map((m) => (
                <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  <div
                    className={
                      m.role === 'user'
                        ? 'max-w-[85%] rounded-lg rounded-br-sm bg-[var(--color-brand-600)] px-3 py-2 text-sm text-white'
                        : 'max-w-[90%] rounded-lg rounded-bl-sm border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 py-2 text-sm text-[var(--color-ink-900)]'
                    }
                  >
                    <p>{m.text}</p>
                    {m.items && m.items.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {m.items.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => handleSelectItem(item)}
                            className="flex w-full items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-left text-xs hover:bg-[var(--color-canvas)]"
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium text-[var(--color-ink-900)]">{item.label}</span>
                              {item.sublabel && <span className="block truncate text-[var(--color-ink-600)]">{item.sublabel}</span>}
                            </span>
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--color-ink-400)]" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {thinking && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1 rounded-lg rounded-bl-sm border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 py-2">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-ink-400)]" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-ink-400)]" style={{ animationDelay: '120ms' }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-ink-400)]" style={{ animationDelay: '240ms' }} />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-[var(--color-border)] p-3">
              <div className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] px-2.5 py-1.5">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSubmit()
                  }}
                  placeholder="Например: какие заказы под риском?"
                  className="h-7 flex-1 bg-transparent text-sm text-[var(--color-ink-900)] outline-none placeholder:text-[var(--color-ink-400)]"
                />
                <button onClick={handleSubmit} disabled={!input.trim() || thinking} aria-label="Отправить" className="text-[var(--color-brand-600)] disabled:opacity-40">
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1.5 flex items-center gap-1 text-[10px] text-[var(--color-ink-400)]">
                <Info className="h-3 w-3 shrink-0" />
                Локальный разбор ключевых слов по данным демо, не подключение к внешней LLM.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
