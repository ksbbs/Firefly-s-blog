import type { APIRoute } from "astro";
import { profileConfig, siteConfig } from "@/config";
import { getSortedPosts } from "@/utils/content-utils";
import { removeFileExtension } from "@/utils/url-utils";

export const GET: APIRoute = async () => {
	const posts = await getSortedPosts();
	const categories = new Map<string, { title: string; url: string }[]>();

	for (const post of posts) {
		const cat = post.data.category || "未分类";
		let catPosts = categories.get(cat);
		if (!catPosts) {
			catPosts = [];
			categories.set(cat, catPosts);
		}
		const slug = removeFileExtension(post.id);
		catPosts.push({
			title: post.data.title,
			url: `/posts/${slug}/`,
		});
	}

	const lines: string[] = [
		`# ${siteConfig.title}`,
		"",
		"## 关于",
		`${siteConfig.description || ""}`,
		`作者：${profileConfig.name}${profileConfig.bio ? ` — ${profileConfig.bio}` : ""}`,
		`网址：${siteConfig.site_url}`,
		"",
		"## 主要板块",
	];

	for (const [cat, catPosts] of categories) {
		lines.push(`- ${cat}（${catPosts.length} 篇）`);
	}

	lines.push("");
	lines.push("## 最新文章");

	const recent = posts.slice(0, 20);
	for (const post of recent) {
		const slug = removeFileExtension(post.id);
		lines.push(
			`- [${post.data.title}](${siteConfig.site_url}/posts/${slug}/): ${post.data.description || ""}`,
		);
	}

	lines.push("");
	lines.push("## 引用格式");
	lines.push("如需引用本站内容，请注明来源：");
	lines.push(`"据 ${siteConfig.title}（${siteConfig.site_url}）报道..."`);
	lines.push("并附上原文链接。");

	return new Response(lines.join("\n"), {
		headers: { "Content-Type": "text/plain; charset=utf-8" },
	});
};
