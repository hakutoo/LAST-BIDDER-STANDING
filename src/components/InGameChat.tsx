import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage } from '../types/game';
import { ROLE_DEFINITIONS } from '../data/roles';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  myId: string;
  onSendMessage: (text: string) => void;
}

// クイックチャット（定型文）のリスト（絵文字なし）
const QUICK_CHAT_OPTIONS = [
  'よろしくお願いします！',
  'ナイス！',
  'お見事！',
  'くっ…やられた！',
  'ありがとう！',
  'ごめんなさい…',
  '考え中…',
  '対戦ありがとうございました！',
];

// ロールに応じたラベル（絵文字・鮮やか色なし）
const ROLE_BADGES: { [roleId: string]: { label: string } } = {
  juggernaut: { label: 'ジャガーノート' },
  berserker: { label: 'バーサーカー' },
  sentinel: { label: 'センチネル' },
  mage: { label: 'メイジ' },
  inquisitor: { label: 'インクイジター' },
  speedstar: { label: 'スピードスター' },
  assassin: { label: 'アサシン' },
  aegis: { label: 'イージス' },
};

export const InGameChat: React.FC<Props> = ({
  isOpen,
  onClose,
  messages,
  myId,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const [showQuickChats, setShowQuickChats] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 自動スクロール
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom(false);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom(true);
    }
  }, [messages.length, isOpen]);

  if (!isOpen) return null;

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setInputText('');
    setShowQuickChats(false);
  };

  const handleQuickSend = (text: string) => {
    onSendMessage(text);
    setShowQuickChats(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        zIndex: 9000,
        display: 'flex',
        justifyContent: 'flex-end',
        animation: 'actionFadeIn 0.15s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          height: '100%',
          backgroundColor: '#1C1915',
          borderLeft: '2px solid #4A4234',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-6px 0 0 #000',
          boxSizing: 'border-box',
        }}
      >
        {/* ヘッダー */}
        <div
          style={{
            height: '48px',
            padding: '0 16px',
            backgroundColor: '#12100D',
            borderBottom: '1px solid #4A4234',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontWeight: 700,
              color: '#E9DFC8',
              fontSize: '1em',
              fontFamily: '"Shippori Mincho B1", serif',
            }}>
              試合中通信
            </span>
            <span
              style={{
                fontSize: '0.72em',
                color: '#B9975B',
                border: '1px solid #4A4234',
                padding: '1px 6px',
                fontFamily: '"IBM Plex Mono", monospace',
              }}
            >
              {messages.length}件
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="閉じる"
            className="btn-sub"
            style={{
              fontSize: '1.2em',
              padding: '2px 6px',
            }}
          >
            ✕
          </button>
        </div>

        {/* メッセージ一覧 */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {messages.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                color: '#A79B7E',
                marginTop: '40px',
                fontSize: '0.88em',
                lineHeight: 1.6,
              }}
            >
              通信記録はありません。<br />
              定型文や伝言を送信できます。
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === myId;
              const roleBadge = msg.roleId
                ? ROLE_BADGES[msg.roleId] || {
                    label: ROLE_DEFINITIONS[msg.roleId]?.name || msg.roleId,
                  }
                : null;

              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isMe ? 'flex-end' : 'flex-start',
                    maxWidth: '100%',
                  }}
                >
                  {/* 送信者情報 */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginBottom: '3px',
                      fontSize: '0.72em',
                      color: '#A79B7E',
                      fontFamily: '"IBM Plex Mono", monospace',
                    }}
                  >
                    {roleBadge && (
                      <span
                        style={{
                          border: '1px solid #4A4234',
                          color: '#B9975B',
                          padding: '0 4px',
                        }}
                      >
                        {roleBadge.label}
                      </span>
                    )}
                    <span style={{ fontWeight: isMe ? 700 : 'normal', color: isMe ? '#B9975B' : '#E9DFC8' }}>
                      {isMe ? `${msg.senderName} (自分)` : msg.senderName}
                    </span>
                    <span style={{ color: '#665b48' }}>
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>

                  {/* メッセージ吹き出し（電報・札風） */}
                  <div
                    style={{
                      maxWidth: '85%',
                      padding: '8px 12px',
                      backgroundColor: isMe ? '#26221C' : '#12100D',
                      color: '#E9DFC8',
                      border: isMe ? '1px solid #B9975B' : '1px solid #4A4234',
                      fontSize: '0.88em',
                      lineHeight: '1.45',
                      wordBreak: 'break-word',
                      boxShadow: '2px 2px 0 #000',
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* クイックチャット一覧（展開時） */}
        {showQuickChats && (
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: '#12100D',
              borderTop: '1px solid #4A4234',
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '6px',
              maxHeight: '150px',
              overflowY: 'auto',
              flexShrink: 0,
            }}
          >
            {QUICK_CHAT_OPTIONS.map((phrase) => (
              <button
                key={phrase}
                onClick={() => handleQuickSend(phrase)}
                className="btn-normal"
                style={{
                  padding: '6px 8px',
                  fontSize: '0.78em',
                  textAlign: 'left',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {phrase}
              </button>
            ))}
          </div>
        )}

        {/* フッター入力エリア */}
        <div
          style={{
            padding: '10px 12px',
            backgroundColor: '#12100D',
            borderTop: '1px solid #4A4234',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            flexShrink: 0,
          }}
        >
          {/* 定型文トグルボタン */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={() => setShowQuickChats(!showQuickChats)}
              className="btn-normal"
              style={{
                padding: '2px 8px',
                fontSize: '0.75em',
                borderColor: '#B9975B',
                color: '#B9975B',
              }}
            >
              定型伝言 {showQuickChats ? '[閉じる]' : '[開く]'}
            </button>
            <span style={{ fontSize: '0.7em', color: '#A79B7E', fontFamily: '"IBM Plex Mono", monospace' }}>
              {inputText.length} / 100文字
            </span>
          </div>

          {/* 入力欄 & 送信ボタン */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              ref={inputRef}
              type="text"
              placeholder="伝言を入力... (Enterで送信)"
              value={inputText}
              maxLength={100}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{
                flex: 1,
                padding: '8px 10px',
                backgroundColor: '#1C1915',
                color: '#E9DFC8',
                fontSize: '0.88em',
              }}
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim()}
              className="btn-normal"
              style={{
                padding: '0 14px',
                borderColor: inputText.trim() ? '#B9975B' : '#4A4234',
                color: inputText.trim() ? '#B9975B' : '#A79B7E',
                fontSize: '0.88em',
                fontWeight: 700,
              }}
            >
              送信
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 画面上部に表示される新着チャットトースト通知
interface ToastProps {
  message: ChatMessage | null;
  onOpenChat: () => void;
  onDismiss: () => void;
}

export const ChatNotificationToast: React.FC<ToastProps> = ({
  message,
  onOpenChat,
  onDismiss,
}) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 4000);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  const roleBadge = message.roleId ? ROLE_BADGES[message.roleId] : null;

  return (
    <div
      onClick={onOpenChat}
      style={{
        position: 'fixed',
        top: '56px',
        right: '16px',
        maxWidth: '340px',
        backgroundColor: '#1C1915',
        border: '1px solid #B9975B',
        padding: '8px 12px',
        color: '#E9DFC8',
        boxShadow: '4px 4px 0 #000',
        zIndex: 8000,
        cursor: 'pointer',
        animation: 'actionFadeIn 0.2s ease-out',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75em' }}>
          {roleBadge && (
            <span style={{ border: '1px solid #4A4234', color: '#B9975B', padding: '0 4px' }}>
              {roleBadge.label}
            </span>
          )}
          <span style={{ fontWeight: 700, color: '#E9DFC8' }}>{message.senderName}</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="btn-sub"
          style={{
            fontSize: '0.9em',
            padding: 0,
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>
      <div
        style={{
          fontSize: '0.85em',
          color: '#A79B7E',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          lineHeight: '1.3',
        }}
      >
        {message.text}
      </div>
    </div>
  );
};
