/**
 * Pipeline 步骤状态面板
 * 显示4个生成步骤的进度、输出和耗时
 */

import { useState } from 'react';
import { CheckCircle, Circle, Loader, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

function formatDuration(ms) {
  if (!ms) return '';
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

export default function PipelinePanel({ steps, isRunning, currentStepId }) {
  const [expandedStep, setExpandedStep] = useState(null);

  const getIcon = (status) => {
    switch (status) {
      case 'done':    return <CheckCircle size={16} className="pipeline-step-icon done" />;
      case 'running': return <Loader size={16} className="pipeline-step-icon running" />;
      case 'error':   return <XCircle size={16} className="pipeline-step-icon error" />;
      default:        return <Circle size={16} className="pipeline-step-icon pending" />;
    }
  };

  return (
    <div className="pipeline-panel">
      {steps.map((step) => {
        const isCurrent = step.id === currentStepId;
        const hasOutput = step.output?.trim();
        const isExpanded = expandedStep === step.id;

        return (
          <div
            key={step.id}
            className={`pipeline-step ${step.status}${isCurrent ? ' current' : ''}`}
          >
            <div
              className="pipeline-step-header"
              onClick={() => hasOutput && !isCurrent && setExpandedStep(isExpanded ? null : step.id)}
              style={{ cursor: hasOutput && !isCurrent ? 'pointer' : 'default' }}
            >
              {getIcon(step.status)}
              <div className="pipeline-step-meta">
                <span className="pipeline-step-name">{step.name}</span>
                <span className="pipeline-step-desc">{step.description}</span>
              </div>
              {step.duration > 0 && (
                <span className="pipeline-step-duration">{formatDuration(step.duration)}</span>
              )}
              {hasOutput && !isCurrent && (
                <span className="pipeline-step-toggle">
                  {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </span>
              )}
            </div>

            {/* 当前步骤实时流式输出 */}
            {isCurrent && hasOutput && (
              <div className="pipeline-step-output streaming">
                {step.output}
              </div>
            )}

            {/* 已完成步骤的可展开输出 */}
            {isExpanded && !isCurrent && hasOutput && (
              <div className="pipeline-step-output">
                {step.output}
              </div>
            )}
          </div>
        );
      })}

      {!isRunning && steps.every(s => s.status === 'pending') && (
        <div className="pipeline-empty-hint">
          <p>填写活动信息后点击「开始生成」</p>
          <p>AI 将自动完成 4 个步骤生成推文</p>
        </div>
      )}
    </div>
  );
}
