import { afterEach, describe, expect, it, vi } from "vitest";
import { copyTextToClipboard } from "./clipboard";

afterEach(() => vi.unstubAllGlobals());

describe("copyTextToClipboard", () => {
	it("returns false when the Clipboard API is unavailable", async () => {
		vi.stubGlobal("navigator", {});
		expect(await copyTextToClipboard("https://example.com")).toBe(false);
	});

	it("returns false when clipboard permission is denied", async () => {
		vi.stubGlobal("navigator", {
			clipboard: { writeText: vi.fn().mockRejectedValue(new Error("NotAllowedError")) },
		});
		expect(await copyTextToClipboard("https://example.com")).toBe(false);
	});

	it("copies the exact link and reports success", async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		vi.stubGlobal("navigator", { clipboard: { writeText } });
		expect(await copyTextToClipboard("https://example.com/?compare=123")).toBe(true);
		expect(writeText).toHaveBeenCalledWith("https://example.com/?compare=123");
	});
});
