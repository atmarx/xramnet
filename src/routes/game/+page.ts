export const ssr = false;
export const prerender = true;

export function load({ url }: { url: URL }) {
	return {
		score: Number(url.searchParams.get('score') ?? 0),
		health: Number(url.searchParams.get('health') ?? 25)
	};
}
