/**
 * DeepSeek API 自定义 Hook
 */

import { useState, useCallback } from 'react';
import { DeepSeekAPI } from '../services/deepseek.js';
import { ERROR_MESSAGES, SUCCESS_MESSAGES, API_STATUS } from '../utils/constants.js';

export function useDeepSeekAPI() {
  const [status, setStatus] = useState(API_STATUS.IDLE);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');

  const reset = useCallback(() => {
    setStatus(API_STATUS.IDLE);
    setError('');
    setResult('');
  }, []);

  const generateArticle = useCallback(async (skillsPrompt, userPrompt, apiKey) => {
    setStatus(API_STATUS.LOADING);
    setError('');

    try {
      const response = await DeepSeekAPI.generateArticle(skillsPrompt, userPrompt, apiKey);
      setResult(response);
      setStatus(API_STATUS.SUCCESS);
      return response;
    } catch (err) {
      const errorMessage = err.message || ERROR_MESSAGES.API_ERROR;
      setError(errorMessage);
      setStatus(API_STATUS.ERROR);
      throw new Error(errorMessage);
    }
  }, []);

  const optimizeArticle = useCallback(async (skillsPrompt, originalText, optimizationType, apiKey) => {
    setStatus(API_STATUS.LOADING);
    setError('');

    try {
      const response = await DeepSeekAPI.optimizeArticle(skillsPrompt, originalText, optimizationType, apiKey);
      setResult(response);
      setStatus(API_STATUS.SUCCESS);
      return response;
    } catch (err) {
      const errorMessage = err.message || ERROR_MESSAGES.API_ERROR;
      setError(errorMessage);
      setStatus(API_STATUS.ERROR);
      throw new Error(errorMessage);
    }
  }, []);

  const applyAnnotations = useCallback(async (skillsPrompt, articleText, annotations, apiKey, globalOptimize = false) => {
    setStatus(API_STATUS.LOADING);
    setError('');

    try {
      const response = await DeepSeekAPI.applyAnnotations(skillsPrompt, articleText, annotations, apiKey, globalOptimize);
      setResult(response);
      setStatus(API_STATUS.SUCCESS);
      return response;
    } catch (err) {
      const errorMessage = err.message || ERROR_MESSAGES.API_ERROR;
      setError(errorMessage);
      setStatus(API_STATUS.ERROR);
      throw new Error(errorMessage);
    }
  }, []);

  return {
    status,
    error,
    result,
    isLoading: status === API_STATUS.LOADING,
    isSuccess: status === API_STATUS.SUCCESS,
    isError: status === API_STATUS.ERROR,
    reset,
    generateArticle,
    optimizeArticle,
    applyAnnotations
  };
}
