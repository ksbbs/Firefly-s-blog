import type { APIRoute } from "astro";

const sitemapUrl = new URL("sitemap-index.xml", import.meta.env.SITE).href;

const robotsTxt = `# AI 检索型爬虫（允许：用于被 AI 搜索引用，不被模型训练）
User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: Claude-SearchBot
User-agent: Claude-User
User-agent: PerplexityBot
User-agent: Perplexity-User
User-agent: MistralAI-User
User-agent: DuckAssistBot
Allow: /

# AI 训练型爬虫（屏蔽：防止内容被用于模型训练）
User-agent: GPTBot
User-agent: ClaudeBot
User-agent: anthropic-ai
User-agent: CCBot
User-agent: Google-Extended
User-agent: Bytespider
User-agent: Amazonbot
User-agent: Applebot-Extended
User-agent: meta-externalagent
User-agent: cohere-ai
User-agent: FacebookBot
Disallow: /

# AI 辅助型爬虫（未知用途，保守屏蔽）
User-agent: AI2Bot
User-agent: ImagesiftBot
User-agent: Omgili
User-agent: Omgilibot
User-agent: YouBot
Disallow: /

# 传统搜索引擎
User-agent: Googlebot
User-agent: Bingbot
User-agent: DuckDuckBot
User-agent: Baiduspider
User-agent: Slurp
User-agent: YandexBot
User-agent: Applebot
Allow: /

# 默认规则：允许其他所有未列出的爬虫
User-agent: *
Allow: /

Sitemap: ${sitemapUrl}`.trim();

export const GET: APIRoute = () => {
	return new Response(robotsTxt, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
		},
	});
};
