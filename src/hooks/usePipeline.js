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

const STEP_PROMPTS = {
  organize: `你是一位写作助手，请将用户提供的活动信息整理成结构化素材简报，包括：
1. 活动概述（类型/核心内容）
2. 关键参与人员及其身份
3. 活动重点/亮点
4. 建议写作角度和基调

不要生成推文，只输出结构化的素材简报。`,

  evaluate: `你是一位严格的微信公众号编辑，请对推文初稿进行审核，列出需要改进的具体问题：
1. 与原始素材的一致性（是否有不符或遗漏的重要信息）
2. 语言质量（重复用词、生硬表达、语句不通顺）
3. 结构问题（段落逻辑、过渡是否自然）
4. 内容缺失（是否遗漏重要细节）

输出简洁的问题清单，每条问题一行，以"-"开头。如果初稿质量良好，输出"- 整体质量良好"并给出1-2条细节建议。`,

  refine: `请根据评估意见对推文初稿进行修改和完善，输出完整的最终版本。
要求：
- 保留初稿整体结构和核心内容
- 针对每条评估问题进行改进
- 语言流畅自然，符合微信公众号推文风格
- 直接输出完整推文，以 # [标题] 开头，无需任何前缀说明`,
};

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

export function usePipeline({ buildSystemPrompt, activeModel, setCurrentArticle, setCurrentTitle, showToast }) {
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
        STEP_PROMPTS.organize,
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
        STEP_PROMPTS.evaluate,
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
        STEP_PROMPTS.refine,
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
  }, [activeModel, buildSystemPrompt, setCurrentArticle, setCurrentTitle, showToast, resetSteps, updateStep]);

  return { steps, isRunning, currentStepId, isDone, runPipeline, abort, resetSteps };
}
