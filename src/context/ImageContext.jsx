/**
 * 图片库全局状态管理
 *
 * 存储分层：二进制存 IndexedDB（见 services/imageStore.js），
 * 元数据存 localStorage。避免图片撑爆 localStorage 5MB 配额。
 */

import { createContext, useContext, useCallback, useEffect, useRef } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { DeepSeekAPI } from '../services/deepseek.js';
import { getImageBlob, setImageBlob, delImageBlob, clearImageBlobs } from '../services/imageStore.js';
import { blobToBase64, canvasToBlob } from '../utils/blobUtils.js';
import { hasLegacyImages } from '../utils/imageMigration.js';
import { STORAGE_KEYS } from '../utils/constants.js';
import { useApp } from './AppContext.jsx';

const ImageContext = createContext(null);

/**
 * 压缩图片：最大边 1024px，返回 Blob
 */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = async () => {
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
      try {
        const blob = await canvasToBlob(canvas, mimeType, 0.82);
        resolve({ blob, mimeType });
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('图片解码失败'));
    };
    img.src = objectUrl;
  });
}

export function ImageProvider({ children }) {
  const { showToast } = useApp();

  const handleStorageError = useCallback((error) => {
    if (error?.name === 'QuotaExceededError') {
      // 图片二进制已在 IndexedDB，元数据仅几百字节，删图片腾不出空间。
      // 现在 localStorage 的主要占用方是对话历史。
      showToast('本地存储空间已满，请到「历史」中清理对话记录', 'error');
    } else {
      showToast('本地存储写入失败', 'error');
    }
  }, [showToast]);

  const [images, setImages] = useLocalStorage(STORAGE_KEYS.IMAGE_LIBRARY, [], handleStorageError);

  // 检测到旧格式（base64 存在 localStorage）时清空重来。
  // 用户已确认旧图片不迁移、重新上传。
  const migrationChecked = useRef(false);
  useEffect(() => {
    if (migrationChecked.current) return;
    migrationChecked.current = true;
    if (hasLegacyImages(images)) {
      setImages([]);
      clearImageBlobs().catch(() => {});
      showToast('图片存储已升级，请重新上传图片', 'info');
    }
  }, [images, setImages, showToast]);

  const addImage = useCallback(async (file) => {
    const { blob, mimeType } = await compressImage(file);
    const id = `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await setImageBlob(id, blob);
    const entry = {
      id,
      name: file.name,
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
    delImageBlob(id).catch(() => {});
  }, [setImages]);

  const analyzeImage = useCallback(async (id, modelConfig) => {
    const img = images.find(i => i.id === id);
    if (!img) return;
    const blob = await getImageBlob(id);
    if (!blob) throw new Error('图片数据缺失，请重新上传');
    const base64 = await blobToBase64(blob);
    const description = await DeepSeekAPI.analyzeImage(base64, img.mimeType, modelConfig);
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
