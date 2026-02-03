
import { imageService } from './services/imageService';

async function testImageService() {
  const testPrompt = "Tell me about the sauna facilities at Aro Ha";
  console.log('Testing image service with prompt:', testPrompt);
  
  try {
    const shouldShow = await imageService.shouldShowImage(testPrompt);
    console.log('Should show image:', shouldShow);
    
    if (shouldShow) {
      const images = await imageService.findRelevantImages(testPrompt);
      console.log('Found images:', JSON.stringify(images, null, 2));
    }
  } catch (error) {
    console.error('Error testing image service:', error);
  }
}

testImageService();
