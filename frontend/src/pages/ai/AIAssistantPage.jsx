import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  HiOutlineSparkles,
  HiOutlinePaperAirplane,
  HiOutlineMagnifyingGlass,
  HiOutlineEnvelope,
  HiOutlineLanguage,
  HiOutlineDocumentText,
  HiOutlineChartBarSquare,
  HiOutlineChatBubbleLeftRight,
  HiOutlineArrowPath,
  HiOutlineExclamationTriangle,
  HiOutlineTrash,
  HiOutlineClipboard,
  HiOutlineCheckCircle,
  HiOutlineTag,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import apiClient from '../../api/client';

// ── AI Modes ────────────────────────────────────────────────────
const MODES = [
  { id: 'general', label: 'General', icon: HiOutlineChatBubbleLeftRight, description: 'General assistant' },
  { id: 'search', label: 'Search', icon: HiOutlineMagnifyingGlass, description: 'Search across your data' },
  { id: 'hsn', label: 'HSN Search', icon: HiOutlineTag, description: 'Search HSN/SAC codes & GST rates' },
  { id: 'email', label: 'Email Draft', icon: HiOutlineEnvelope, description: 'Draft professional emails' },
  { id: 'translate', label: 'Translate', icon: HiOutlineLanguage, description: 'Translate between languages' },
  { id: 'summarize', label: 'Summarize', icon: HiOutlineDocumentText, description: 'Summarize content' },
  { id: 'analyze', label: 'Analyze', icon: HiOutlineChartBarSquare, description: 'Analyze business data' },
];

// ── Quick Prompts ───────────────────────────────────────────────
const QUICK_PROMPTS = [
  { label: 'Analyze receivables', prompt: 'Analyze my current accounts receivable status and suggest actions', mode: 'analyze' },
  { label: 'Draft payment reminder', prompt: 'Draft a professional payment reminder email for an overdue invoice', mode: 'email' },
  { label: 'GST compliance check', prompt: 'What are the current GST filing requirements and deadlines I should be aware of?', mode: 'general' },
  { label: 'HSN for cotton shirts', prompt: 'cotton shirts', mode: 'hsn' },
  { label: 'Business summary', prompt: 'Summarize my current business financial health - revenue, expenses, and cash flow', mode: 'analyze' },
  { label: 'TDS guidelines', prompt: 'Explain TDS deduction rules for different payment categories', mode: 'general' },
];

