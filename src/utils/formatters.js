/**
 * 格式化工具
 */

import { FILE_TEMPLATES } from './constants.js';

export const Formatters = {
  /**
   * 格式化日期为文件名友好的格式
   */
  formatDateForFile(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  },

  /**
   * 格式化日期为中文格式
   */
  formatDateForDisplay(date = new Date()) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}年${month}月${day}日`;
  },

  /**
   * 格式化日期时间
   */
  formatDateTime(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  },

  /**
   * 生成文件名
   */
  generateFileName(title, date = new Date()) {
    const formattedDate = this.formatDateForFile(date);
    const cleanTitle = title
      .replace(/[<>:"/\\|?*]/g, '')
      .slice(0, 30);
    return FILE_TEMPLATES.article(formattedDate, cleanTitle);
  },

  /**
   * 格式化选中的参与人员
   */
  formatSelectedPersons(selectedPersons, customCounselorName = '') {
    const personNames = selectedPersons.map(person => {
      if (person.id === 'counselor' && customCounselorName) {
        return `辅导员${customCounselorName}`;
      }
      return person.name;
    });
    return personNames.join('、');
  },

  /**
   * 格式化多行文本为段落
   */
  formatParagraphs(text) {
    return text
      .split('\n')
      .filter(line => line.trim() !== '')
      .join('\n\n');
  },

  /**
   * 截断文本
   */
  truncate(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  },

  /**
   * 转义 HTML 特殊字符
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * 格式化对话历史项摘要
   */
  formatHistorySummary(item) {
    const typeMap = {
      generate: '推文生成',
      optimize: '推文优化',
      edit: '批注修改'
    };
    const type = typeMap[item.type] || item.type;
    const time = this.formatDateTime(item.timestamp);
    return `${type} - ${time}`;
  },

  /**
   * 获取优化方向显示文本
   */
  formatOptimizationType(type) {
    const typeMap = {
      comprehensive: '全面优化',
      checkNames: '检查和修正人名顺序',
      adjustStyle: '调整语言风格为正式书面语',
      improveStructure: '完善推文结构',
      fixPronouns: '优化人称和代词使用'
    };
    return typeMap[type] || type;
  },

  /**
   * 获取批注类型显示文本
   */
  formatAnnotationType(type) {
    const typeMap = {
      rewrite: '重写',
      fix: '修正',
      style: '润色'
    };
    return typeMap[type] || type;
  }
};
