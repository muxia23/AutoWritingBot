/**
 * 对话历史工具
 *
 * 推文正文动辄数千字，不设上限会撞 localStorage 配额。
 */

export const MAX_HISTORY = 30;

/**
 * 追加一条对话并淘汰超出上限的最旧记录
 * @param {Array} history
 * @param {Object} conversation
 * @returns {Array}
 */
export function appendConversation(history, conversation) {
  return [conversation, ...history].slice(0, MAX_HISTORY);
}
