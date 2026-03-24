/**
 * 图片库全局状态管理
 */

import { createContext, useContext, useCallback } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { DeepSeekAPI } from '../services/deepseek.js';
import { STORAGE_KEYS } from '../utils/constants.js';

const ImageContext = createContext(null);

/**
 * 压缩图片：最大边 1024px，转 base64
 */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxSide = 1024;
      let { width, height } = img;
      if (width > maxSide || height > maxSide) {
        if (width >= height) {
          height = Math.round((height * maxSide) / width);
          width = maxSide;
        } else {
          width = Math.round((width * maxSide) / height);
          height = maxSide;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      const mimeType = file.type || 'image/jpeg';
      const base64 = canvas.toDataURL(mimeType, 0.82).split(',')[1];
      resolve({ base64, mimeType });
    };
    img.onerror = reject;
    img.src = objectUrl;
  });
}

export function ImageProvider({ children }) {
  const [images, setImages] = useLocalStorage(STORAGE_KEYS.IMAGE_LIBRARY, []);

  const addImage = useCallback(async (file) => {
    const { base64, mimeType } = await compressImage(file);
    const entry = {
      id: `img-${Date.now()}`,
      name: file.name,
      base64,
      mimeType,
      description: '',
      createdAt: new Date().toISOString().split('T')[0]
    };
    setImages(prev => [entry, ...prev]);
    return entry;
  }, [setImages]);

  const updateDescription = useCallback((id, description) => {
    setImages(prev => prev.map(img => img.id === id ? { ...img, description } : img));
  }, [setImages]);

  const updateName = useCallback((id, name) => {
    setImages(prev => prev.map(img => img.id === id ? { ...img, name } : img));
  }, [setImages]);

  const removeImage = useCallback((id) => {
    setImages(prev => prev.filter(img => img.id !== id));
  }, [setImages]);

  const analyzeImage = useCallback(async (id, modelConfig) => {
    const img = images.find(i => i.id === id);
    if (!img) return;
    const description = await DeepSeekAPI.analyzeImage(img.base64, img.mimeType, modelConfig);
    setImages(prev => prev.map(i => i.id === id ? { ...i, description } : i));
    return description;
  }, [images, setImages]);

  return (
    <ImageContext.Provider value={{ images, addImage, updateName, updateDescription, removeImage, analyzeImage }}>
      {children}
    </ImageContext.Provider>
  );
}

export function useImageContext() {
  const ctx = useContext(ImageContext);
  if (!ctx) throw new Error('useImageContext must be used within ImageProvider');
  return ctx;
}
