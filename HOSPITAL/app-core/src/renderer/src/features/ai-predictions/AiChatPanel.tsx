import { useEffect, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { Sparkles, Send, Loader2, Plus, Pencil, BedDouble, Pill, ShieldAlert } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { AiConversation, AiConversationMessage } from '@shared/ai-types'

// Rendu markdown pour les réponses de l'assistant (item "PETITES MODIFS") : le backend renvoie du
// texte formaté (gras, listes, liens...) qui s'affichait auparavant tel quel (ex. "**mot**" au
// lieu du gras). Les messages de l'utilisateur, eux, restent en texte brut — ce sont ses propres
// mots, pas du contenu à interpréter.
const MARKDOWN_COMPONENTS = {
  p: ({ children }: { children?: ReactNode }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }: { children?: ReactNode }) => <strong className="font-semibold text-gray-900">{children}</strong>,
  ul: ({ children }: { children?: ReactNode }) => <ul className="mb-2 list-disc space-y-0.5 pl-4 last:mb-0">{children}</ul>,
  ol: ({ children }: { children?: ReactNode }) => <ol className="mb-2 list-decimal space-y-0.5 pl-4 last:mb-0">{children}</ol>,
  a: ({ children, href }: { children?: ReactNode; href?: string }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-accent-600 underline hover:text-accent-700">
      {children}
    </a>
  ),
  code: ({ children }: { children?: ReactNode }) => (
    <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[13px] text-gray-800">{children}</code>
  ),
  table: ({ children }: { children?: ReactNode }) => (
    <div className="mb-2 overflow-x-auto last:mb-0">
      <table className="w-full text-left text-xs">{children}</table>
    </div>
  ),
  th: ({ children }: { children?: ReactNode }) => <th className="border-b border-gray-200 px-2 py-1 font-medium">{children}</th>,
  td: ({ children }: { children?: ReactNode }) => <td className="border-b border-gray-100 px-2 py-1">{children}</td>
}

const SUGGESTIONS = [
  { icon: BedDouble, label: "Quelle est l'occupation des lits en ce moment ?" },
  { icon: Pill, label: 'Quels médicaments sont en rupture ou en stock faible ?' },
  { icon: ShieldAlert, label: 'Quels sont les risques critiques du registre des risques ?' }
]

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

