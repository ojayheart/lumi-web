import { AlertCircle } from "lucide-react";
import { useEffect, useRef } from "react";

interface WidgetFrameProps {
  widgetType: 'voiceflow' | 'elevenlabs';
  isActive: boolean;
  loadStatus: 'loading' | 'loaded' | 'error';
  onRetry: () => void;
}

export default function WidgetFrame({ 
  widgetType, 
  isActive, 
  loadStatus, 
  onRetry 
}: WidgetFrameProps) {
  const colorClass = widgetType === 'voiceflow' ? 'border-primary' : 'border-accent';
  const spinnerColorClass = widgetType === 'voiceflow' ? 'border-primary' : 'border-accent';
  const buttonColorClass = widgetType === 'voiceflow' ? 'bg-primary hover:bg-blue-600' : 'bg-accent hover:bg-violet-600';
  const visibilityUpdateApplied = useRef(false);
  
  // Update visibility when widget active status changes
  useEffect(() => {
    // Get the container element
    const widgetElement = document.getElementById(`${widgetType}-widget`);
    
    if (widgetElement) {
      // Set display based on active state
      widgetElement.style.display = isActive ? 'block' : 'none';
    }
    
    // Also ensure the embedded widget is visible/hidden properly
    if (widgetType === 'voiceflow') {
      const vfWidget = document.getElementById('vf-widget');
      if (vfWidget) {
        vfWidget.style.display = isActive ? 'block' : 'none';
      }
    }
    
    if (widgetType === 'elevenlabs') {
      const elWidget = document.querySelector('elevenlabs-convai');
      if (elWidget instanceof HTMLElement) {
        elWidget.style.display = isActive ? 'block' : 'none';
      }
    }
  }, [isActive, widgetType]);
  
  // Don't render the container at all if it's not active
  if (!isActive) {
    return (
      <div 
        id={`${widgetType}-container`}
        className="hidden"
        style={{ display: 'none', visibility: 'hidden', position: 'absolute', zIndex: -1 }}
      />
    );
  }
  
  return (
    <div 
      id={`${widgetType}-container`}
      className={`w-80 h-[500px] bg-white rounded-lg shadow-lg overflow-hidden border transition-all duration-300 ease-in-out ${colorClass}`}
    >
      {/* Widget Content */}
      <div id={`${widgetType}-widget`} className="w-full h-full"></div>

      {/* Loading State */}
      {loadStatus === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-white">
          <div className="flex flex-col items-center">
            <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${spinnerColorClass}`}></div>
            <p className="mt-4 text-gray-600">Loading {widgetType === 'voiceflow' ? 'Voiceflow' : 'ElevenLabs'}...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {loadStatus === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-white p-4">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Failed to load {widgetType === 'voiceflow' ? 'Voiceflow' : 'ElevenLabs'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">Please try refreshing the page.</p>
            <div className="mt-3">
              <button 
                onClick={onRetry}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${buttonColorClass}`}
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
