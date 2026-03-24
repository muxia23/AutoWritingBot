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
- 一键复制全文 · 导出 Word（`.docx`）

### 🤖 多模型支持

- 内置 DeepSeek / OpenAI / Anthropic 预设
- 支持任意 OpenAI 兼容 API（自定义 Base URL）
- 多模型配置，随时切换，配置本地加密存储

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
}
```

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
    ├── constants.js
    └── default-prompt.js    # 默认系统提示词
```

## ⚙️ 技术栈

| 类别 | 技术                     |
| ---- | ------------------------ |
| 框架 | React 18 + Vite 5        |
| 路由 | React Router DOM 6       |
| 图标 | Lucide React             |
| 状态 | React Context + Hooks    |
| AI   | OpenAI 兼容 SSE 流式接口 |
| 导出 | docx                     |
| 存储 | localStorage（纯客户端） |

## 🔒 隐私说明

- 所有配置（API Key、提示词、图片库）均存储在**本地浏览器**，不经过任何中间服务器
- API 请求由浏览器直接发送至对应的 AI 服务商

## 🤝 Contributing

欢迎提交 Issue 和 Pull Request。

```bash
# 开发
npm run dev

# 构建
npm run build
```

## 📄 License

[MIT](LICENSE) © 2025

---

<div align="center">

如果这个项目对你有帮助，欢迎点个 ⭐

</div>
