import React from 'react';

// Chat bubble with sparkles icon component - matches the Aro-Ha design exactly
export function ChatBubbleSparkle({ 
  size = 24, 
  color = 'white', 
  className = '',
  ...props 
}: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`chat-bubble-sparkle ${className}`}
      {...props}
    >
      {/* Main chat bubble - simple outline with rounded corners */}
      <rect x="3" y="5" width="14" height="12" rx="2" ry="2" />
      
      {/* Sparkle stars - simple plus signs */}
      <path d="M19 9l2 0" />
      <path d="M20 8l0 2" />
      
      <path d="M21 14l2 0" />
      <path d="M22 13l0 2" />
    </svg>
  );
}

// Four-pointed sparkle star icon component
export function DiamondStar({ 
  size = 24, 
  color = 'currentColor',
  className = '',
  ...props 
}: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="currentColor"
      className={`lucide lucide-sparkle ${className}`}
      {...props}
    >
      {/* Four-pointed star */}
      <path 
        d="M12 2L14 10L22 12L14 14L12 22L10 14L2 12L10 10L12 2Z" 
        fill="currentColor"
        stroke="white"
        strokeWidth="0.5"
      />
      
      {/* Additional sparkle rays */}
      <path 
        d="M12 7L13 5L12 3L11 5L12 7Z" 
        fill="currentColor" 
        stroke="white" 
        strokeWidth="0.3"
      />
      <path 
        d="M12 17L13 19L12 21L11 19L12 17Z" 
        fill="currentColor" 
        stroke="white" 
        strokeWidth="0.3"
      />
      <path 
        d="M7 12L5 13L3 12L5 11L7 12Z" 
        fill="currentColor" 
        stroke="white" 
        strokeWidth="0.3"
      />
      <path 
        d="M17 12L19 13L21 12L19 11L17 12Z" 
        fill="currentColor" 
        stroke="white" 
        strokeWidth="0.3"
      />
    </svg>
  );
}