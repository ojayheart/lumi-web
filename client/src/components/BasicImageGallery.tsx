import React, { useState } from 'react';

interface ImageProps {
  url: string;
  category?: string;
  description?: string;
}

interface GalleryProps {
  images: ImageProps[];
}

/**
 * A very basic, minimal image gallery component that focuses on reliability
 */
const BasicImageGallery: React.FC<GalleryProps> = ({ images }) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  
  if (!images || images.length === 0) {
    return null;
  }
  
  // Function to handle image click and open the modal
  const handleImageClick = (index: number) => {
    console.log('Image clicked:', index);
    setSelectedImageIndex(index);
  };
  
  // Function to close the modal
  const closeModal = () => {
    setSelectedImageIndex(null);
  };
  
  // Navigate to the next image
  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedImageIndex === null) return;
    setSelectedImageIndex((selectedImageIndex + 1) % images.length);
  };
  
  // Navigate to the previous image
  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedImageIndex === null) return;
    setSelectedImageIndex((selectedImageIndex - 1 + images.length) % images.length);
  };
  
  return (
    <div className="my-3 space-y-3">
      {/* Image thumbnails */}
      {images.map((image, index) => (
        <div key={index} className="image-thumbnail-container mb-3">
          <button 
            type="button"
            onClick={() => handleImageClick(index)}
            style={{ display: 'block', width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            aria-label={`View ${image.category || 'image'} fullscreen`}
          >
            <div className="relative rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300">
              <img 
                src={image.url} 
                alt={image.category || 'Gallery image'} 
                className="w-full h-auto object-cover rounded-lg"
                style={{ maxHeight: '350px' }}
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black bg-opacity-20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm">
                  Click to view
                </span>
              </div>
              <div className="absolute top-2 right-2 bg-black bg-opacity-70 p-1 rounded-full">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <polyline points="9 21 3 21 3 15"></polyline>
                  <line x1="21" y1="3" x2="14" y2="10"></line>
                  <line x1="3" y1="21" x2="10" y2="14"></line>
                </svg>
              </div>
            </div>
          </button>
          
          {/* Caption */}
          {(image.category || image.description) && (
            <div className="text-xs text-gray-600 mt-1 italic">
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
      ))}
      
      {/* Fullscreen modal */}
      {selectedImageIndex !== null && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[9999]"
          onClick={closeModal}
          style={{ touchAction: 'none' }}
        >
          <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
            {/* Close button */}
            <button 
              className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-full"
              onClick={closeModal}
              aria-label="Close gallery"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            
            {/* Navigation buttons */}
            <div className="w-full h-full flex items-center justify-between">
              {images.length > 1 && (
                <button
                  className="bg-black bg-opacity-50 text-white p-2 rounded-full mx-2"
                  onClick={prevImage}
                  aria-label="Previous image"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                </button>
              )}
              
              <div className="flex-1 flex items-center justify-center">
                <img
                  src={images[selectedImageIndex].url}
                  alt={images[selectedImageIndex].category || 'Gallery image'}
                  className="max-h-[85vh] max-w-full object-contain"
                />
              </div>
              
              {images.length > 1 && (
                <button
                  className="bg-black bg-opacity-50 text-white p-2 rounded-full mx-2"
                  onClick={nextImage}
                  aria-label="Next image"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              )}
            </div>
            
            {/* Caption */}
            <div className="absolute bottom-10 left-0 right-0 text-center text-white p-4">
              {images[selectedImageIndex].category && (
                <div className="font-bold text-lg mb-1">
                  {images[selectedImageIndex].category}
                </div>
              )}
              {images[selectedImageIndex].description && (
                <div className="max-w-2xl mx-auto">
                  {images[selectedImageIndex].description}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BasicImageGallery;