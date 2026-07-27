/**
 * IndexNow 提交脚本 — 每次构建后向 Bing/IndexNow 推送最新 sitemap URL
 *
 * 用法：node scripts/indexnow-submit.js [sitemap-url]
 *   例：node scripts/indexnow-submit.js https://blog.282126.xyz/sitemap-index.xml
 *
 * 依赖 INDEXNOW_KEY 环境变量（IndexNow 密钥文件里的 key），
 * 或者脚本会从 public/indexnow-key.txt 自动读取。
 */

const INDEXNOW_KEY_FILE = "public/indexnow-key.txt";

async function getKey() {
	if (process.env.INDEXNOW_KEY) return process.env.INDEXNOW_KEY;
	const fs = await import("node:fs");
	return fs.readFileSync(INDEXNOW_KEY_FILE, "utf8").trim();
}

async function fetchSitemapUrls(sitemapUrl) {
	const resp = await fetch(sitemapUrl);
	if (!resp.ok) throw new Error(`无法获取 sitemap: ${resp.status}`);
	const xml = await resp.text();
	const locs = [];
	const re = /<loc>([^<]+)<\/loc>/g;
	let m;
	while ((m = re.exec(xml)) !== null) {
		locs.push(m[1]);
	}

	// 检测是否为 sitemap index（包含子 sitemap），递归展开
	const isIndex = /<sitemapindex[\s>]/i.test(xml);
	if (isIndex && locs.length > 0) {
		console.log(
			`[IndexNow] 检测到 sitemap index，递归解析 ${locs.length} 个子 sitemap...`,
		);
		const pageUrls = [];
		for (const childUrl of locs) {
			const childUrls = await fetchSitemapUrls(childUrl);
			pageUrls.push(...childUrls);
		}
		return pageUrls;
	}

	return locs;
}

async function submit(key, urls) {
	const host = new URL(urls[0]).hostname;
	const endpoint = "https://api.indexnow.org/indexnow";

	for (let i = 0; i < urls.length; i += 100) {
		const batch = urls.slice(i, i + 100);
		const payload = {
			host,
			key,
			keyLocation: `https://${host}/indexnow-key.txt`,
			urlList: batch,
		};
		const resp = await fetch(endpoint, {
			method: "POST",
			headers: { "Content-Type": "application/json; charset=utf-8" },
			body: JSON.stringify(payload),
		});
		if (resp.ok) {
			console.log(
				`[IndexNow] 已提交 ${batch.length} 个 URL（批次 ${Math.floor(i / 100) + 1}）`,
			);
		} else {
			console.error(
				`[IndexNow] 提交失败（批次 ${Math.floor(i / 100) + 1}）: ${resp.status}`,
				await resp.text(),
			);
		}
	}
}

async function main() {
	const key = await getKey();
	if (!key) {
		console.error(
			"[IndexNow] 缺少 IndexNow key，请设置 INDEXNOW_KEY 环境变量或确保 public/indexnow-key.txt 存在",
		);
		process.exit(1);
	}

	const sitemapUrl = process.argv[2];
	if (!sitemapUrl) {
		console.error(
			"[IndexNow] 用法: node scripts/indexnow-submit.js <sitemap-url>",
		);
		process.exit(1);
	}

	const urls = await fetchSitemapUrls(sitemapUrl);
	console.log(`[IndexNow] 从 sitemap 提取到 ${urls.length} 个 URL`);
	if (urls.length === 0) {
		console.error("[IndexNow] sitemap 中没有找到页面 URL，跳过提交");
		process.exit(0);
	}
	await submit(key, urls);
	console.log("[IndexNow] 完成");
}

main().catch((e) => {
	console.error("[IndexNow] 错误:", e);
	process.exit(1);
});
