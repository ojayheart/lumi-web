import { useState } from 'react';

type WidgetType = 'voiceflow' | 'elevenlabs';
type LoadStatus = 'loading' | 'loaded' | 'error';

interface WidgetState {
  activeWidget: WidgetType;
  loadStatus: {
    voiceflow: LoadStatus;
    elevenlabs: LoadStatus;
  };
  setActiveWidget: (widget: WidgetType) => void;
  setLoadStatus: (widget: WidgetType, status: LoadStatus) => void;
}

export function useWidgetState(): WidgetState {
  const [activeWidget, setActiveWidget] = useState<WidgetType>('elevenlabs');
  const [loadStatus, setLoadStatusState] = useState<{
    voiceflow: LoadStatus;
    elevenlabs: LoadStatus;
  }>({
    voiceflow: 'loading',
    elevenlabs: 'loading',
  });

  const setLoadStatus = (widget: WidgetType, status: LoadStatus) => {
    setLoadStatusState(prevState => ({
      ...prevState,
      [widget]: status,
    }));
  };

  return {
    activeWidget,
    loadStatus,
    setActiveWidget,
    setLoadStatus,
  };
}