export function AiChatPanel(): JSX.Element {
  const [conversations, setConversations] = useState<AiConversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<AiConversationMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [asking, setAsking] = useState(false)
  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  async function loadConversations(selectFirst = false): Promise<void> {
    const result = await window.api.ai.listConversations()
    if (!result.ok) return
    setConversations(result.data.conversations)
    if (selectFirst && result.data.conversations.length > 0) {
      selectConversation(result.data.conversations[0].id)
    }
  }

  async function selectConversation(id: string): Promise<void> {
    setActiveId(id)
    setLoadingMessages(true)
    const result = await window.api.ai.getMessages(id)
    setMessages(result.ok ? result.data.messages : [])
    setLoadingMessages(false)
  }

  useEffect(() => {
    loadConversations(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleNewConversation(): Promise<void> {
    const result = await window.api.ai.createConversation()
    if (!result.ok) return
    setConversations((prev) => [result.data.conversation, ...prev])
    setActiveId(result.data.conversation.id)
    setMessages([])
  }

  async function ask(question: string): Promise<void> {
    if (!question.trim() || asking) return

    let conversationId = activeId
    if (!conversationId) {
      const created = await window.api.ai.createConversation()
      if (!created.ok) return
      conversationId = created.data.conversation.id
      setActiveId(conversationId)
      setConversations((prev) => [created.data.conversation, ...prev])
    }

    setDraft('')
    setAsking(true)
    setMessages((prev) => [
      ...prev,
      { id: `tmp-${Date.now()}`, conversationId: conversationId as string, role: 'USER', text: question, createdAt: new Date().toISOString() }
    ])

    const result = await window.api.ai.ask(conversationId, question)

    setMessages((prev) => [
      ...prev,
      {
        id: `tmp-${Date.now()}-a`,
        conversationId: conversationId as string,
        role: 'ASSISTANT',
        text: result.ok ? result.data.answer : `Erreur : ${result.error}`,
        createdAt: new Date().toISOString()
      }
    ])
    setAsking(false)
    loadConversations()
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    await ask(draft)
  }

  function startRename(conv: AiConversation): void {
    setEditingId(conv.id)
    setEditingTitle(conv.title)
  }

  async function commitRename(): Promise<void> {
    if (!editingId) return
    const id = editingId
    const title = editingTitle
    setEditingId(null)
    if (!title.trim()) return

    const result = await window.api.ai.renameConversation(id, title)
    if (result.ok) {
      setConversations((prev) => prev.map((c) => (c.id === id ? result.data.conversation : c)))
    }
  }

  function handleRenameKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Enter') commitRename()
    if (event.key === 'Escape') setEditingId(null)
  }

  return (
    <div className="flex h-[calc(100vh-260px)] min-h-[520px] gap-6 rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex w-56 shrink-0 flex-col border-r border-gray-100 pr-4">
        <button
          onClick={handleNewConversation}
          className="mb-3 flex items-center justify-center gap-1.5 rounded-lg bg-accent-500 px-3 py-2 text-sm font-medium text-white hover:bg-accent-600"
        >
          <Plus className="h-4 w-4" />
          Nouvelle conversation
        </button>

        <div className="flex-1 space-y-1 overflow-y-auto">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={
                'group flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm ' +
                (conv.id === activeId ? 'bg-accent-50 text-accent-700' : 'text-gray-600 hover:bg-gray-100')
              }
            >
              {editingId === conv.id ? (
                <input
                  autoFocus
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={handleRenameKeyDown}
                  className="w-full rounded border border-accent-300 bg-white px-1.5 py-0.5 text-sm focus:outline-none"
                />
              ) : (
                <>
                  <button onClick={() => selectConversation(conv.id)} className="min-w-0 flex-1 truncate text-left">
                    {conv.title}
                  </button>
                  <span className="shrink-0 text-[10px] text-gray-400">{formatDate(conv.updatedAt)}</span>
                  <button
                    onClick={() => startRename(conv)}
                    title="Renommer"
                    className="shrink-0 opacity-0 hover:text-accent-600 group-hover:opacity-100"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto">
          {loadingMessages ? (
            <p className="px-4 py-8 text-center text-sm text-gray-400">Chargement…</p>
          ) : (
            <>
              {messages.length === 0 && (
                <p className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400">
                  Posez une question sur les données de l&apos;établissement.
                </p>
              )}

              {messages.map((message) =>
                message.role === 'USER' ? (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-lg rounded-2xl rounded-tr-sm bg-gray-100 px-4 py-2.5 text-sm text-gray-800">
                      {message.text}
                    </div>
                  </div>
                ) : (
                  <div key={message.id} className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-600">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="max-w-xl rounded-2xl rounded-tl-sm border border-gray-200 bg-white p-4 text-sm leading-relaxed text-gray-700">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
                        {message.text}
                      </ReactMarkdown>
                    </div>
                  </div>
                )
              )}
            </>
          )}

          {asking && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-600">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-gray-200 bg-white px-4 py-3 text-sm text-gray-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Réflexion en cours…
              </div>
            </div>
          )}

          {messages.length === 0 && !loadingMessages && (
            <div className="flex flex-wrap gap-2 pt-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => ask(s.label)}
                  className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3.5 py-2 text-sm text-gray-500 hover:border-accent-300 hover:text-accent-600"
                >
                  <s.icon className="h-4 w-4" />
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 border-t border-gray-100 pt-4">
          <form onSubmit={handleSubmit} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={asking}
              placeholder="Posez une question à l'assistant..."
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!draft.trim() || asking}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-500 text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          <p className="mt-2 text-center text-[11px] text-gray-400">
            L&apos;assistant répond à partir des données réelles de l&apos;établissement (patients, soins,
            stocks, finances, RH, gouvernance...) — il ne devine jamais un chiffre et ne fait pas de
            prédiction.
          </p>
        </div>
      </div>
    </div>
  )
}
