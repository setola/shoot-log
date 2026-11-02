/** Returns false when automatic copying is unavailable or denied by the browser. */
export async function copyTextToClipboard(text: string): Promise<boolean> {
	try {
		if (!navigator.clipboard?.writeText) return false;
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		return false;
	}
}
