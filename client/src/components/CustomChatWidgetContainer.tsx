import React, { useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { ChatProvider } from '../contexts/ChatContext';
import CustomChatWidget from './CustomChatWidget';
import { MessageSquare } from 'lucide-react';
import { DiamondStar } from './AIIcons';
import { cn } from '../lib/utils';
import { useIsMobile } from '../hooks/use-mobile';

const STORAGE_KEY_SESSION = 'aro-ha-session-id';

const getOrCreateSessionId = (): string => {
  let sessionId = localStorage.getItem(STORAGE_KEY_SESSION);
  if (!sessionId) {
    sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(STORAGE_KEY_SESSION, sessionId);
  }
  return sessionId;
};

const trackWidgetEvent = async (sessionId: string, eventType: string, metadata?: Record<string, any>) => {
  try {
    await fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        eventType,
        metadata: {
          ...metadata,
          userAgent: navigator.userAgent,
          referrer: document.referrer || window.location.href,
        },
      }),
    });
  } catch (error) {
    console.warn('Failed to track widget event:', error);
  }
};

interface CustomChatWidgetContainerProps {
  isWebflowEmbed?: boolean;
  isInitiallyOpen?: boolean;
  onMinimize?: () => void;
}

export default function CustomChatWidgetContainer({ 
  isWebflowEmbed = false,
  isInitiallyOpen = false,
  onMinimize
}: CustomChatWidgetContainerProps) {
  // State
  const [isMinimized, setIsMinimized] = useState(!isInitiallyOpen);
  const [isHovered, setIsHovered] = useState(false);
  const isMobile = useIsMobile();
  const sessionIdRef = useRef<string>(getOrCreateSessionId());
  const hasTrackedOpen = useRef(false);
  const openTimeRef = useRef<number | null>(null);
  
  // ULTRA AGGRESSIVE removal of any Vite status messages
  // This runs before anything else renders
  useLayoutEffect(() => {
    function aggressivelyRemoveViteStatus() {
      try {
        // Find all fixed position divs that might be the status overlay
        document.querySelectorAll('body > div[style*="position: fixed"]').forEach(el => {
          // Skip our root element
          if (el.id === 'root') return;
          
          // Check if this has status text
          if (el.textContent && 
              (el.textContent.includes('App Status') || 
              el.textContent.includes('Rendering') ||
              el.textContent.includes('If you can see this'))) {
            // Try to remove it
            if (el.parentNode) {
              el.parentNode.removeChild(el);
            }
          }
        });
        
        // Also look for ANY element containing the text
        document.querySelectorAll('body > *').forEach(el => {
          if (el.id === 'root') return;
          
          if (el.textContent && 
              (el.textContent.includes('App Status') || 
              el.textContent.includes('Rendering') ||
              el.textContent.includes('If you can see this'))) {
            // Try to remove it
            if (el.parentNode) {
              try {
                el.parentNode.removeChild(el);
              } catch (e) {
                // Couldn't remove, try to hide
                const htmlEl = el as HTMLElement;
                htmlEl.style.display = 'none';
                htmlEl.style.visibility = 'hidden';
                htmlEl.style.opacity = '0';
                htmlEl.style.position = 'absolute';
                htmlEl.style.zIndex = '-9999';
              }
            }
          }
        });
      } catch (err) {
        // Silent fail
      }
    }
    
    // Run immediately and repeatedly
    aggressivelyRemoveViteStatus();
    const intervalId = setInterval(aggressivelyRemoveViteStatus, 100);
    
    // Also inject a style to hide messages
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      /* Hide ALL status messages */
      body > div:not(#root):not(.widget-container) {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(styleEl);
    
    return () => {
      clearInterval(intervalId);
      if (styleEl.parentNode) {
        styleEl.parentNode.removeChild(styleEl);
      }
    };
  }, []);
  
  // Toggle minimized state
  const handleMinimizeToggle = useCallback(() => {
    const newIsMinimized = !isMinimized;
    setIsMinimized(newIsMinimized);
    
    // Track widget open/close events
    if (!newIsMinimized) {
      // Widget is being opened
      openTimeRef.current = Date.now();
      trackWidgetEvent(sessionIdRef.current, 'widget_open');
      
      // Track chat_start only once per session
      if (!hasTrackedOpen.current) {
        hasTrackedOpen.current = true;
        trackWidgetEvent(sessionIdRef.current, 'chat_start');
      }
    } else {
      // Widget is being closed
      const duration = openTimeRef.current ? Math.round((Date.now() - openTimeRef.current) / 1000) : 0;
      trackWidgetEvent(sessionIdRef.current, 'widget_close', { duration });
      openTimeRef.current = null;
    }
    
    // Call onMinimize callback if provided and widget is being minimized
    if (newIsMinimized && onMinimize) {
      onMinimize();
    }
    
    // Notify parent window about widget state changes (for embedded iframe use)
    if (window.parent !== window) {
      try {
        window.parent.postMessage({
          type: 'widget-state',
          isMinimized: newIsMinimized
        }, '*');
      } catch (err) {
        console.error('Failed to notify parent window:', err);
      }
    }
  }, [isMinimized, onMinimize]);
  
  // Preload text normalization service to ensure it's ready for transcriptions
  useEffect(() => {
    const preloadNormalizationService = async () => {
      try {
        console.log('Preloading text normalization service...');
        // Dynamic import to avoid slowing down initial page load
        const { textNormalizationService } = await import('../lib/api/textNormalizationService');
        
        // Initialize the service with a simple test
        const result = await textNormalizationService.normalizeText('test twenty-five on august third');
        console.log('Text normalization service preloaded successfully:', result);
      } catch (error) {
        console.warn('Failed to preload text normalization service:', error);
        // Non-blocking - we'll retry later when needed
      }
    };

    // Run preload with a slight delay to allow initial page render
    const timeoutId = setTimeout(preloadNormalizationService, 2000);
    return () => clearTimeout(timeoutId);
  }, []);

  // Add additional CSS classes for webflow embedding
  useEffect(() => {
    if (isWebflowEmbed) {
      // Add special CSS for webflow embed
      const style = document.createElement('style');
      style.textContent = `
        html, body, #root {
          background: transparent !important;
          overflow: hidden !important;
          width: 100% !important;
          height: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          pointer-events: none !important;
        }
        
        .chat-button {
          pointer-events: auto !important;
        }
        
        .chat-widget {
          pointer-events: auto !important;
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        if (style.parentNode) {
          style.parentNode.removeChild(style);
        }
      };
    }
  }, [isWebflowEmbed]);

  return (
    <ChatProvider>
      <div className="fixed bottom-0 right-0 z-20 flex flex-col items-end" style={{ pointerEvents: 'none' }}>
        {/* Chat Widget */}
        <div
          className={`transition-all duration-300 ease-in-out mb-3 chat-widget ${!isMinimized ? 'expanded' : ''}`}
          style={{
            opacity: isMinimized ? 0 : 1,
            transform: isMinimized ? 'translateY(20px)' : 'translateY(0)',
            // Explicitly handle pointer events when open
            pointerEvents: isMinimized ? 'none' : 'auto',
            width: isMobile ? '100vw' : 'auto',
            height: isMobile ? '100%' : '580px',
            position: isMobile && !isMinimized ? 'fixed' : 'relative',
            top: isMobile && !isMinimized ? '0' : 'auto',
            right: isMobile && !isMinimized ? '0' : 'auto',
            bottom: isMobile && !isMinimized ? '0' : 'auto',
            left: isMobile && !isMinimized ? '0' : 'auto',
            // Ensure the widget doesn't block page interaction when minimized
            zIndex: isMinimized ? -1 : 1000,
          }}
        >
          <CustomChatWidget 
            isMinimized={isMinimized} 
            onMinimize={handleMinimizeToggle} 
          />
        </div>
        
        {/* Chat Toggle Button - Force pointer-events: auto to ensure it's clickable */}
        {(isMinimized || !isMobile) && (
          <div className="relative mb-4 sm:mb-0 mr-4 sm:mr-0" style={{ pointerEvents: 'auto', zIndex: 9999 }}>
            <button
              onClick={handleMinimizeToggle}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className={cn(
                "flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-300",
                isMinimized
                  ? "bg-[#8E8F70] text-white hover:bg-[#8E8F70]/90"
                  : "bg-white border border-gray-300 text-gray-700"
              )}
              style={{ 
                pointerEvents: 'auto', 
                position: 'relative',
                zIndex: 9999,
                cursor: 'pointer'
              }}
            >
              <div className="relative">
                {isMinimized ? (
                  <>
                    <MessageSquare size={24} />
                    {/* Stars decoration */}
                    <DiamondStar 
                      size={12} 
                      className="absolute -top-1 -right-1 text-white"
                    />
                    <DiamondStar 
                      size={9} 
                      className="absolute -top-1.5 right-0.5 text-white"
                    />
                    <DiamondStar 
                      size={7} 
                      className="absolute -top-0.5 -right-2 text-white"
                    />
                  </>
                ) : (
                  <MessageSquare size={24} />
                )}
              </div>
            </button>
            
            {/* Tooltip - Only show on desktop */}
            {!isMobile && (
              <div
                className={cn(
                  "absolute right-full mr-3 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap transition-opacity",
                  isHovered ? "opacity-100" : "opacity-0"
                )}
                style={{ top: '50%', transform: 'translateY(-50%)' }}
              >
                {isMinimized ? 'Open Chat' : 'Minimize Chat'}
              </div>
            )}
          </div>
        )}
      </div>
    </ChatProvider>
  );
}