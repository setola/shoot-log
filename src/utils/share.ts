import { copyTextToClipboard } from "./clipboard";

export type ShareResult = "shared" | "cancelled" | "copied" | "manual";

/** Invoke directly from a user gesture so native sharing retains user activation. */
export async function shareUrl(url: string, title: string): Promise<ShareResult> {
	if (typeof navigator.share === "function") {
		try {
			await navigator.share({ url, title });
			return "shared";
		} catch (error: unknown) {
			if (error instanceof Error && error.name === "AbortError") {
				return "cancelled";
			}
			// Unsupported or denied native sharing can still fall back to copying.
		}
	}
	return (await copyTextToClipboard(url)) ? "copied" : "manual";
}
