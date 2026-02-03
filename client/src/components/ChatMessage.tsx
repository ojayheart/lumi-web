import React from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';

interface ChatMessageProps {
  content: string;
  isUser: boolean;
  timestamp: Date;
  isMobile: boolean;
}

export const formatTimestamp = (timestamp: Date) => {
  return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const ChatMessage: React.FC<ChatMessageProps> = ({ content, isUser, timestamp, isMobile }) => {
  // If user message, just return the content directly
  if (isUser) {
    return (
      <div className="flex w-full mb-3 justify-end">
        <div className={cn(
          'rounded-lg px-4 py-2 break-words bg-[#8E8F70] text-white',
          isMobile ? 'max-w-[90%]' : 'max-w-[80%]'
        )}>
          <div className={cn(
            isMobile ? "text-base markdown-content" : "text-sm markdown-content",
            "markdown-user"
          )}>
            {content}
          </div>
          <div className="text-xs mt-1 opacity-70 text-right">
            {formatTimestamp(timestamp)}
          </div>
        </div>
      </div>
    );
  }

  // All assistant messages (including images) are rendered as markdown
  // Images come from VoiceFlow as markdown: ![alt](url)
  return renderTextMessage(content, timestamp, isMobile);
};

const renderTextMessage = (content: string, timestamp: Date, isMobile: boolean) => {
  return (
    <div className="flex w-full mb-3 justify-start">
      <div className={cn(
        'rounded-lg px-4 py-2 break-words bg-gray-100 text-gray-800',
        isMobile ? 'max-w-[90%]' : 'max-w-[80%]'
      )}>
        <div className={cn(
          isMobile ? "text-base markdown-content" : "text-sm markdown-content",
          "markdown-assistant"
        )}>
          <ReactMarkdown
            components={{
              a: ({ node, ...props }) => (
                <a {...props} target="_blank" rel="noopener noreferrer" className="text-[#767657] underline" />
              )
            }}
            remarkPlugins={[]}
            rehypePlugins={[]}
            skipHtml={false}
          >
            {content}
          </ReactMarkdown>
        </div>
        <div className="text-xs mt-1 opacity-70 text-right">
          {formatTimestamp(timestamp)}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;