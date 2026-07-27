import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { removeFileExtension } from "@/utils/url-utils";

export async function getStaticPaths() {
	const posts = await getCollection("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});
	return posts
		.filter((post) => !post.data.password)
		.map((post) => ({
			params: { slug: removeFileExtension(post.id) },
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
