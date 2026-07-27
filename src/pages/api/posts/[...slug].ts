import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

export async function getStaticPaths() {
	const posts = await getCollection("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});
	return posts.map((post) => ({
		params: { slug: post.id.replace(/\.(md|mdx)$/i, "") },
		props: { body: post.body || "" },
	}));
}

export const GET: APIRoute = ({ props }) => {
	return new Response(props.body, {
		headers: {
			"Content-Type": "text/markdown; charset=utf-8",
		},
	});
};
