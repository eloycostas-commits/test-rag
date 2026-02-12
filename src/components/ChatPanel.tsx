'use client';

import { useState } from 'react';

type Message = { role: 'user' | 'assistant'; content: string };

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function ask() {
    if (!question.trim()) return;

    const userMessage: Message = { role: 'user', content: question };
    setMessages((current) => [...current, userMessage]);
    setQuestion('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });

      const data = (await response.json()) as { answer?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Chat request failed');

      setMessages((current) => [...current, { role: 'assistant', content: data.answer ?? '' }]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        { role: 'assistant', content: error instanceof Error ? error.message : 'Unknown error.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="card">
      <h2>2) Ask questions to your engineering corpus</h2>
      <textarea
        rows={3}
        placeholder="Example: Which regulation defines elevator emergency braking intervals?"
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
      />
      <div style={{ marginTop: '0.75rem' }}>
        <button onClick={ask} disabled={isLoading}>
          {isLoading ? 'Thinking…' : 'Ask'}
        </button>
      </div>

      <div style={{ marginTop: '1rem' }}>
        {messages.map((msg, index) => (
          <pre key={`${msg.role}-${index}`} className="card" style={{ margin: 0, marginBottom: '0.5rem' }}>
            <strong>{msg.role === 'user' ? 'You' : 'Assistant'}:</strong> {msg.content}
          </pre>
        ))}
      </div>
    </div>
  );
}
