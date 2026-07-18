# AutoWritingBot 优化设计

日期：2026-07-18

## 背景

用户提出四个问题：希望能导入之前的聊天对话、pipeline 面板可收起、领导名字数限制偏紧、服务器跑一段时间后网页打不开需重启。

排查过程中额外发现一个严重缺陷：图片库以 base64 存 localStorage，约 25 张图即撑爆 5MB 配额，且写入失败被静默吞掉，会连带导致所有其他数据（对话历史、API key、模型配置、提示词）静默存不进去。此问题一并修复。

## 范围

四项独立改动 + 一项衍生修复：

| # | 项目 | 性质 |
|---|------|------|
| 1 | 图片库迁移到 IndexedDB | 缺陷修复（前置） |
| 2 | ChatGeneratePage 接入对话历史 | 新功能 |
| 3 | Pipeline 面板可折叠 | 交互改进 |
| 4 | 领导名字数上限 20 → 30 | 一行改动 |
| 5 | nginx 缓存修复 + 部署加固 | 缺陷修复 |

**实施顺序**：1 → 2 → 3 → 4 → 5。第 1 项必须先做，因为第 2 项的历史记录同样写 localStorage，配额不腾出来就会踩同一个坑。

### 明确不做

- **不查前端内存泄漏。** 现象（服务端「打不开」）和纯静态 SPA 的架构不匹配。若第 5 项的验证步骤证伪缓存假说，再单独开一轮排查。
- **不清理死代码。** `EditorPage.jsx`、`GeneratePage.jsx` 及其独有组件（`ArticleEditor`、`AnnotationDialog`、`AnnotationMarker`）未被 `App.jsx` 注册任何路由，是不可达代码。本轮不动，另开一轮清理。
- **不迁移旧图片。** 用户确认可以重新上传。

## 1. 图片库迁移到 IndexedDB

### 问题

`ImageContext.jsx:36` 把压缩后的图片转成 base64，`:47` 将整个数组塞进 localStorage。1024px JPEG @ 0.82 约 150KB，base64 膨胀 33% 后约 200KB/张，localStorage 全域上限 5MB，约 25 张即满。

`useLocalStorage.js:22-30` 的 `setValue` 中，`setStoredValue` 先于 `localStorage.setItem` 执行，setItem 抛出的 `QuotaExceededError` 被 catch 后仅 `console.error`。结果是 React state 更新成功、UI 显示正常，但数据未落盘，刷新后丢失，且用户无任何感知。配额一旦被图片占满，其他所有 key 的写入同样失败。

### 方案

**存储分层**：图片二进制存 IndexedDB（Blob），元数据留在 localStorage。

- 新增依赖 `idb-keyval`（约 600 字节）
- 新增 `src/services/imageStore.js`，封装三个函数：`getImageBlob(id)`、`setImageBlob(id, blob)`、`delImageBlob(id)`
- `compressImage` 改用 `canvas.toBlob(cb, mimeType, 0.82)` 返回 Blob，不再走 `toDataURL`
- localStorage 中每条图片记录的字段变为：`{ id, name, mimeType, description, createdAt }`，**不含 base64**

**base64 消费点改造**（全库仅三处）：

1. `ImagePickerModal.jsx:58` 缩略图 — 改用 `URL.createObjectURL(blob)`
2. `ImageLibraryPage.jsx:139` 缩略图 — 同上
3. `deepseek.js:145` `analyzeImage` — 调用前从 IndexedDB 取 Blob，用 `FileReader.readAsDataURL` 转 base64

**object URL 必须回收**：新增 `src/hooks/useObjectUrl.js`，在 effect cleanup 中调 `URL.revokeObjectURL`。缩略图列表若不回收会造成真实的内存泄漏——这是本项目唯一有实据的泄漏风险点。

**生成主流程不受影响**：`ChatGeneratePage.jsx:106-109` 构造提示词时只读 `img.description` 文本，从不发送图片二进制给模型。

**旧数据处理**：`ImageProvider` 初始化时，若检测到任一条目含 `base64` 字段，判定为旧格式，清空图片库并 toast 提示「图片存储已升级，请重新上传图片」。

**衍生修复**：`useLocalStorage` 增加可选第三参数 `onError(error)`，在 catch 中调用。不传时行为与现在完全一致，现有调用方无需改动。`ImageProvider` 与对话历史传入 `onError`，用 `showToast` 明确报错。

## 2. ChatGeneratePage 接入对话历史

### 问题

`useConversationHistory` 与 `ConversationHistory`/`ConversationItem`/`ImportExport` 组件均已实现完整的增删改查与导入导出，但仅被 `EditorPage`、`GeneratePage` 引用——而这两个页面无路由、不可达。当前唯一在用的 `ChatGeneratePage` 完全没有接入，**生成的内容从未被保存**。

