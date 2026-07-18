/**
 * 多阶段推文生成 Pipeline
 * 4步自动流转：整理素材 → 生成初稿 → 质量评估 → 精炼优化
 */

import { useState, useRef, useCallback } from 'react';
import { DeepSeekAPI } from '../services/deepseek.js';

const PIPELINE_STEPS = [
  { id: 'organize', name: '整理素材', description: '分析活动信息和参考资料' },
  { id: 'draft',    name: '生成初稿', description: '基于素材生成推文初稿' },
  { id: 'evaluate', name: '质量评估', description: '审核初稿，发现改进点' },
  { id: 'refine',   name: '精炼优化', description: '根据评估意见完善推文' },
];

const STEP_USER_MSGS = {
  draft:    '请根据以上素材简报，按照要求生成推文初稿。',
  evaluate: '请对上面的推文初稿进行质量评估，列出具体问题。',
  refine:   '请根据评估意见，对推文初稿进行修改和优化，输出完整的最终版本。',
};

function parseArticle(text) {
  const lines = text.split('\n');
  for (const line of lines) {
    const match = line.match(/^#\s+\[(.+?)\]/) || line.match(/^#\s+(.+)/);
    if (match) {
      const title = match[1].trim();
      const content = text.slice(text.indexOf(line) + line.length).trim();
      return { title, content: content || text };
    }
  }
  return { title: '', content: text };
}

export function usePipeline({ buildSystemPrompt, getStepPrompt, activeModel, setCurrentArticle, setCurrentTitle, showToast }) {
  const [steps, setSteps] = useState(
    PIPELINE_STEPS.map(s => ({ ...s, status: 'pending', output: '', duration: 0 }))
  );
  const [isRunning, setIsRunning] = useState(false);
  const [currentStepId, setCurrentStepId] = useState(null);
  const [isDone, setIsDone] = useState(false);
  const abortRef = useRef(null);

  const updateStep = useCallback((id, updates) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const resetSteps = useCallback(() => {
    setSteps(PIPELINE_STEPS.map(s => ({ ...s, status: 'pending', output: '', duration: 0 })));
    setCurrentStepId(null);
    setIsDone(false);
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const runPipeline = useCallback(async (inputs) => {
    if (!activeModel?.apiKey) {
      showToast('请先配置 API Key', 'error');
      return;
    }
    if (!inputs.fullInput?.trim()) {
      showToast('请填写活动信息', 'error');
      return;
    }

    resetSteps();
    setIsRunning(true);
    setCurrentArticle('');
    setCurrentTitle('');

    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    // 各步骤共享对话历史
    const history = [];

    try {
      // ── Step 1: 整理素材 ──────────────────────────
      setCurrentStepId('organize');
      updateStep('organize', { status: 'running' });
      const t1 = Date.now();

      history.push({ role: 'user', content: inputs.fullInput });

      let step1Out = '';
      await DeepSeekAPI.chatWithHistoryStream(
        getStepPrompt('organize'),
        history,
        activeModel,
        (_delta, fullText) => {
          step1Out = fullText;
          updateStep('organize', { output: fullText });
        },
        signal
      );
      history.push({ role: 'assistant', content: step1Out });
      updateStep('organize', { status: 'done', output: step1Out, duration: Date.now() - t1 });

      // ── Step 2: 生成初稿 ──────────────────────────
      setCurrentStepId('draft');
      updateStep('draft', { status: 'running' });
      const t2 = Date.now();

      history.push({ role: 'user', content: STEP_USER_MSGS.draft });

      let step2Out = '';
      const articleSystemPrompt = buildSystemPrompt();
      await DeepSeekAPI.chatWithHistoryStream(
        articleSystemPrompt,
        history,
        activeModel,
        (_delta, fullText) => {
          step2Out = fullText;
          const { title, content } = parseArticle(fullText);
          if (title) setCurrentTitle(title);
          setCurrentArticle(content || fullText);
          updateStep('draft', { output: fullText });
        },
        signal
      );
      history.push({ role: 'assistant', content: step2Out });
      const { title: draftTitle, content: draftContent } = parseArticle(step2Out);
      if (draftTitle) setCurrentTitle(draftTitle);
      setCurrentArticle(draftContent || step2Out);
      updateStep('draft', { status: 'done', output: step2Out, duration: Date.now() - t2 });

      // ── Step 3: 质量评估 ──────────────────────────
      setCurrentStepId('evaluate');
      updateStep('evaluate', { status: 'running' });
      const t3 = Date.now();

      history.push({ role: 'user', content: STEP_USER_MSGS.evaluate });

      let step3Out = '';
      await DeepSeekAPI.chatWithHistoryStream(
        getStepPrompt('evaluate'),
        history,
        activeModel,
        (_delta, fullText) => {
          step3Out = fullText;
          updateStep('evaluate', { output: fullText });
        },
        signal
      );
      history.push({ role: 'assistant', content: step3Out });
      updateStep('evaluate', { status: 'done', output: step3Out, duration: Date.now() - t3 });

      // ── Step 4: 精炼优化 ──────────────────────────
      setCurrentStepId('refine');
      updateStep('refine', { status: 'running' });
      const t4 = Date.now();

      history.push({ role: 'user', content: STEP_USER_MSGS.refine });

      let step4Out = '';
      await DeepSeekAPI.chatWithHistoryStream(
        getStepPrompt('refine'),
        history,
        activeModel,
        (_delta, fullText) => {
          step4Out = fullText;
          const { title, content } = parseArticle(fullText);
          if (title) setCurrentTitle(title);
          setCurrentArticle(content || fullText);
          updateStep('refine', { output: fullText });
        },
        signal
      );
      history.push({ role: 'assistant', content: step4Out });
      const { title: finalTitle, content: finalContent } = parseArticle(step4Out);
      if (finalTitle) setCurrentTitle(finalTitle);
      setCurrentArticle(finalContent || step4Out);
      updateStep('refine', { status: 'done', output: step4Out, duration: Date.now() - t4 });

      setIsDone(true);
      setCurrentStepId(null);
      showToast('推文生成完成', 'success');

    } catch (error) {
      if (error.name === 'AbortError') {
        setSteps(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'error' } : s));
        showToast('已中断生成', 'warning');
      } else {
        setSteps(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'error' } : s));
        showToast(error.message, 'error');
      }
      setCurrentStepId(null);
    } finally {
      setIsRunning(false);
    }
  }, [activeModel, buildSystemPrompt, getStepPrompt, setCurrentArticle, setCurrentTitle, showToast, resetSteps, updateStep]);

  return { steps, isRunning, currentStepId, isDone, runPipeline, abort, resetSteps };
}
