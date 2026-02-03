import React from 'react';

interface ImageData {
  url: string;
  category?: string;
  description?: string;
}

interface GalleryImageProps {
  image: ImageData;
  index: number;
  onImageClick: (index: number) => void;
}

/**
 * A standalone component for gallery images to ensure proper click handling
 */
const GalleryImage: React.FC<GalleryImageProps> = ({ 
  image, 
  index, 
  onImageClick 
}) => {
  // Direct handler for image click
  const handleClick = () => {
    console.log(`Image ${index} clicked!`);
    onImageClick(index);
  };
  
  return (
    <div 
      className="gallery-image-container relative mb-4 cursor-zoom-in overflow-hidden rounded-lg shadow-md transition-all duration-300 hover:shadow-lg hover:brightness-105"
      onClick={handleClick}
    >
      {/* Hover overlay with text */}
      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 opacity-0 transition-opacity hover:opacity-100 z-10">
        <div className="rounded-full bg-black bg-opacity-60 px-4 py-2 text-center text-white">
          View fullscreen
        </div>
      </div>
      
      {/* The actual image */}
      <img 
        src={image.url} 
        alt={image.category || 'Gallery image'} 
        className="w-full h-auto object-cover rounded-lg"
        loading="lazy"
        onError={(e) => {
          console.error(`Failed to load image at index ${index}:`, image.url);
          e.currentTarget.style.display = 'none';
        }}
      />
      
      {/* Expand icon */}
      <div className="absolute top-2 right-2 z-20 rounded-full bg-black bg-opacity-60 p-2 text-white shadow-lg">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 3 21 3 21 9"></polyline>
          <polyline points="9 21 3 21 3 15"></polyline>
          <line x1="21" y1="3" x2="14" y2="10"></line>
          <line x1="3" y1="21" x2="10" y2="14"></line>
        </svg>
      </div>
      
      {/* Caption */}
      {(image.category || image.description) && (
        <div className="mt-1 italic text-xs text-gray-600">
          {image.category && <span className="font-semibold">{image.category}</span>}
          {image.category && image.description && ': '}
          {image.description && (
            <span>
              {image.description.length > 100 
                ? `${image.description.substring(0, 100)}...` 
                : image.description}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default GalleryImage;