因此「导入之前的对话」的前提是先实现「保存」。

### 方案

**保存**：`ChatGeneratePage` 引入 `useConversationHistory`，在 pipeline 的 `isDone` 由 false 翻转为 true 时调用 `addConversation`：

```js
{
  title: currentTitle,
  output: currentArticle,
  type: 'chat',
  input: {
    userInput,
    activityType: selectedActivityType,
    persons: orderedPersons,
    imageIds: selectedImages.map(i => i.id),
    articleRefs,
  }
}
```

`addConversation` 现有签名已支持自由形态的 `input` 对象，无需改结构。

**读取**：左侧栏顶部新增「历史」入口，打开 `ConversationHistory` 面板。选中一条记录后恢复：正文与标题写回画布，活动类型与领导顺序写回左侧配置，图片按 `imageIds` 从图片库反查（图片已存在 IndexedDB，历史只存 id 引用，不重复占空间）。

**覆盖确认**：当前画布已有内容时，恢复前弹确认框，避免丢失未保存内容。

**容量上限**：`addConversation` 中对历史数组做 `.slice(0, 30)`，超出自动淘汰最旧记录。推文正文动辄数千字，不设上限迟早重蹈图片的覆辙。

**类型区分**：不需要。`EditorPage`/`GeneratePage` 不可达，历史中只会存在 `type: 'chat'` 一种格式。

## 3. Pipeline 面板可折叠

### 问题

`ChatGeneratePage.jsx:407` 的渲染条件是 `steps.some(s => s.status !== 'pending')`——只要跑过一次，面板就永久占据画布底部，无法收起。

### 方案

折叠状态收敛在 `PipelinePanel` 内部，父组件只需多传一个 `isDone` prop。

- 运行中（`isRunning`）强制展开，用户需要看进度
- `isDone` 翻转为 true 时自动折叠为单行摘要：`✓ 已完成 4 步 · 点击展开`
- 标题栏可手动点击展开/收起
- 折叠状态不持久化，每次新生成重新展开

## 4. 领导名字数上限

`ChatGeneratePage.jsx:296` 的 `maxLength={20}` 改为 `30`。

## 5. nginx 缓存修复 + 部署加固

### 诊断

用户提供的容器日志显示 `signal 3 (SIGQUIT) received` 且 worker 全部 `exited with code 0`——优雅退出。用户随后确认该次停止是其本人手动执行，故此日志不构成故障现场，不能作为证据。

真正的判别性线索是用户描述的：**「停止后再开启才恢复，重启没用」**。`docker restart` 在服务端语义上等价于 `stop` + `start`，两者若表现不同，说明变量不在服务端。结合「前端渲染全没了」（白屏），指向浏览器缓存：

```nginx
location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";   # 资源缓存一年
}
# index.html 无任何缓存头
```

重新构建部署后 Vite 为 JS 产物生成新 hash，但浏览器仍持有旧 `index.html`（无 `no-store`，浏览器会启发式缓存），旧 html 请求已不存在的 `index-旧hash.js` → 404 → 白屏。「停一会儿再开」有效是因为停机期间请求失败、用户反复刷新冲掉了缓存，而非服务端被修复。

佐证：仓库 `dist/` 中并存 `index-K74axGIa.js` 与 `index-CVRfuIz7.js` 两个不同 hash 的产物。

**此为假说，未经证实。** 故分两步。

### 第一步：验证（零改动）

下次白屏时先不重启，开 DevTools → Network → 刷新，检查是否有 `.js` 文件返回 404。有则假说成立。此步骤不可跳过——若假说错误，后续改动均为无效改动。

### 第二步：修复

`nginx.conf` 增加：

```nginx
location = /index.html {
    add_header Cache-Control "no-store, must-revalidate";
}
```

配套加固（即使假说被证伪也是正确的改进）：

- `Dockerfile` 增加 `HEALTHCHECK`
- 1Panel 中将容器重启策略设为 `unless-stopped`（面板操作，无需改代码）

## 验收标准

1. 上传 30 张以上图片后刷新页面，图片全部保留；localStorage 中不含 base64 数据
2. 图片库页面反复进出后，浏览器内存占用不持续增长（object URL 正确回收）
3. 生成一篇推文后刷新页面，能从历史列表恢复正文、标题、活动类型、领导顺序
4. 历史超过 30 条时最旧记录被淘汰，且不出现静默写入失败
5. Pipeline 运行中保持展开，完成后自动折叠为摘要行，可手动展开
6. 领导名输入框可输入 30 字
7. 重新部署后，浏览器无需强制刷新即可加载到新版本前端
