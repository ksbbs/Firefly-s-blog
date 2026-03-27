# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Firefly 是一款基于 Astro 框架的博客主题模板，使用 Tailwind CSS 和 TypeScript 开发。项目支持多语言、全文搜索、页面过渡动画等功能。

## 常用命令

```bash
# 开发
pnpm dev              # 启动开发服务器 (localhost:4321)
pnpm build            # 构建生产版本（包含图标生成和 Pagefind 搜索索引）
pnpm preview          # 预览构建结果

# 代码质量
pnpm check            # Astro 类型检查
pnpm type-check       # TypeScript 类型检查
pnpm lint             # Biome 代码检查（自动修复）
pnpm format           # Biome 代码格式化

# 内容创作
pnpm new-post <filename>   # 创建新文章（支持 .md 或 .mdx）
```

## 环境要求

- Node.js ≥ 22
- pnpm ≥ 9（项目强制使用 pnpm，有 preinstall 钩子检查）

## 项目结构

```
src/
├── config/           # 配置文件（模块化设计）
│   ├── index.ts      # 配置导出入口
│   ├── siteConfig.ts # 站点核心配置（标题、URL、主题色等）
│   ├── sidebarConfig.ts  # 侧边栏布局
│   └── ...           # 其他功能配置
├── components/       # UI 组件
│   ├── common/       # 通用组件（Button, Icon, Pagination 等）
│   ├── layout/       # 布局组件（Navbar, Footer, Sidebar 等）
│   ├── widget/       # 侧边栏小部件（Profile, Calendar, Music 等）
│   ├── features/     # 功能组件（音乐播放器、看板娘、樱花特效等）
│   └── pages/        # 页面专用组件
├── layouts/          # 页面布局
│   ├── Layout.astro  # 主布局（包含主题初始化、Swup 钩子等）
│   └── MainGridLayout.astro  # 网格布局
├── pages/            # 页面路由
├── content/posts/    # 博客文章（Markdown/MDX）
├── i18n/             # 国际化（支持 zh_CN, zh_TW, en, ja, ru）
├── types/            # TypeScript 类型定义
├── utils/            # 工具函数
├── plugins/          # Astro 插件（自定义 remark/rehype 插件）
└── styles/           # 样式文件
```

## 配置系统

配置采用模块化设计，所有配置从 `src/config/index.ts` 统一导出。主要配置文件：

- `siteConfig.ts` - 站点基础配置（标题、URL、主题色、页面开关等）
- `sidebarConfig.ts` - 侧边栏组件配置和位置
- `profileConfig.ts` - 用户资料
- `commentConfig.ts` - 评论系统（支持 Giscus, Twikoo, Waline 等）
- `navBarConfig.ts` - 导航栏菜单

修改配置后可能需要重启开发服务器才能生效。

## 路径别名

在 tsconfig.json 中定义：
- `@components/*` → `src/components/*`
- `@layouts/*` → `src/layouts/*`
- `@utils/*` → `src/utils/*`
- `@i18n/*` → `src/i18n/*`
- `@constants/*` → `src/constants/*`
- `@/*` → `src/*`

## 文章 Frontmatter

```yaml
---
title: 文章标题
published: 2025-01-01
description: 文章描述
image: './cover.jpg'  # 或 "api" 使用随机封面
tags: [Tag1, Tag2]
category: 分类
draft: false
lang: zh-CN      # 可选，与站点语言不同时设置
pinned: false    # 置顶
comment: true    # 允许评论
---
```

## 核心技术栈

- **Astro 6.x** - 静态站点生成
- **Tailwind CSS 4.x** - 样式框架
- **Svelte 5.x** - 交互组件
- **Swup** - 页面过渡动画
- **Pagefind** - 全文搜索
- **Biome** - 代码格式化和 Lint（替代 ESLint/Prettier）

## 构建流程

`pnpm build` 执行顺序：
1. `scripts/generate-icons.js` - 生成图标
2. `astro build` - Astro 构建
3. `pagefind --site dist` - 生成搜索索引

## 注意事项

- 使用 Tab 缩进（Biome 配置）
- Astro/Svelte 文件中的未使用导入会被忽略（Biome override 配置）
- 项目使用 pnpm，不要使用 npm 或 yarn
- 修改 `src/content/posts/` 下的文章需要重新构建才能更新搜索索引
