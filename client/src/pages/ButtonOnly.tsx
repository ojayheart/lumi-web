import { useState, useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';

export default function ButtonOnly() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Listen for messages from parent window
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'chat-opened') {
        setIsOpen(true);
      } else if (event.data && event.data.type === 'chat-closed') {
        setIsOpen(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleClick = () => {
    // Send message to parent window to toggle chat
    window.parent.postMessage({ type: 'toggle-chat' }, '*');
  };

  return (
    <div className="w-full h-full flex items-center justify-center">
      <button
        onClick={handleClick}
        className={`
          w-14 h-14 rounded-full transition-all duration-300 ease-in-out
          flex items-center justify-center
          shadow-lg hover:shadow-xl
          transform hover:scale-105 active:scale-95
          ${isOpen 
            ? 'bg-gray-600 hover:bg-gray-700' 
            : 'bg-[#8E8F70] hover:bg-[#7A7B5F]'
          }
        `}
        title={isOpen ? "Close chat" : "Open Aro Ha AI Assistant"}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageCircle className="w-6 h-6 text-white" />
        )}
      </button>
    </div>
  );
}