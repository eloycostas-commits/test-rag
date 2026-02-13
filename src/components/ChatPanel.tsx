'use client';

import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';

type Source = {
  title: string;
  chunkIndex: number;
  similarity: number;
  excerpt: string;
};

type Message = {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
};

const starterQuestions = [
  '¿Qué intervalo de mantenimiento se recomienda para frenos de seguridad del ascensor?',
  '¿Qué sección normativa menciona procedimientos de evacuación de emergencia?',
  'Resume los cálculos de carga del documento técnico subido.'
];

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  const showStarters = useMemo(() => messages.length === 0, [messages.length]);

  async function ask(nextQuestion?: string) {
    const prompt = (nextQuestion ?? question).trim();
    if (!prompt) return;

    const userMessage: Message = { role: 'user', content: prompt };
    setMessages((current) => [...current, userMessage]);
    setQuestion('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: prompt })
      });

      const data = (await response.json()) as { answer?: string; error?: string; sources?: Source[] };
      if (!response.ok) throw new Error(data.error ?? 'Falló la consulta al chat.');

      setMessages((current) => [
        ...current,
        { role: 'assistant', content: data.answer ?? '', sources: data.sources ?? [] }
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        { role: 'assistant', content: error instanceof Error ? error.message : 'Error desconocido.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void ask();
    }
  }

  async function copyAnswer(content: string) {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // noop
    }
  }

  return (
    <div className="card">
      <h2>2) Hacer preguntas al corpus de ingeniería</h2>
      <textarea
        rows={3}
        placeholder="Enter para enviar, Shift+Enter para nueva línea"
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        onKeyDown={onKeyDown}
      />
      <div style={{ marginTop: '0.75rem' }}>
        <button onClick={() => void ask()} disabled={isLoading}>
          {isLoading ? 'Pensando…' : 'Preguntar'}
        </button>
      </div>

      {showStarters ? (
        <div className="card nested">
          <strong>Prueba una de estas preguntas:</strong>
          <ul>
            {starterQuestions.map((example) => (
              <li key={example}>
                <button className="link-button" onClick={() => void ask(example)} disabled={isLoading}>
                  {example}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div ref={listRef} className="chat-list">
        {messages.map((msg, index) => (
          <div key={`${msg.role}-${index}`} className={`card chat-bubble ${msg.role}`}>
            <div className="chat-row">
              <strong>{msg.role === 'user' ? 'Tú' : 'Asistente'}:</strong>
              {msg.role === 'assistant' ? (
                <button className="link-button" onClick={() => void copyAnswer(msg.content)}>
                  Copiar
                </button>
              ) : null}
            </div>
            <pre>{msg.content}</pre>

            {msg.sources?.length ? (
              <details>
                <summary>Fuentes ({msg.sources.length})</summary>
                <ul>
                  {msg.sources.map((source, sourceIndex) => (
                    <li key={`${source.title}-${source.chunkIndex}-${sourceIndex}`}>
                      <strong>{source.title}</strong> · chunk {source.chunkIndex} · similitud{' '}
                      {source.similarity}
                      <br />
                      <small>{source.excerpt}...</small>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        ))}

        {isLoading ? <p className="muted">El asistente está escribiendo…</p> : null}
      </div>
    </div>
  );
}
