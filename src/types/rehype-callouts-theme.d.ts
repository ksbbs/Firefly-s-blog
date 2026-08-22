// Vite 别名（见 astro.config.mjs 的 resolve.alias）：
// "@rehype-callouts-theme" 在构建时解析为 rehype-callouts 的主题 CSS，
// 主题由 siteConfig.rehypeCallouts.theme 决定，因此这里不指向固定路径。
//
// 注意：本文件必须保持为纯 ambient 声明（不得出现任何顶层 import / export），
// 否则下面的 declare module 会被当成 module augmentation 而失效。
declare module "@rehype-callouts-theme";
