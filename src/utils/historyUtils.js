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

/**
 * 合并导入的对话并裁剪到上限
 * 导入一个大备份同样会撞配额，必须和 appendConversation 走同一个上限。
 * @param {Array} history
 * @param {Array} imported
 * @returns {Array}
 */
export function mergeImportedConversations(history, imported) {
  return [...imported, ...history].slice(0, MAX_HISTORY);
}
