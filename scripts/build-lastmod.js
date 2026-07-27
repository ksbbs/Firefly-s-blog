/**
 * 构建前脚本：扫描文章目录的 frontmatter 日期，生成 post-lastmod.json
 * 供 @astrojs/sitemap 的 serialize 注入 lastmod 字段。
 * 使用纯正则解析 YAML frontmatter，零外部依赖。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const POSTS_DIR = path.resolve(__dirname, "../src/content/posts");
const OUT_DIR = path.resolve(__dirname, "../src/generated");
const OUT_FILE = path.join(OUT_DIR, "post-lastmod.json");
const EXT_RE = /\.(md|mdx)$/i;

/** 递归收集所有 .md/.mdx 文件 */
function collectFiles(dir) {
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	const files = [];
	for (const e of entries) {
		const full = path.join(dir, e.name);
		if (e.isDirectory()) {
			files.push(...collectFiles(full));
		} else if (EXT_RE.test(e.name)) {
			files.push(full);
		}
	}
	return files;
}

/** 用正则从 markdown 中提取 frontmatter 的 published / updated 日期 */
function extractDate(content, key) {
	const re = new RegExp(`^${key}:\\s*(.+)$`, "m");
	const m = content.match(re);
	if (!m) return null;
	const raw = m[1].trim();
	// 去掉可能的引号
	const cleaned = raw.replace(/^["']|["']$/g, "");
	// 尝试解析，返回 ISO 格式
	const d = new Date(cleaned);
	if (Number.isNaN(d.getTime())) return null;
	return d.toISOString();
}

/** 从文件路径生成 slug（相对于 POSTS_DIR） */
function fileToSlug(filePath) {
	const relative = path.relative(POSTS_DIR, filePath).replace(/\\/g, "/");
	return relative.replace(EXT_RE, "");
}

function main() {
	const files = collectFiles(POSTS_DIR);
	/** @type {Record<string, string>} */
	const map = {};

	for (const file of files) {
		const slug = fileToSlug(file);
		const content = fs.readFileSync(file, "utf8");
		const updated = extractDate(content, "updated");
		const published = extractDate(content, "published");
		const date = updated || published;
		if (!date) {
			console.warn(
				`[build-lastmod] 跳过（缺少 published/updated 日期）: ${slug}`,
			);
			continue;
		}
		map[slug] = date;
	}

	if (!fs.existsSync(OUT_DIR)) {
		fs.mkdirSync(OUT_DIR, { recursive: true });
	}
	fs.writeFileSync(OUT_FILE, JSON.stringify(map, null, 2) + "\n");
	console.log(
		`[build-lastmod] 已生成 ${Object.keys(map).length} 篇文章的 lastmod 映射 → ${OUT_FILE}`,
	);
}

main();
