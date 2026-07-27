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
const FETCH_TIMEOUT_MS = 30_000;
const MAX_SITEMAP_DEPTH = 5;

async function fetchWithTimeout(url, optionsOrTimeout, extraOptions) {
	const timeoutMs =
		typeof optionsOrTimeout === "number" ? optionsOrTimeout : FETCH_TIMEOUT_MS;
	const fetchOptions =
		typeof optionsOrTimeout === "object"
			? optionsOrTimeout
			: extraOptions || {};
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		return await fetch(url, { ...fetchOptions, signal: controller.signal });
	} finally {
		clearTimeout(timer);
	}
}

async function getKey() {
	if (process.env.INDEXNOW_KEY)
		return { key: process.env.INDEXNOW_KEY.trim(), isEnv: true };
	const fs = await import("node:fs");
	return {
		key: fs.readFileSync(INDEXNOW_KEY_FILE, "utf8").trim(),
		isEnv: false,
	};
}

async function fetchSitemapUrls(sitemapUrl, visited = new Set(), depth = 0) {
	if (depth > MAX_SITEMAP_DEPTH) {
		console.warn(
			`[IndexNow] 达到最大递归深度 ${MAX_SITEMAP_DEPTH}，停止解析子 sitemap`,
		);
		throw new Error(
			`sitemap 递归深度超过限制 ${MAX_SITEMAP_DEPTH}，无法完整解析`,
		);
	}

	const normalizedUrl = sitemapUrl.replace(/\/$/, "");
	if (visited.has(normalizedUrl)) {
		console.warn(`[IndexNow] 跳过已访问的 sitemap: ${sitemapUrl}`);
		return [];
	}
	visited.add(normalizedUrl);

	const resp = await fetchWithTimeout(sitemapUrl);
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
			const childUrls = await fetchSitemapUrls(childUrl, visited, depth + 1);
			pageUrls.push(...childUrls);
		}
		return pageUrls;
	}

	return locs;
}

async function submit(key, keyFromEnv, urls) {
	const host = new URL(urls[0]).hostname;
	const endpoint = "https://api.indexnow.org/indexnow";

	// keyLocation 应指向实际部署的 key 文件路径（env 注入或公开文件）
	let keyLocation;
	if (keyFromEnv) {
		// 当使用环境变量时，确保 public/indexnow-key.txt 存在且内容匹配
		const fs = await import("node:fs");
		try {
			const fileKey = fs.readFileSync(INDEXNOW_KEY_FILE, "utf8").trim();
			if (fileKey !== key) {
				throw new Error(
					`public/indexnow-key.txt 内容与 INDEXNOW_KEY 环境变量不匹配`,
				);
			}
			keyLocation = `https://${host}/indexnow-key.txt`;
		} catch (err) {
			if (err.code === "ENOENT") {
				throw new Error(
					`使用 INDEXNOW_KEY 环境变量时需要 public/indexnow-key.txt 文件存在，或配置显式的公开 key URL`,
				);
			}
			throw err;
		}
	} else {
		keyLocation = `https://${host}/indexnow-key.txt`;
	}

	const errors = [];
	for (let i = 0; i < urls.length; i += 100) {
		const batch = urls.slice(i, i + 100);
		const payload = {
			host,
			key,
			keyLocation,
			urlList: batch,
		};
		const resp = await fetchWithTimeout(endpoint, FETCH_TIMEOUT_MS, {
			method: "POST",
			headers: { "Content-Type": "application/json; charset=utf-8" },
			body: JSON.stringify(payload),
		});
		if (resp.ok) {
			console.log(
				`[IndexNow] 已提交 ${batch.length} 个 URL（批次 ${Math.floor(i / 100) + 1}）`,
			);
		} else {
			const errMsg = `[IndexNow] 提交失败（批次 ${Math.floor(i / 100) + 1}）: ${resp.status} ${await resp.text()}`;
			console.error(errMsg);
			errors.push(errMsg);
		}
	}

	if (errors.length > 0) {
		throw new Error(`IndexNow 提交部分失败:\n${errors.join("\n")}`);
	}
}

async function main() {
	const { key, isEnv } = await getKey();
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
	await submit(key, isEnv, urls);
	console.log("[IndexNow] 完成");
}

main().catch((e) => {
	console.error("[IndexNow] 错误:", e);
	process.exit(1);
});
