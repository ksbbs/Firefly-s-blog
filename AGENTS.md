# AGENTS.md

OpenCode 在 Firefly 仓库的工作指引。只保留容易误判或需要跨文件确认的事实。

## 项目与工具链

- 单包 Astro 7.2.2 静态博客主题，不是 monorepo；UI 主要是 `.astro` + Svelte 5，Tailwind CSS 4 通过 `@tailwindcss/vite` 接入。
- 必须用 pnpm：`packageManager` 固定 `pnpm@11.22.0`，`devEngines.packageManager`（`onFail: download`）负责校验并自动下载匹配版本；npm/yarn 误用会被 `EBADDEVENGINES` 拦截（原 `preinstall` 的 only-allow 已移除）。
- Node 版本按仓库要求使用 `>=22`；CI 在 Node 22 和 24 上跑 check/build。
- `.npmrc` 仅保留 npmmirror/淘宝 registry 配置（pnpm 11 不再从 .npmrc 读取其他设置，原 sharp 等二进制镜像配置已随迁移移除）；`engineStrict` 已移至 `pnpm-workspace.yaml`。除非明确要切源，不要改动 registry。
- 安全覆盖统一放在 `pnpm-workspace.yaml` 顶层 `overrides`（undici、tar、minimatch、serialize-javascript、@babel/*、brace-expansion、js-yaml 等），更新锁文件时注意保留。pnpm 11 起 `package.json` 的 `pnpm` 字段不再被读取，不要写回那里。
- 依赖构建脚本白名单在 `pnpm-workspace.yaml` 的 `allowBuilds`：`esbuild: true`（必需二进制）、`swup: false`（仅捐赠横幅）。新增含 install/postinstall 脚本的依赖时会报 `ERR_PNPM_IGNORED_BUILDS`，按需加入。

## 常用命令

- `pnpm install`：安装依赖；CI 用 `pnpm install --frozen-lockfile`。
- `pnpm dev` / `pnpm start`：启动 Astro dev，默认 `http://localhost:4321`。
- `pnpm build`：完整本地构建，顺序是 `node scripts/generate-icons.js` -> `astro build` -> `pagefind --site dist`。
- `pnpm check`：`astro check`；`pnpm type-check`：`tsc --noEmit`。
- `pnpm lint` 会执行 `biome check --write ./src` 并修改文件；只想模拟 CI 时用 `pnpm exec biome ci ./src --reporter=github`。
- `pnpm format` 只格式化 `./src`；`pnpm icons` 只重新生成图标数据；`pnpm new-post <filename>` 在 `src/content/posts/` 下生成 `.md`，已有文件会失败。
- `pnpm run audit`：安全漏洞扫描。`.npmrc` 用的是淘宝镜像（无 audit 端点），此脚本通过 `--registry` 指定 npm 官方源执行扫描；直接 `pnpm audit` 会报 `ERR_PNPM_AUDIT_ENDPOINT_NOT_EXISTS`。

## 构建与生成物

- `src/constants/icons.ts` 是生成文件且被 Biome 忽略，不要手动改；新增/删除 Svelte 中的 `icon="..."`、`getIconSvg(...)`、`hasIcon(...)` 后运行 `pnpm icons` 或 `pnpm build`。
- 图标预处理只扫描 `src/**/*.svelte`，支持的前缀由 `scripts/generate-icons.js` 的 `ICON_SETS` 决定；`astro.config.mjs` 的 `astro-icon` include 列表不完全等同于预处理列表。
- `pnpm build` 之后才会生成 Pagefind 搜索索引；CI 跑的是 `pnpm astro build`（不含图标生成和 Pagefind），不会生成搜索索引。
- `siteConfig.generateOgImages` 默认关闭；开启后 `src/pages/og/[...slug].png.ts` 会为非草稿文章生成 OG 图，并可能联网下载 Google Fonts。
- Bangumi 页面在 dev 只取一页数据，生产构建会分页请求 Bangumi API；相关开关和 `userId` 在 `src/config/siteConfig.ts`。

## 配置与路由

- 配置集中在 `src/config/`，统一出口是 `src/config/index.ts`；新增配置要同时考虑 `src/types/config.ts` 和统一导出。
- `siteConfig.pages` 不只是导航开关：页面自身会 redirect/404，`astro.config.mjs` 的 sitemap filter 也会按它过滤。
- 修改 `siteConfig.rehypeCallouts.theme`、语言、页面开关等会影响 Astro/Vite 配置或构建期代码，开发服务器通常需要重启。
- 常用别名来自 `tsconfig.json`：`@/*`、`@components/*`、`@layouts/*`、`@utils/*`、`@i18n/*`、`@constants/*`、`@assets/*`；`tsconfig.json` 已无 `baseUrl`（TS 6 起弃用），`paths` 必须写成 `./src/...` 的显式相对路径。
- `astro.config.mjs` 里 `resolve.alias` 的 `@rehype-callouts-theme` 是构建期别名（指向 `rehype-callouts/theme/<主题>`），TS 侧靠 `src/types/rehype-callouts-theme.d.ts` 的 `declare module` 兜住。该文件必须保持纯 ambient（无任何顶层 `import`/`export`），否则 `declare module` 会退化成 module augmentation 而失效 —— `src/global.d.ts`、`src/env.d.ts` 都有顶层 export，不能往里加此类声明。

## 内容与 i18n

- 文章集合只加载 `src/content/posts/**/*.{md,mdx}`；schema 在 `src/content.config.ts`，草稿在生产通过 `getSortedPosts*` 过滤，dev 会显示。
- Frontmatter 支持的非显眼字段包括 `updated`、`author`、`sourceLink`、`licenseName`、`licenseUrl`、`password`、`passwordHint`；Front Matter CMS 配置在 `frontmatter.json`。
- 文章 `image: "api"` 会走随机封面配置 `src/config/coverImageConfig.ts`；本地文章图片路径在文章页会按文章文件目录解析。
- 新增 UI 文案要同步 `src/i18n/i18nKey.ts` 和 `src/i18n/languages/{zh_CN,zh_TW,en,ja,ru}.ts`；缺失翻译会先回退中文，再回退英文。

## 代码风格与检查

- `@biomejs/biome` 2.5.3 替代 ESLint/Prettier；格式化使用 Tab 和双引号，但仓库里部分脚本/配置未必已格式化，不要顺手重排无关文件。
- Biome 范围排除了 `src/**/*.css`、`src/public/**`、`dist/**`、`node_modules/**`、`src/constants/icons.ts`。
- `.astro`、`.svelte`、`.vue` 的未使用变量/导入检查被关闭，不能只靠 Biome 发现这类问题。
- Vite 生产构建会 drop `console` 和 `debugger`，调试输出不要作为生产行为依赖。
- 仓库 `.gitattributes` 为 `* text=auto`；保持 LF，避免大范围换行归一化混入功能改动。
- `postcss.config.mjs` 仅含 `postcss-import`，Tailwind 不由 PostCSS 处理。

## 依赖维护

- 做依赖更新、安全修复或项目健康检查时，除 `package.json` / `pnpm-lock.yaml` 外，也必须搜索源码中的 CDN URL（如 `unpkg.com`、`esm.sh`、`cdnjs.cloudflare.com`、`cdn.jsdelivr.net`），确认是否锁定版本、是否存在安全或兼容更新；更新后验证对应功能。
- Dependabot 已配置：npm 每日自动创建 minor/patch 更新 PR（忽略 major），GitHub Actions 每周更新。

## CI 与部署

- PR/push 到 `master` 会跑 `.github/workflows/build.yml` 的 `pnpm astro check` 和 `pnpm astro build`，矩阵 Node 22/24。注意：这里的 build 不包含图标生成和 Pagefind。
- `.github/workflows/biome.yml` 用 `biome ci ./src --reporter=github`，不是 `pnpm lint`，不会自动写回。
- 无 GitHub Pages deploy workflow；部署由 `vercel.json` 接管（构建命令 `pnpm build`、输出 `dist`、安装 `pnpm install`），并配置了全站安全响应头与 `/_astro/*` 长缓存。

## Pages CMS 双分支内容流

- 内容编辑走 `staging` 分支（Pages CMS 配置在 `.pages.yml`），`master` 才触发 Vercel 生产构建。
- `.pages.yml` 的 `actions` 定义了"发布到生产环境"按钮，触发 `.github/workflows/publish.yml`（merge staging → master）；Pages CMS 触发 `workflow_dispatch` 时会强制附带 `payload` input，workflow 必须在 `on.workflow_dispatch.inputs` 声明 `payload`，否则报 `Unexpected inputs provided: ["payload"]`。
- `master` 有 push 时 `.github/workflows/sync-staging.yml` 自动 merge master → staging；直接改 staging 上已在 master 存在的文件前注意同步状态，避免合并冲突。
