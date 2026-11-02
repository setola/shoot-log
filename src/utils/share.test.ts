import { afterEach, describe, expect, it, vi } from "vitest";
import { shareUrl } from "./share";

const url = "https://example.com/?section=matches&tab=analysis";
const title = "Test match";

afterEach(() => vi.unstubAllGlobals());

describe("shareUrl", () => {
	it("uses native sharing without copying", async () => {
		const share = vi.fn().mockResolvedValue(undefined);
		const writeText = vi.fn();
		vi.stubGlobal("navigator", { share, clipboard: { writeText } });
		const result = shareUrl(url, title);
		// Native sharing must start synchronously within the click gesture.
		expect(share).toHaveBeenCalledWith({ url, title });
		expect(await result).toBe("shared");
		expect(writeText).not.toHaveBeenCalled();
	});

	it("does not copy when the user cancels native sharing", async () => {
		const writeText = vi.fn();
		vi.stubGlobal("navigator", {
			share: vi.fn().mockRejectedValue(new DOMException("Cancelled", "AbortError")),
			clipboard: { writeText },
		});
		expect(await shareUrl(url, title)).toBe("cancelled");
		expect(writeText).not.toHaveBeenCalled();
	});

	it("copies the link when native sharing is unavailable", async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		vi.stubGlobal("navigator", { clipboard: { writeText } });
		expect(await shareUrl(url, title)).toBe("copied");
		expect(writeText).toHaveBeenCalledWith(url);
	});

	it("falls back to copying when native sharing is denied", async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		vi.stubGlobal("navigator", {
			share: vi.fn().mockRejectedValue(new DOMException("Denied", "NotAllowedError")),
			clipboard: { writeText },
		});
		expect(await shareUrl(url, title)).toBe("copied");
	});

	it("offers manual copying when neither API is available", async () => {
		vi.stubGlobal("navigator", {});
		expect(await shareUrl(url, title)).toBe("manual");
	});

	it("offers manual copying when both APIs reject", async () => {
		vi.stubGlobal("navigator", {
			share: vi.fn().mockRejectedValue(new Error("Unavailable")),
			clipboard: { writeText: vi.fn().mockRejectedValue(new Error("Denied")) },
		});
		expect(await shareUrl(url, title)).toBe("manual");
	});
});