// ── Provider Badge ──────────────────────────────────────────────
function ProviderBadge({ provider }) {
  const colors = {
    gemini: 'bg-blue-50 text-blue-700 border-blue-200',
    groq: 'bg-orange-50 text-orange-700 border-orange-200',
    database: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    offline: 'bg-gray-100 text-gray-600 border-gray-200',
  };
  const labels = {
    gemini: 'Gemini',
    groq: 'Groq',
    database: 'HSN Database',
    offline: 'Offline',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded border ${colors[provider] || colors.offline}`}>
      <HiOutlineSparkles className="w-2.5 h-2.5" />
      {labels[provider] || provider}
    </span>
  );
}

// ── HSN Results Table ────────────────────────────────────────────
function HSNResultsTable({ results }) {
  if (!results || results.length === 0) return null;

  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-[#F3F4F6]">
            <th className="px-3 py-2 text-left font-semibold text-[#374151] border-b border-[#E5E7EB]">HSN/SAC Code</th>
            <th className="px-3 py-2 text-left font-semibold text-[#374151] border-b border-[#E5E7EB]">Description</th>
            <th className="px-3 py-2 text-center font-semibold text-[#374151] border-b border-[#E5E7EB]">GST Rate</th>
            <th className="px-3 py-2 text-center font-semibold text-[#374151] border-b border-[#E5E7EB]">Chapter</th>
          </tr>
        </thead>
        <tbody>
          {results.map((item, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'}>
              <td className="px-3 py-2 font-mono font-semibold text-[#0071DC] border-b border-[#E5E7EB] whitespace-nowrap">
                {item.hsn_code}
              </td>
              <td className="px-3 py-2 text-[#333] border-b border-[#E5E7EB]">
                {item.description}
                {item.notes && (
                  <span className="block text-[10px] text-[#6B7280] mt-0.5">{item.notes}</span>
                )}
              </td>
              <td className="px-3 py-2 text-center border-b border-[#E5E7EB] whitespace-nowrap">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                  item.gst_rate === 0 ? 'bg-green-100 text-green-700' :
                  item.gst_rate <= 5 ? 'bg-blue-100 text-blue-700' :
                  item.gst_rate <= 12 ? 'bg-yellow-100 text-yellow-700' :
                  item.gst_rate <= 18 ? 'bg-orange-100 text-orange-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {item.gst_rate}%
                </span>
              </td>
              <td className="px-3 py-2 text-center text-[#6B7280] border-b border-[#E5E7EB] whitespace-nowrap">
                {item.chapter}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Message Bubble ──────────────────────────────────────────────
function MessageBubble({ message, onCopy }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%] ${isUser ? 'order-1' : 'order-1'}`}>
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-[#0071DC] text-white rounded-br-md'
              : 'bg-white border border-[#E5E7EB] text-[#333] rounded-bl-md shadow-sm'
          }`}
        >
          <div className="whitespace-pre-wrap">{message.content}</div>
          {!isUser && message.hsnResults && <HSNResultsTable results={message.hsnResults} />}
        </div>
        <div className={`flex items-center gap-2 mt-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
          {!isUser && message.provider && <ProviderBadge provider={message.provider} />}
          {!isUser && (
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-0.5 text-[10px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
              title="Copy response"
            >
              {copied ? (
                <><HiOutlineCheckCircle className="w-3 h-3 text-green-500" /> Copied</>
              ) : (
                <><HiOutlineClipboard className="w-3 h-3" /> Copy</>
              )}
            </button>
          )}
          <span className="text-[10px] text-[#9CA3AF]">
            {new Date(message.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Typing Indicator ────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex justify-start mb-4">
      <div className="bg-white border border-[#E5E7EB] rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-[#9CA3AF] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-[#9CA3AF] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-[#9CA3AF] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

// ── Main AI Assistant Page ──────────────────────────────────────
export default function AIAssistantPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('general');
  const [loading, setLoading] = useState(false);
  const [aiConfig, setAiConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom on new messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Fetch AI config
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await apiClient.get('/ai/config');
        setAiConfig(res.data);
      } catch {
        setAiConfig({ available: false, providers: [] });
      } finally {
        setConfigLoading(false);
      }
    };
    fetchConfig();
  }, []);

  // Send message
  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await apiClient.post('/ai/chat', {
        message: text,
        mode,
        history: messages.slice(-10).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      const raw = res.data;
      // Backend wraps in { data: { response, provider, mode, hsnResults } }
      const data = raw.data || raw;
      const assistantMessage = {
        role: 'assistant',
        content: data.response || data.message || 'No response received.',
        provider: data.provider || 'offline',
        timestamp: new Date().toISOString(),
        hsnResults: data.hsnResults || null,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to get AI response';
      const errorMessage = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${errorMsg}. Please try again.`,
        provider: 'offline',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickPrompt = (prompt, promptMode) => {
    setMode(promptMode);
    setInput(prompt);
    inputRef.current?.focus();
  };

  const handleClearChat = () => {
    setMessages([]);
    toast.success('Chat cleared');
  };

  const activeMode = MODES.find((m) => m.id === mode);

  return (
    <div className="flex flex-col h-[calc(100vh-var(--topnav-height)-2rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <HiOutlineSparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#333]">AI Assistant</h1>
            <p className="text-xs text-[#6B7280]">
              {configLoading ? 'Checking AI configuration...' : (
                aiConfig?.available
                  ? `Powered by ${aiConfig.providers?.join(' + ') || 'AI'}`
                  : 'Running in offline mode'
              )}
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClearChat}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#6B7280] bg-white border border-[#E5E7EB] rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <HiOutlineTrash className="w-3.5 h-3.5" />
            Clear Chat
          </button>
        )}
      </div>

      {/* API Key Warning */}
      {!configLoading && !aiConfig?.available && (
        <div className="mb-4 shrink-0 flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
          <HiOutlineExclamationTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">AI API keys not configured</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Configure your Gemini and/or Groq API keys in{' '}
              <a href="/settings" className="underline font-medium hover:text-amber-800">Settings &rarr; AI Configuration</a>{' '}
              for full AI capabilities. Currently using offline mode with limited responses.
            </p>
          </div>
        </div>
      )}

      {/* Mode Selector */}
      <div className="flex items-center gap-2 mb-4 shrink-0 overflow-x-auto pb-1">
        {MODES.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                mode === m.id
                  ? 'bg-[#0071DC] text-white shadow-sm'
                  : 'bg-white text-[#6B7280] border border-[#E5E7EB] hover:bg-gray-50'
              }`}
              title={m.description}
            >
              <Icon className="w-3.5 h-3.5" />
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] p-4 mb-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
              <HiOutlineSparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-[#333] mb-1">How can I help you today?</h2>
            <p className="text-sm text-[#6B7280] mb-6 max-w-md">
              I can help with business analysis, draft emails, translate text, search your data, and answer questions about GST, TDS, and Indian accounting.
            </p>

            {/* Quick Prompts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-2xl w-full">
              {QUICK_PROMPTS.map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickPrompt(qp.prompt, qp.mode)}
                  className="text-left px-4 py-3 bg-white border border-[#E5E7EB] rounded-lg hover:border-[#0071DC]/30 hover:shadow-sm transition-all cursor-pointer group"
                >
                  <p className="text-sm font-medium text-[#333] group-hover:text-[#0071DC] transition-colors">
                    {qp.label}
                  </p>
                  <p className="text-xs text-[#9CA3AF] mt-0.5 line-clamp-2">{qp.prompt}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <MessageBubble key={idx} message={msg} />
            ))}
            {loading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="shrink-0">
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask ${activeMode?.label || 'AI'} assistant...`}
              rows={1}
              className="w-full px-4 py-3 pr-12 border border-[#E5E7EB] rounded-xl text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] resize-none bg-white transition-colors"
              style={{
                minHeight: '48px',
                maxHeight: '120px',
                height: 'auto',
              }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="inline-flex items-center justify-center w-12 h-12 bg-[#0071DC] text-white rounded-xl hover:bg-[#005BB5] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm shrink-0"
          >
            {loading ? (
              <HiOutlineArrowPath className="w-5 h-5 animate-spin" />
            ) : (
              <HiOutlinePaperAirplane className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-[10px] text-[#9CA3AF] mt-2 text-center">
          AI responses may not always be accurate. Verify important information.
        </p>
      </div>
    </div>
  );
}
