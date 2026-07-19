<div align="center">

# 🖊️ AutoWritingBot

**AI-powered WeChat Official Account article generator with multi-stage pipeline**

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite)](https://vitejs.dev)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](https://github.com/yourname/AutoWritingBot/pulls)

[English](#english) · [功能特性](#-功能特性) · [快速开始](#-快速开始) · [部署](#-生产部署) · [截图](#-截图)

</div>

---

## 简介

AutoWritingBot 是一个面向高校学院公众号编辑的 AI 写作工具。输入活动信息后，系统自动运行 **4 步 Pipeline**，依次完成素材整理 → 初稿生成 → 质量评估 → 精炼优化，全程流式输出，支持随时中断和手动批注修改。

支持 DeepSeek、OpenAI、Claude 等任意 OpenAI 兼容 API。

## ✨ 功能特性

### 🔄 多阶段 AI Pipeline

一键触发，自动完成 4 个步骤，无需手动多次提交：

| 步骤  | 任务                            | 输出                |
| :---: | ------------------------------- | ------------------- |
| **①** | 整理素材 — 结构化分析活动信息   | 画布底部面板        |
| **②** | 生成初稿 — 按规范生成完整推文   | Canvas 实时流式更新 |
| **③** | 质量评估 — 自动审核、列出改进点 | 画布底部面板        |
| **④** | 精炼优化 — 依评估修改输出终稿   | Canvas 实时流式更新 |

### ✍️ Canvas 编辑器

- 预览 / 编辑模式切换
- 选中文字弹出批注气泡，支持**重写 / 修正 / 风格调整**三种类型
- 多条批注可一键批量应用
- 一键复制全文 · 导出 Word（`.docx`）· 打包下载（`.zip`，含文稿与编号图片）

### 📐 格式修正

AI 输出的文本落定时自动修正，导出时再幂等地兜底一次，无需手动排版：

| 项目 | 规则 |
| ---- | ---- |
| 引号 | 英文 `"` `'` → 中文 `“”` `‘’`，按上下文判断开合方向；英文缩写（`don't`）中的撇号保留 |
| 空格 | 删除中文↔中文、中文↔英文/数字之间的空格；英文单词之间、数字之间的空格保留 |
| 字体 | 标题黑体、正文宋体；英文字符同样走宋体，不回退到西文字体 |
| 字号 | 标题三号（16pt）、小标题四号（14pt）、正文五号（10.5pt） |
| 行距 | 单倍行距 |

Markdown 行首标记（`##`、`-`、`1.`、`>`）会先被剥离再修正，标记后的空格不受影响。

流式输出过程中不修正——每个分片都跑会让引号在生成时反复跳变；用户在编辑框逐字输入时也不修正，避免顶飞光标。

### 📦 打包下载

一次性拿到推文与配图，图片按**图片选择器里的勾选顺序**编号，与提示词中喂给模型的「图片1、图片2」严格对应：

```
学院举办AI讲座_2026-07-19.zip
├── 学院举办AI讲座.docx
└── 图片/
    ├── 图片1_开幕式.jpg
    ├── 图片2_领导讲话.jpg
    └── 图片3_合影.png
```

扩展名按图片的实际 MIME 类型推导，不信任原文件名。

### 🤖 多模型支持

- 内置 DeepSeek / OpenAI / Anthropic 预设
- 支持任意 OpenAI 兼容 API（自定义 Base URL）
- 多模型配置，随时切换，配置本地加密存储

### 📝 提示词自定义

Pipeline 四个阶段的提示词全部可在「提示词设置」中改写，改动仅覆盖对应阶段，随时可恢复默认：

`① 整理素材` · `② 生成初稿` · `③ 质量评估` · `④ 精炼优化`

批注应用走独立的编辑提示词——主提示词的「四段结构 + `#` 标题开头」要求会让局部修改重排全文。

### 🖼️ 图片库

- 上传活动图片，AI 自动识别生成描述
- 附加到推文生成时，AI 在对应段落标注插图位置

### 📎 参考推文导入

- 输入微信公众号文章链接，自动提取正文内容作为风格参考

## 🚀 快速开始

### 环境要求

- Node.js ≥ 18
- 任意 OpenAI 兼容 API Key（如 [DeepSeek](https://platform.deepseek.com)）

### 安装

```bash
git clone https://github.com/muxia23/AutoWritingBot.git
cd AutoWritingBot
npm install
npm run dev
```

访问 [http://localhost:5173](http://localhost:5173)

### 首次使用

1. 点击右上角 **「模型管理」**，添加 API Key 和模型配置
2. 在左侧选择活动类型、参与领导，填写活动描述
3. 点击 **「开始生成」**，等待 Pipeline 自动完成

## 📦 生产部署

### 一键部署（Docker，推荐）

服务器需已安装 `docker` 与 `git`：

```bash
curl -fsSL https://raw.githubusercontent.com/muxia23/AutoWritingBot/main/deploy.sh -o deploy.sh
bash deploy.sh 2567          # 参数为端口，默认 2567
```

脚本会拉取代码、构建镜像、重建容器、等待健康检查并校验产物。**可重复执行**，日常更新跑同一条命令即可。

> ⚠️ **反向代理请指向 `http://127.0.0.1:2567`，不要用「静态网站」方式指向 `dist` 目录。**
>
> 静态方式下域名不经过容器，容器更新不会生效；且 Vite 产物文件名带 hash，残留的旧 `index.html` 会引用已被删除的文件，导致整页白屏——此时重启容器无效，因为请求根本没走到容器。
>
> 容器内 nginx 已配好防白屏规则：`index.html` 设 `no-store`，`/assets/` 下的 hash 产物长期强缓存。若外层反代又给 `index.html` 加缓存，会盖掉这条规则。

### 手动构建

```bash
npm run build   # 产物输出到 dist/
```

将 `dist/` 上传至服务器后，**nginx 配置需包含以下内容**（React Router + 微信代理）：

```nginx
server {
    # ... SSL 证书等配置 ...

    root /path/to/dist;

    # ✅ React Router 前端路由
    location / {
        try_files $uri $uri/ /index.html;
    }

    # ✅ 微信公众号文章代理（解决 CORS）
    location /weixin-proxy/ {
        proxy_pass https://mp.weixin.qq.com/;
        proxy_set_header Host mp.weixin.qq.com;
        proxy_set_header User-Agent "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
        proxy_set_header Referer "https://mp.weixin.qq.com/";
        proxy_ssl_server_name on;
        proxy_ssl_protocols TLSv1.2 TLSv1.3;
    }

    # ✅ OpenAI / Anthropic API 代理（两家官方接口不允许浏览器跨域直连）
    # 前端把模型的 API 地址配成 /openai-proxy/v1 或 /anthropic-proxy/v1 即可走这里，
    # 内置预设已默认使用代理路径。DeepSeek、豆包（火山方舟）等允许浏览器直连，无需代理。
    location /openai-proxy/ {
        proxy_pass https://api.openai.com/;
        proxy_ssl_server_name on;
        proxy_set_header Host api.openai.com;
        proxy_http_version 1.1;
        proxy_buffering off;          # SSE 流式输出不能缓冲
        proxy_read_timeout 300s;
    }

    location /anthropic-proxy/ {
        proxy_pass https://api.anthropic.com/;
        proxy_ssl_server_name on;
        proxy_set_header Host api.anthropic.com;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_read_timeout 300s;
    }
}
```

> 仓库自带的 `nginx.conf`（Docker 部署使用）已包含上述全部代理配置；本地开发时 `vite.config.js` 内置了同样的代理路径，开箱即用。

```bash
nginx -t && nginx -s reload
```

## 🗂️ 项目结构

```
src/
├── components/
│   ├── canvas/          # Canvas 编辑器 + 批注组件
│   ├── pipeline/        # Pipeline 状态面板
│   ├── images/          # 图片库相关
│   ├── layout/          # Header、TabNav、Modal
│   └── common/          # Toast、EmptyState 等
├── hooks/
│   ├── usePipeline.js   # 4步 Pipeline 状态管理
│   └── useConversation.js
├── services/
│   ├── deepseek.js      # LLM API 封装（流式 + 普通）
│   └── api.js           # HTTP 层（SSE、AbortController）
├── context/
│   ├── AppContext.jsx   # 模型管理、Toast
│   └── PromptContext.jsx
├── pages/
│   ├── ChatGeneratePage.jsx  # 主页面
│   ├── ImageLibraryPage.jsx
│   └── PromptPage.jsx
└── utils/
    ├── formatText.js         # 格式修正（引号 / 空格 / Markdown 标记隔离）
    ├── exportDocx.js         # Word 文档构造与下载
    ├── exportBundle.js       # 压缩包组装（文稿 + 编号图片）
    ├── parseArticle.js       # 从模型输出中解析标题与正文
    ├── constants.js
    ├── default-prompt.js     # 主提示词
    └── default-step-prompts.js  # Pipeline 各阶段提示词
```

`formatText.js` 是纯函数模块，不依赖 React 或 docx，只做字符串进字符串出，且**幂等**——这是「生成时修正一次、导出时兜底再修正一次」的安全前提，由单元测试锁定。

## ⚙️ 技术栈

| 类别 | 技术                     |
| ---- | ------------------------ |
| 框架 | React 18 + Vite 5        |
| 路由 | React Router DOM 6       |
| 图标 | Lucide React             |
| 状态 | React Context + Hooks    |
| AI   | OpenAI 兼容 SSE 流式接口 |
| 渲染 | react-markdown + remark-gfm |
| 导出 | docx · fflate（zip）     |
| 存储 | localStorage（配置/历史）+ IndexedDB（图片二进制） |
| 测试 | Vitest + jsdom           |

## 🔒 隐私说明

- 所有配置（API Key、提示词、对话历史）存储在浏览器 localStorage，图片二进制存储在 IndexedDB，均**不经过任何中间服务器**
- DeepSeek 等支持浏览器跨域的服务商，API 请求由浏览器**直接发送**至服务商
- OpenAI / Anthropic 官方接口不允许浏览器跨域，请求经由**你自己部署的 nginx 反代**转发（纯转发、不落盘、不记录），不涉及任何第三方中转

## 🤝 Contributing

欢迎提交 Issue 和 Pull Request。

```bash
# 开发
npm run dev

# 测试
npm test

# 代码检查
npm run lint

# 构建
npm run build
```

## 📄 License

[MIT](LICENSE) © 2025

---

<div align="center">

如果这个项目对你有帮助，欢迎点个 ⭐

</div>
