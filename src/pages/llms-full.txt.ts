import type { APIRoute } from "astro";
import { siteConfig, profileConfig } from "@/config";
import { getSortedPosts } from "@/utils/content-utils";
import { removeFileExtension } from "@/utils/url-utils";
import { formatDateToYYYYMMDD } from "@/utils/date-utils";

export const GET: APIRoute = async () => {
	const posts = await getSortedPosts();

	const lines: string[] = [
		`# ${siteConfig.title} — 完整内容索引`,
		"",
		`网址：${siteConfig.site_url}`,
		`作者：${profileConfig.name}`,
		`简介：${siteConfig.description || ""}`,
		`总文章数：${posts.length}`,
		"",
		"---",
		"",
	];

	for (const post of posts) {
		const slug = removeFileExtension(post.id);
		const url = `${siteConfig.site_url}/posts/${slug}/`;

		lines.push(`## ${post.data.title}`);
		lines.push(`- 链接：${url}`);
		if (post.data.description) {
			lines.push(`- 描述：${post.data.description}`);
		}
		lines.push(`- 发布日期：${formatDateToYYYYMMDD(post.data.published)}`);
		if (post.data.updated) {
			lines.push(`- 更新日期：${formatDateToYYYYMMDD(post.data.updated)}`);
		}
		if (post.data.tags?.length) {
			lines.push(`- 标签：${post.data.tags.join(", ")}`);
		}
		if (post.data.category) {
			lines.push(`- 分类：${post.data.category}`);
		}
		lines.push("");
		lines.push("---");
		lines.push("");
	}

	return new Response(lines.join("\n"), {
		headers: { "Content-Type": "text/plain; charset=utf-8" },
	});
};
