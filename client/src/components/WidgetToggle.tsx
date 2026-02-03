import { MessageSquare, Phone, X } from 'lucide-react';
import { useState } from 'react';
import { DiamondStar } from './AIIcons';

interface WidgetToggleProps {
  activeWidget: 'voiceflow' | 'elevenlabs';
  onToggle: (widget: 'voiceflow' | 'elevenlabs') => void;
  onMinimize?: () => void;
  isMinimized?: boolean;
}

export default function WidgetToggle({ 
  activeWidget, 
  onToggle, 
  onMinimize, 
  isMinimized = false 
}: WidgetToggleProps) {
  // State for tracking which button has hover
  const [hoverState, setHoverState] = useState<{
    text: boolean;
    voice: boolean;
    minimize: boolean;
  }>({
    text: false,
    voice: false,
    minimize: false
  });
  
  // Handle toggle clicks
  const handleToggle = (widget: 'voiceflow' | 'elevenlabs') => {
    // When minimized or widget is different, always trigger the toggle
    if (isMinimized || widget !== activeWidget) {
      // Clear all hover states when toggling
      setHoverState({
        text: false,
        voice: false,
        minimize: false
      });
      onToggle(widget);
    }
  };
  
  // Handle minimize click
  const handleMinimize = () => {
    // Clear all hover states when minimizing
    setHoverState({
      text: false,
      voice: false,
      minimize: false
    });
    if (onMinimize) onMinimize();
  };
  
  return (
    <div className="flex flex-col gap-3 widget-toggle-container">
      {/* Minimize button - only show when a widget is visible and not minimized */}
      {!isMinimized && (
        <div className="relative group">
          <button 
            onClick={handleMinimize}
            onMouseEnter={() => setHoverState(prev => ({ ...prev, minimize: true }))}
            onMouseLeave={() => setHoverState(prev => ({ ...prev, minimize: false }))}
            className={`p-2.5 rounded-full transition-all duration-200 focus:outline-none
              bg-[#8E8F70] text-white hover:bg-[#8E8F70]/90 border border-gray-300/40 hover:border-[#B2975A]/50 icon-button-animate`}
            aria-label="Minimize Widget"
            title="Minimize Widget"
          >
            <X size={18} />
          </button>
          
          {/* Tooltip - only visible on hover of this specific button */}
          <div className={`absolute right-full mr-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 transition-opacity ${hoverState.minimize ? 'opacity-100' : 'opacity-0'} pointer-events-none`}
            style={{ top: '50%', transform: 'translateY(-50%)' }}>
            Minimize Widget
          </div>
        </div>
      )}
      
      {/* Text chat button */}
      <div className="relative group">
        <button 
          onClick={() => handleToggle('voiceflow')}
          onMouseEnter={() => setHoverState(prev => ({ ...prev, text: true }))}
          onMouseLeave={() => setHoverState(prev => ({ ...prev, text: false }))}
          className={`p-2.5 rounded-full transition-all duration-200 focus:outline-none 
            ${!isMinimized && activeWidget === 'voiceflow'
              ? 'text-gray-700 border border-gray-300/70 bg-white/80' 
              : 'bg-[#8E8F70] text-white hover:bg-[#8E8F70]/90 border border-gray-300/40 hover:border-[#B2975A]/50'
            } icon-button-animate`}
          aria-label="Switch to Text Chat"
          aria-pressed={!isMinimized && activeWidget === 'voiceflow'}
          title="Text Chat"
        >
          <div className="relative">
            <MessageSquare size={18} />
            {/* Star 1 - Largest */}
            <DiamondStar 
              size={9} 
              className={`absolute -top-1 -right-1 diamond-star-glow ${
                !isMinimized && activeWidget === 'voiceflow'
                  ? 'text-gray-700'
                  : 'text-white'
              }`}
            />
            {/* Star 2 - Medium */}
            <DiamondStar 
              size={7} 
              className={`absolute -top-1.5 right-0.5 diamond-star-glow ${
                !isMinimized && activeWidget === 'voiceflow'
                  ? 'text-gray-700'
                  : 'text-white'
              }`}
            />
            {/* Star 3 - Smallest */}
            <DiamondStar 
              size={5} 
              className={`absolute -top-0.5 -right-2 diamond-star-glow ${
                !isMinimized && activeWidget === 'voiceflow'
                  ? 'text-gray-700'
                  : 'text-white'
              }`}
            />
          </div>
        </button>
        
        {/* Tooltip - only visible on hover of this specific button */}
        <div className={`absolute right-full mr-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 transition-opacity ${hoverState.text ? 'opacity-100' : 'opacity-0'} pointer-events-none`}
          style={{ top: '50%', transform: 'translateY(-50%)' }}>
          {isMinimized 
            ? 'Show Text Chat' 
            : (activeWidget === 'voiceflow' ? 'Currently using Text Chat' : 'Switch to Text Chat')}
        </div>
      </div>
      
      {/* Voice chat button */}
      <div className="relative group">
        <button 
          onClick={() => handleToggle('elevenlabs')}
          onMouseEnter={() => setHoverState(prev => ({ ...prev, voice: true }))}
          onMouseLeave={() => setHoverState(prev => ({ ...prev, voice: false }))}
          className={`p-2.5 rounded-full transition-all duration-200 focus:outline-none 
            ${!isMinimized && activeWidget === 'elevenlabs'
              ? 'text-gray-700 border border-gray-300/70 bg-white/80' 
              : 'bg-[#8E8F70] text-white hover:bg-[#8E8F70]/90 border border-gray-300/40 hover:border-[#B2975A]/50'
            } icon-button-animate`}
          aria-label="Switch to Voice Chat"
          aria-pressed={!isMinimized && activeWidget === 'elevenlabs'}
          title="Voice Chat"
        >
          <div className="relative">
            <Phone size={18} />
            {/* Star 1 - Largest */}
            <DiamondStar 
              size={9} 
              className={`absolute -top-1 -right-1 diamond-star-glow ${
                !isMinimized && activeWidget === 'elevenlabs'
                  ? 'text-gray-700'
                  : 'text-white'
              }`}
            />
            {/* Star 2 - Medium */}
            <DiamondStar 
              size={7} 
              className={`absolute -top-1.5 right-0.5 diamond-star-glow ${
                !isMinimized && activeWidget === 'elevenlabs'
                  ? 'text-gray-700'
                  : 'text-white'
              }`}
            />
            {/* Star 3 - Smallest */}
            <DiamondStar 
              size={5} 
              className={`absolute -top-0.5 -right-2 diamond-star-glow ${
                !isMinimized && activeWidget === 'elevenlabs'
                  ? 'text-gray-700'
                  : 'text-white'
              }`}
            />
          </div>
        </button>
        
        {/* Tooltip - only visible on hover of this specific button */}
        <div className={`absolute right-full mr-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 transition-opacity ${hoverState.voice ? 'opacity-100' : 'opacity-0'} pointer-events-none`}
          style={{ top: '50%', transform: 'translateY(-50%)' }}>
          {isMinimized 
            ? 'Show Voice Chat' 
            : (activeWidget === 'elevenlabs' ? 'Currently using Voice Chat' : 'Switch to Voice Chat')}
        </div>
      </div>
    </div>
  );
}
