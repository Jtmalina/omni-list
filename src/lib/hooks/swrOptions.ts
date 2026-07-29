// Shared SWR presets for the navbar/app-data hooks.
//
// These menus are always mounted (just closed), so their hooks prefetch on
// load. `revalidateOnFocus` is off across the board: every window/tab focus was
// re-firing friends/pending/follows/lists as server actions (each an auth() +
// DB round-trip), which is pure background CPU. The data is refreshed explicitly
// via the refresh* helpers after mutations, so focus revalidation buys nothing.

export const fresh = { revalidateOnFocus: false, dedupingInterval: 30_000 }
export const stable = { revalidateOnFocus: false, dedupingInterval: 60_000 }
export const discoverOpts = { revalidateOnFocus: false, dedupingInterval: 5 * 60_000 }
