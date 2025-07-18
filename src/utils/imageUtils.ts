// Image handling utilities for the LaTeX Presentation Editor

export interface ImageInfo {
  width: number;
  height: number;
  aspectRatio: number;
  format: string;
  size: number; // in bytes
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Supported image formats for LaTeX
export const SUPPORTED_IMAGE_FORMATS = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/bmp',
  'image/webp',
  'image/svg+xml'
];

// LaTeX-compatible formats (formats that don't need conversion)
export const LATEX_COMPATIBLE_FORMATS = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/pdf'
];

/**
 * Validates if an image file is supported
 */
export const validateImageFile = (file: File): { isValid: boolean; error?: string } => {
  // Check file type
  if (!SUPPORTED_IMAGE_FORMATS.includes(file.type)) {
    return {
      isValid: false,
      error: `Unsupported image format: ${file.type}. Supported formats: ${SUPPORTED_IMAGE_FORMATS.join(', ')}`
    };
  }

  // Check file size (max 50MB)
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `Image file too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum size: 50MB`
    };
  }

  return { isValid: true };
};

/**
 * Gets image information from a file
 */
export const getImageInfo = (file: File): Promise<ImageInfo> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const info: ImageInfo = {
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio: img.naturalWidth / img.naturalHeight,
        format: file.type,
        size: file.size
      };
      
      URL.revokeObjectURL(url);
      resolve(info);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
};

/**
 * Converts image to base64 data URL
 */
export const imageToDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === 'string') {
        resolve(e.target.result);
      } else {
        reject(new Error('Failed to convert image to data URL'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read image file'));
    };
    
    reader.readAsDataURL(file);
  });
};

/**
 * Converts image to LaTeX-compatible format if needed
 */
export const convertImageForLatex = async (file: File): Promise<{ dataUrl: string; needsConversion: boolean }> => {
  const needsConversion = !LATEX_COMPATIBLE_FORMATS.includes(file.type);
  
  if (!needsConversion) {
    const dataUrl = await imageToDataURL(file);
    return { dataUrl, needsConversion: false };
  }

  // Convert to PNG for LaTeX compatibility
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      
      // Draw image to canvas
      ctx.drawImage(img, 0, 0);
      
      // Convert to PNG data URL
      const dataUrl = canvas.toDataURL('image/png', 0.9);
      resolve({ dataUrl, needsConversion: true });
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for conversion'));
    };

    img.src = URL.createObjectURL(file);
  });
};

/**
 * Crops an image using canvas
 */
export const cropImage = (imageDataUrl: string, cropArea: CropArea): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      canvas.width = cropArea.width;
      canvas.height = cropArea.height;
      
      // Draw cropped portion of image
      ctx.drawImage(
        img,
        cropArea.x, cropArea.y, cropArea.width, cropArea.height, // Source rectangle
        0, 0, cropArea.width, cropArea.height // Destination rectangle
      );
      
      const croppedDataUrl = canvas.toDataURL('image/png', 0.9);
      resolve(croppedDataUrl);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for cropping'));
    };

    img.src = imageDataUrl;
  });
};

/**
 * Resizes an image while maintaining aspect ratio
 */
export const resizeImage = (
  imageDataUrl: string, 
  maxWidth: number, 
  maxHeight: number, 
  quality: number = 0.9
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      const { width, height } = calculateResizeDimensions(
        img.naturalWidth, 
        img.naturalHeight, 
        maxWidth, 
        maxHeight
      );
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw resized image
      ctx.drawImage(img, 0, 0, width, height);
      
      const resizedDataUrl = canvas.toDataURL('image/png', quality);
      resolve(resizedDataUrl);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for resizing'));
    };

    img.src = imageDataUrl;
  });
};

/**
 * Calculates new dimensions while maintaining aspect ratio
 */
export const calculateResizeDimensions = (
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } => {
  const aspectRatio = originalWidth / originalHeight;
  
  let width = originalWidth;
  let height = originalHeight;
  
  // Scale down if larger than max dimensions
  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  }
  
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }
  
  return { width: Math.round(width), height: Math.round(height) };
};

/**
 * Creates a thumbnail from an image
 */
export const createThumbnail = (imageDataUrl: string, size: number = 150): Promise<string> => {
  return resizeImage(imageDataUrl, size, size, 0.8);
};

/**
 * Extracts filename without extension
 */
export const getImageName = (file: File): string => {
  const name = file.name;
  const lastDotIndex = name.lastIndexOf('.');
  return lastDotIndex > 0 ? name.substring(0, lastDotIndex) : name;
};

/**
 * Generates a unique filename for the image
 */
export const generateUniqueImageName = (originalName: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop() || 'png';
  const baseName = originalName.replace(/\.[^/.]+$/, '');
  
  return `${baseName}_${timestamp}_${random}.${extension}`;
};

/**
 * Applies basic image filters
 */
export const applyImageFilter = (
  imageDataUrl: string,
  filter: 'brightness' | 'contrast' | 'grayscale' | 'sepia' | 'blur',
  intensity: number = 1
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      
      // Apply CSS filter to context
      let filterString = '';
      switch (filter) {
        case 'brightness':
          filterString = `brightness(${intensity})`;
          break;
        case 'contrast':
          filterString = `contrast(${intensity})`;
          break;
        case 'grayscale':
          filterString = `grayscale(${intensity})`;
          break;
        case 'sepia':
          filterString = `sepia(${intensity})`;
          break;
        case 'blur':
          filterString = `blur(${intensity}px)`;
          break;
      }
      
      ctx.filter = filterString;
      ctx.drawImage(img, 0, 0);
      
      const filteredDataUrl = canvas.toDataURL('image/png', 0.9);
      resolve(filteredDataUrl);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for filtering'));
    };

    img.src = imageDataUrl;
  });
};

/**
 * Rotates an image by specified degrees
 */
export const rotateImage = (imageDataUrl: string, degrees: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      const radians = (degrees * Math.PI) / 180;
      const sin = Math.abs(Math.sin(radians));
      const cos = Math.abs(Math.cos(radians));
      
      // Calculate new canvas size to fit rotated image
      const newWidth = img.naturalWidth * cos + img.naturalHeight * sin;
      const newHeight = img.naturalWidth * sin + img.naturalHeight * cos;
      
      canvas.width = newWidth;
      canvas.height = newHeight;
      
      // Move to center and rotate
      ctx.translate(newWidth / 2, newHeight / 2);
      ctx.rotate(radians);
      
      // Draw image centered
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      
      const rotatedDataUrl = canvas.toDataURL('image/png', 0.9);
      resolve(rotatedDataUrl);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for rotation'));
    };

    img.src = imageDataUrl;
  });
};

/**
 * Converts image to different format
 */
export const convertImageFormat = (
  imageDataUrl: string,
  targetFormat: 'image/png' | 'image/jpeg' | 'image/webp',
  quality: number = 0.9
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      
      // For JPEG, fill with white background
      if (targetFormat === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      ctx.drawImage(img, 0, 0);
      
      const convertedDataUrl = canvas.toDataURL(targetFormat, quality);
      resolve(convertedDataUrl);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for format conversion'));
    };

    img.src = imageDataUrl;
  });
};