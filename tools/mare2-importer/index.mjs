#!/usr/bin/env node
/* global process, URL, fetch, TextEncoder, setTimeout */
import { createHash } from "node:crypto";
import {
	mkdir,
	readFile,
	writeFile,
	copyFile,
	readdir,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const MARE2_ORIGIN = process.env.MARE2_ORIGIN ?? `https://${"mare2.fitds.it"}`;
const DEFAULT_CACHE_DIR = ".mare2-cache";
let requestDelayMs = 0;
let lastRequestAt = 0;

/** @typedef {{ matchId: string, matchUrl: string, title: string, dateFrom?: string, dateTo?: string, location?: string, rankingUrl?: string, verifyPdfUrl?: string, imageUrls: string[], sourceLinks: Record<string, string>, fetchedAt: string }} Mare2MatchDetails */

async function main() {
	const { command, options } = parseArgs(process.argv.slice(2));

	if (!command || options.help) {
		printHelp();
		return;
	}

	if (command === "inspect") {
		const details = await inspectMatch(options);
		printStdout(`${JSON.stringify(details, null, 2)}\n`);
		return;
	}

	if (command === "build-match") {
		const result = await buildMatch(options);
		printStdout(`${JSON.stringify(result, null, 2)}\n`);
		return;
	}

	if (command === "sync") {
		const result = await syncMatches(options);
		printStdout(`${JSON.stringify(result, null, 2)}\n`);
		return;
	}

	throw new Error(`Unknown command: ${command}`);
}

function parseArgs(args) {
	const [command, ...rest] = args;
	const options = {};

	for (let index = 0; index < rest.length; index += 1) {
		const arg = rest[index];
		if (!arg.startsWith("--")) continue;

		const raw = arg.slice(2);
		const equalIndex = raw.indexOf("=");
		if (equalIndex >= 0) {
			options[raw.slice(0, equalIndex)] = raw.slice(equalIndex + 1);
			continue;
		}

		const next = rest[index + 1];
		if (next && !next.startsWith("--")) {
			options[raw] = next;
			index += 1;
		} else {
			options[raw] = true;
		}
	}

	return { command, options };
}

function printHelp() {
	printStdout(
		`Mare2 public match importer\n\nUsage:\n  npm run mare2 -- inspect --match=1616\n  npm run mare2 -- build-match --match=1616 --out=tmp/mare2\n  npm run mare2 -- sync --year=2026 --championship=federale --ma=3
  npm run mare2 -- sync --match=1616\n\nCommands:\n  inspect       Fetch and print public Mare2 match metadata.\n  build-match   Build static app-ready JSON and page assets for one match.\n  sync          Discover, filter and incrementally build public matches. With --match/--url, build only one match and refresh the local manifest.\n\nOptions:\n  --match=<id>       Mare2 match id, e.g. 1616.\n  --url=<url>        Full Mare2 details URL.\n  --out=<dir>        Output root. Default: tmp/mare2.\n  --cache-dir=<dir>  Local cache directory. Default: .mare2-cache.
  --overrides-dir=<dir>
                     JSON override directory. Default: tools/mare2-importer/overrides.
  --year=<year>      Sync only matches starting in this year.\n  --min-level=<n>    Sync only matches with a discipline level >= n.\n  --championship=<s> Case-insensitive title/badge filter.\n  --ma=<n>           Macro-area filter, e.g. 3 for MA3.\n  --limit=<n>        Build at most n matching records.
  --since=<date>     Sync past matches from this date onward. Accepts YYYY-MM-DD or relative values like "last week", "last month", "last 2 weeks".
  --include-future   Also inspect future matches. Default: skip them.
  --max-pages=<n>    Stop archive discovery after n pages. Default: 100.
  --request-delay-ms=<n>
                     Delay between Mare2 HTTP requests. Default for sync: 300.
  --force            Re-download cached source files and rebuild assets.
`,
	);
}

async function inspectMatch(options) {
	const matchUrl = resolveMatchUrl(options);
	const html = await fetchText(matchUrl);
	return parseMatchDetails(html, matchUrl);
}

async function syncMatches(options) {
	const outRoot = String(options.out ?? "tmp/mare2");
	requestDelayMs = parseOptionalInteger(options["request-delay-ms"]);
	if (!Number.isFinite(requestDelayMs)) requestDelayMs = 300;

	if (options.match || options.url) {
		const details = await inspectMatch(options);
		printStderr(`[mare2] build ${formatMatchProgressLabel(details)}\n`);
		const builtMatch = await buildMatch(options, details);
		const catalogMatches = await listBuiltCatalogMatches(outRoot);
		await writeCatalog(outRoot, catalogMatches);
		await writeCloudflarePagesHeaders(outRoot);
		return {
			listUrl: details.matchUrl,
			discovered: 1,
			selected: 1,
			built: 1,
			skipped: 0,
			failed: [],
			matchId: builtMatch.matchId,
			matchName: builtMatch.matchName,
		};
	}

	const discovery = await discoverMatches(options);
	const listUrl = discovery.url;
	const discoveredMatches = discovery.matches;
	const limit = parseOptionalInteger(options.limit);
	const selectedMatches = Number.isFinite(limit)
		? discoveredMatches.slice(0, limit)
		: discoveredMatches;
	const built = [];
	const skipped = [];
	const failed = [];

	for (const discoveredMatch of selectedMatches) {
		try {
			printStderr(
				`[mare2] ${discoveredMatch.matchId} ${discoveredMatch.title}\n`,
			);
			if (isBeforeSinceDate(discoveredMatch, options.since)) {
				printStderr(
					`[mare2] skip ${discoveredMatch.matchId}: before --since=${options.since}\n`,
				);
				skipped.push({
					matchId: discoveredMatch.matchId,
					reason: "before-since",
				});
				continue;
			}
			if (!options["include-future"] && isFutureMatch(discoveredMatch)) {
				printStderr(`[mare2] skip ${discoveredMatch.matchId}: future match\n`);
				skipped.push({
					matchId: discoveredMatch.matchId,
					reason: "future-match",
				});
				continue;
			}
			const details = await inspectMatch({ url: discoveredMatch.matchUrl });
			if (!details.verifyPdfUrl?.toLowerCase().endsWith(".pdf")) {
				printStderr(
					`[mare2] skip ${discoveredMatch.matchId}: VERIFY PDF unavailable\n`,
				);
				skipped.push({
					matchId: discoveredMatch.matchId,
					reason: "verify-pdf-unavailable",
				});
				continue;
			}
			const existingSource = await readJsonIfExists(
				path.join(outRoot, "matches", discoveredMatch.matchId, "source.json"),
			);
			const existingMatch = await readJsonIfExists(
				path.join(outRoot, "matches", discoveredMatch.matchId, "match.json"),
			);
			const recentEnough = isRecentOrUpcoming(
				discoveredMatch.dateTo ?? discoveredMatch.dateFrom,
				Number(options["refresh-recent-days"] ?? 14),
			);
			const canSkip =
				!options.force &&
				existingSource &&
				existingMatch &&
				!recentEnough &&
				existingSource.verifyPdfUrl === details.verifyPdfUrl &&
				arraysEqual(existingSource.originalImageUrls ?? [], details.imageUrls);

			if (canSkip) {
				printStderr(`[mare2] skip ${discoveredMatch.matchId}: unchanged\n`);
				skipped.push({ matchId: discoveredMatch.matchId, reason: "unchanged" });
				continue;
			}

			printStderr(`[mare2] build ${formatMatchProgressLabel(details)}\n`);
			built.push(
				await buildMatch(
					{ ...options, match: discoveredMatch.matchId, force: true },
					details,
				),
			);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			printStderr(`[mare2] fail ${discoveredMatch.matchId}: ${message}\n`);
			failed.push({
				matchId: discoveredMatch.matchId,
				error: message,
			});
		}
	}

	await writeCatalog(outRoot, selectedMatches);
	await writeCloudflarePagesHeaders(outRoot);

	return {
		listUrl,
		discovered: discoveredMatches.length,
		selected: selectedMatches.length,
		built: built.length,
		skipped: skipped.length,
		failed,
	};
}

async function buildMatch(options, knownDetails) {
	const force = Boolean(options.force);
	const outRoot = String(options.out ?? "tmp/mare2");
	const cacheRoot = String(options["cache-dir"] ?? DEFAULT_CACHE_DIR);
	const details = knownDetails ?? (await inspectMatch(options));
	const matchCacheDir = path.join(cacheRoot, "matches", details.matchId);
	const matchOutDir = path.join(outRoot, "matches", details.matchId);
	const pagesOutDir = path.join(matchOutDir, "assets", "pages");

	await mkdir(matchCacheDir, { recursive: true });
	await mkdir(pagesOutDir, { recursive: true });

	if (!details.verifyPdfUrl) {
		throw new Error(
			`No VERIFY PDF link found for Mare2 match ${details.matchId}.`,
		);
	}

	const verifyPdfPath = path.join(matchCacheDir, "verify.pdf");
	const pdfBytes = await fetchBinaryToCache(
		details.verifyPdfUrl,
		verifyPdfPath,
		force,
	);
	const verifyPdfSha256 = sha256(pdfBytes);
	const pdfText = await extractPdfText(pdfBytes);
	const snapshot = parseMare2TextSnapshot(pdfText, details, verifyPdfSha256);
	const verifyPrintedAt = snapshot.match.date;

	const pages = [];
	for (let index = 0; index < details.imageUrls.length; index += 1) {
		const imageUrl = details.imageUrls[index];
		const pageNumber = index + 1;
		const sourcePath = path.join(
			matchCacheDir,
			"images",
			`pagina${String(pageNumber).padStart(2, "0")}.jpg`,
		);
		await mkdir(path.dirname(sourcePath), { recursive: true });
		const imageBytes = await fetchBinaryToCache(imageUrl, sourcePath, force);
		const imageSha256 = sha256(imageBytes);
		const outputFileName = `page-${String(pageNumber).padStart(2, "0")}.webp`;
		const outputPath = path.join(pagesOutDir, outputFileName);
		await convertToWebp(sourcePath, outputPath, force);
		pages.push({
			pageNumber,
			originalUrl: imageUrl,
			originalSha256: imageSha256,
			url: `./assets/pages/${outputFileName}`,
			mimeType: "image/webp",
		});
	}

	const source = {
		mare2MatchId: details.matchId,
		mare2MatchUrl: details.matchUrl,
		rankingUrl: details.rankingUrl,
		verifyPdfUrl: details.verifyPdfUrl,
		verifyPdfSha256,
		verifyPdfBytes: pdfBytes.byteLength,
		verifyPrintedAt,
		originalImageUrls: details.imageUrls,
		fetchedAt: details.fetchedAt,
	};

	const override = await readMatchOverride(options, details.matchId);
	const stagePageMapping = normalizeStagePageMapping(
		override?.stagePageMapping,
		pages,
		snapshot.stages,
	);
	if (stagePageMapping) {
		printStderr(`[mare2] override ${details.matchId}: stage/page mapping\n`);
	}

	const match = {
		format: "shooting-logbook-public-mare2-match",
		schemaVersion: 1,
		generatedAt: new Date().toISOString(),
		source: "mare2",
		mare2MatchId: details.matchId,
		name: details.title,
		dateFrom: details.dateFrom,
		dateTo: details.dateTo,
		location: details.location,
		verifyPrintedAt,
		verifyPdfUrl: details.verifyPdfUrl,
		snapshotUrl: "./snapshot.json",
		pages,
		...(stagePageMapping ? { stagePageMapping } : {}),
	};

	await writeJson(path.join(matchOutDir, "match.json"), match);
	await writeJson(path.join(matchOutDir, "source.json"), source);
	await writeJson(path.join(matchOutDir, "snapshot.json"), snapshot);

	return {
		matchId: details.matchId,
		matchName: details.title,
		outDir: matchOutDir,
		competitors: snapshot.competitors.length,
		stages: snapshot.stages.length,
		scores: snapshot.scores.length,
		pages: pages.length,
	};
}

function resolveMatchUrl(options) {
	if (options.url) return String(options.url);
	if (options.match)
		return `${MARE2_ORIGIN}/front/match/details/${options.match}`;
	throw new Error("Pass --match=<id> or --url=<mare2 details url>.");
}

async function discoverMatches(options) {
	const rankingUrl = resolveRankingChampionshipUrl(options);
	if (rankingUrl) {
		const html = await fetchText(rankingUrl);
		return {
			url: rankingUrl,
			matches: parseRankingChampionshipMatches(html, rankingUrl),
		};
	}

	if (options.year || options.championship || options.ma) {
		return discoverArchiveMatches(options);
	}

	const listUrl = resolveListUrl(options);
	const html = await fetchText(listUrl);
	return {
		url: listUrl,
		matches: parseMatchList(html, listUrl).filter((match) =>
			matchesSyncFilters(match, options),
		),
	};
}

function resolveListUrl(options) {
	if (options["list-url"]) return String(options["list-url"]);
	const url = new URL("/front/match/list", MARE2_ORIGIN);
	if (options.international) url.searchParams.set("international", "1");
	return url.toString();
}

async function discoverArchiveMatches(options) {
	const firstUrl = resolveArchiveUrl(options, 1);
	const maxPages = parseOptionalInteger(options["max-pages"]);
	const pageLimit = Number.isFinite(maxPages) ? maxPages : 100;
	const matches = [];
	const seen = new Set();
	let currentUrl = firstUrl;

	for (let page = 1; page <= pageLimit && currentUrl; page += 1) {
		printStderr(`[mare2] discover archive page ${page}: ${currentUrl}\n`);
		const html = await fetchText(currentUrl);
		for (const match of parseArchiveMatches(html, currentUrl, options)) {
			if (seen.has(match.matchId)) continue;
			seen.add(match.matchId);
			matches.push(match);
		}
		currentUrl = findNextPageUrl(html, currentUrl);
	}

	return { url: firstUrl, matches };
}

function resolveArchiveUrl(options, page) {
	const url = new URL("/front/match/archive", MARE2_ORIGIN);
	if (options.year) url.searchParams.set("search_year", String(options.year));
	const matchType = options.championship
		? getChampionshipMatchType(String(options.championship))
		: undefined;
	if (matchType) url.searchParams.set("search_match_type", matchType);
	if (options.ma)
		url.searchParams.set("search_match_category", String(options.ma));
	if (page > 1) url.searchParams.set("page", String(page));
	return url.toString();
}

function getChampionshipMatchType(value) {
	const normalized = value.toLowerCase();
	if (normalized.includes("federal")) return "1";
	if (normalized.includes("italian") || normalized.includes("italiano"))
		return "2";
	if (normalized.includes("winter")) return "4";
	return undefined;
}

function parseArchiveMatches(html, archiveUrl, options) {
	const matches = [];
	const rowRegex =
		/<tr\b[^>]*data-href=["']([^"']*\/front\/match\/details\/(\d+)[^"']*)["'][^>]*>([\s\S]*?)<\/tr>/gi;

	for (const rowMatch of html.matchAll(rowRegex)) {
		const [, href, matchId, rowHtml] = rowMatch;
		const cells = [...rowHtml.matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/gi)].map(
			(match) => decodeHtml(stripTags(match[1])).trim().replace(/\s+/g, " "),
		);
		const title = cells[0] || `Mare2 match ${matchId}`;
		const dateParts = (
			cells.find((cell) =>
				/\d{2}\/\d{2}\/\d{4}\s*-\s*\d{2}\/\d{2}\/\d{4}/.test(cell),
			) ?? ""
		)
			.split("-")
			.map((part) => parseItalianDate(part.trim()));
		matches.push({
			matchId,
			matchUrl: new URL(href, archiveUrl).toString(),
			title,
			dateFrom: dateParts[0],
			dateTo: dateParts[1],
			badges: getArchiveBadges(options),
			macroArea:
				String(options.ma ?? title.match(/\bMA\s*(\d+)\b/i)?.[1] ?? "") ||
				undefined,
			level: extractMaxLevel(title),
		});
	}

	return matches;
}

function getArchiveBadges(options) {
	return [
		options.championship ? String(options.championship) : undefined,
		options.ma ? `MA${options.ma}` : undefined,
	].filter(Boolean);
}

function findNextPageUrl(html, currentUrl) {
	const nextHref = matchFirst(
		html,
		/<a\b[^>]*href=["']([^"']+)["'][^>]*rel=["']next["'][^>]*>/i,
	);
	return nextHref
		? new URL(decodeHtml(nextHref), currentUrl).toString()
		: undefined;
}

function resolveRankingChampionshipUrl(options) {
	if (options["ranking-url"]) return String(options["ranking-url"]);
	return undefined;
}

function parseRankingChampionshipMatches(html, rankingUrl) {
	const matches = [];
	const seen = new Set();
	const detailLinkRegex =
		/<a\b[^>]*href=["']([^"']*\/front\/match\/details\/(\d+)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;

	for (const linkMatch of html.matchAll(detailLinkRegex)) {
		const [, href, matchId, labelHtml] = linkMatch;
		if (seen.has(matchId)) continue;
		seen.add(matchId);
		const label = decodeHtml(stripTags(labelHtml)).trim().replace(/\s+/g, " ");
		matches.push({
			matchId,
			matchUrl: new URL(href, rankingUrl).toString(),
			title: label || `Mare2 match ${matchId}`,
			badges: [],
			macroArea: label.match(/\bMA\s*(\d+)\b/i)?.[1],
		});
	}

	return matches;
}

function parseMatchList(html, listUrl) {
	const matches = [];
	const cardRegex =
		/<div class=["'][^"']*col-(?:xs|sm)-6[^"']*col-md-(?:4|6)[^"']*["'][\s\S]*?(?=<div class=["'][^"']*col-(?:xs|sm)-6[^"']*col-md-(?:4|6)|<!-- Footer Section Start -->|$)/gi;

	for (const cardMatch of html.matchAll(cardRegex)) {
		const card = cardMatch[0];
		const href = matchFirst(card, /data-href=["']([^"']+)["']/i);
		if (!href) continue;
		const matchId = href.match(/\/front\/match\/details\/(\d+)/)?.[1];
		if (!matchId) continue;
		const title = decodeHtml(
			matchFirst(
				card,
				/<h5[^>]*class=["']text-primary["'][^>]*style=["'][^"']*min-height:[^"']*["'][^>]*>([\s\S]*?)<\/h5>/i,
			) ?? `Mare2 match ${matchId}`,
		)
			.trim()
			.replace(/\s+/g, " ");
		const dateLine = decodeHtml(
			matchFirst(
				card,
				/<h5[^>]*class=["']text-primary["'][^>]*>(\d{2}\/\d{2}\/\d{4}\s*\|\s*\d{2}\/\d{2}\/\d{4})<\/h5>/i,
			) ?? "",
		);
		const [dateFrom, dateTo] = dateLine
			.split("|")
			.map((part) => parseItalianDate(part.trim()));
		const badges = [
			...card.matchAll(
				/<span[^>]*class=["']badge["'][^>]*>([\s\S]*?)<\/span>/gi,
			),
		].map((match) =>
			decodeHtml(stripTags(match[1])).trim().replace(/\s+/g, " "),
		);
		const discipline = decodeHtml(stripTags(card)).match(
			/([A-Za-z]+\s+Lev\.\s*[IVX]+(?:,\s*[A-Za-z]+\s+Lev\.\s*[IVX]+)*)/,
		)?.[1];
		matches.push({
			matchId,
			matchUrl: new URL(href, listUrl).toString(),
			title,
			dateFrom,
			dateTo,
			badges,
			discipline,
			level: extractMaxLevel([discipline, title, ...badges].join(" ")),
			macroArea: [title, ...badges].join(" ").match(/\bMA\s*(\d+)\b/i)?.[1],
		});
	}

	return matches;
}

function matchesSyncFilters(match, options) {
	if (isBeforeSinceDate(match, options.since)) return false;

	const year = parseOptionalInteger(options.year);
	if (Number.isFinite(year) && !match.dateFrom?.startsWith(String(year))) {
		return false;
	}

	const minLevel = parseOptionalInteger(options["min-level"]);
	if (
		Number.isFinite(minLevel) &&
		match.level !== undefined &&
		match.level < minLevel
	) {
		return false;
	}

	if (options.championship) {
		const query = String(options.championship).toLowerCase();
		const haystack = [match.title, ...(match.badges ?? [])]
			.join(" ")
			.toLowerCase();
		if (!haystack.includes(query)) return false;
	}

	if (options.ma && match.macroArea !== String(options.ma)) return false;

	return true;
}

function extractMaxLevel(value) {
	const romanLevels = [...String(value).matchAll(/Lev\.\s*([IVX]+)/gi)].map(
		(match) => romanToInteger(match[1]),
	);
	return romanLevels.length ? Math.max(...romanLevels) : undefined;
}

function romanToInteger(value) {
	const numerals = { I: 1, V: 5, X: 10 };
	let total = 0;
	let previous = 0;
	for (const char of value.toUpperCase().split("").toReversed()) {
		const current = numerals[char] ?? 0;
		total += current < previous ? -current : current;
		previous = Math.max(previous, current);
	}
	return total;
}

function parseOptionalInteger(value) {
	if (value === undefined || value === true) return Number.NaN;
	const parsed = Number.parseInt(String(value), 10);
	return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function isRecentOrUpcoming(dateValue, refreshRecentDays) {
	if (!dateValue) return true;
	const date = new Date(`${dateValue}T23:59:59Z`);
	if (Number.isNaN(date.getTime())) return true;
	const threshold = Date.now() - refreshRecentDays * 24 * 60 * 60 * 1000;
	return date.getTime() >= threshold;
}

function formatMatchProgressLabel(match) {
	return [match.matchId, match.title].filter(Boolean).join(" — ");
}

function isBeforeSinceDate(match, sinceValue) {
	if (!sinceValue) return false;
	const sinceDate = parseSinceDate(String(sinceValue));
	if (!sinceDate) {
		throw new Error(
			`Invalid --since date: ${sinceValue}. Use YYYY-MM-DD or a relative value like "last week", "last month", "last 2 weeks".`,
		);
	}
	const matchDate = parseIsoDate(match.dateTo ?? match.dateFrom ?? "");
	if (!matchDate) return false;
	return matchDate.getTime() < sinceDate.getTime();
}

function isFutureMatch(match) {
	if (!match.dateFrom) return false;
	const startDate = new Date(`${match.dateFrom}T00:00:00Z`);
	if (Number.isNaN(startDate.getTime())) return false;
	const today = new Date();
	const todayUtc = Date.UTC(
		today.getUTCFullYear(),
		today.getUTCMonth(),
		today.getUTCDate(),
	);
	return startDate.getTime() > todayUtc;
}

export function parseSinceDate(value) {
	const trimmed = value.trim();
	return parseIsoDate(trimmed) ?? parseRelativeSinceDate(trimmed);
}

function parseRelativeSinceDate(value) {
	const match =
		/^last(?:\s+(\d+))?\s+(day|days|week|weeks|month|months)$/i.exec(value);
	if (!match) return undefined;

	const amount = match[1] ? Number.parseInt(match[1], 10) : 1;
	if (!Number.isFinite(amount) || amount < 1) return undefined;

	const unit = match[2].toLowerCase();
	const today = new Date();
	const date = new Date(
		Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
	);

	if (unit.startsWith("day")) date.setUTCDate(date.getUTCDate() - amount);
	if (unit.startsWith("week")) date.setUTCDate(date.getUTCDate() - amount * 7);
	if (unit.startsWith("month")) date.setUTCMonth(date.getUTCMonth() - amount);

	return date;
}

function parseIsoDate(value) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
	const date = new Date(`${value}T00:00:00Z`);
	return Number.isNaN(date.getTime()) ? undefined : date;
}

function arraysEqual(first, second) {
	return (
		first.length === second.length &&
		first.every((value, index) => value === second[index])
	);
}

async function readJsonIfExists(filePath) {
	if (!existsSync(filePath)) return undefined;
	try {
		return JSON.parse(await readFile(filePath, "utf8"));
	} catch (error) {
		throw new Error(`Cannot read JSON file ${filePath}.`, { cause: error });
	}
}

async function listBuiltCatalogMatches(outRoot) {
	const matchesRoot = path.join(outRoot, "matches");
	if (!existsSync(matchesRoot)) return [];
	const entries = await readdir(matchesRoot, { withFileTypes: true });
	const matches = [];

	for (const entry of entries) {
		if (!entry.isDirectory()) continue;
		const match = await readJsonIfExists(
			path.join(matchesRoot, entry.name, "match.json"),
		);
		if (!match) continue;
		matches.push({
			matchId: match.mare2MatchId ?? entry.name,
			title: match.name ?? `Mare2 match ${entry.name}`,
			dateFrom: match.dateFrom,
			dateTo: match.dateTo,
			location: match.location,
			badges: match.badges ?? [],
		});
	}

	return matches;
}

async function writeCloudflarePagesHeaders(outRoot) {
	await writeFile(
		path.join(outRoot, "_headers"),
		`/*\n  Access-Control-Allow-Origin: *\n  Access-Control-Allow-Methods: GET, HEAD, OPTIONS\n  Access-Control-Allow-Headers: Content-Type\n  Cache-Control: public, max-age=300\n`,
	);
}

async function writeCatalog(outRoot, selectedMatches) {
	const generatedAt = new Date().toISOString();
	const records = [];
	for (const selectedMatch of selectedMatches) {
		const match = await readJsonIfExists(
			path.join(outRoot, "matches", selectedMatch.matchId, "match.json"),
		);
		if (!match) continue;
		records.push({
			mare2MatchId: selectedMatch.matchId,
			name: match.name ?? selectedMatch.title,
			dateFrom: match.dateFrom ?? selectedMatch.dateFrom,
			dateTo: match.dateTo ?? selectedMatch.dateTo,
			location: match.location ?? selectedMatch.location,
			level: selectedMatch.level,
			macroArea: selectedMatch.macroArea,
			badges: selectedMatch.badges ?? [],
			matchUrl: `./matches/${selectedMatch.matchId}/match.json`,
			snapshotUrl: `./matches/${selectedMatch.matchId}/snapshot.json`,
			pageCount: match.pages?.length ?? 0,
			verifyPrintedAt: match.verifyPrintedAt,
			verifyPdfUrl: match.verifyPdfUrl,
		});
	}

	records.sort(
		(a, b) =>
			String(a.dateFrom).localeCompare(String(b.dateFrom)) ||
			a.name.localeCompare(b.name),
	);
	const years = [
		...new Set(
			records.map((record) => record.dateFrom?.slice(0, 4)).filter(Boolean),
		),
	];

	await writeJson(path.join(outRoot, "manifest.json"), {
		format: "shooting-logbook-public-mare2-catalog",
		schemaVersion: 1,
		generatedAt,
		years,
		matches: records,
	});

	for (const year of years) {
		await writeJson(path.join(outRoot, "years", `${year}.json`), {
			format: "shooting-logbook-public-mare2-year",
			schemaVersion: 1,
			generatedAt,
			year,
			matches: records.filter((record) => record.dateFrom?.startsWith(year)),
		});
	}
}

async function readMatchOverride(options, matchId) {
	const overridesDir = String(
		options["overrides-dir"] ?? "tools/mare2-importer/overrides",
	);
	const candidates = [
		path.join(overridesDir, `${matchId}.json`),
		path.join(overridesDir, `mare2-${matchId}.json`),
	];

	for (const candidate of candidates) {
		if (existsSync(candidate)) return readJsonIfExists(candidate);
	}
	return undefined;
}

function normalizeStagePageMapping(rawMapping, pages, stages) {
	if (!rawMapping || typeof rawMapping !== "object") return undefined;

	const pageNumbers = new Set(pages.map((page) => page.pageNumber));
	const stageIds = new Set(stages.map((stage) => stage.internalStageId));
	const mapping = {};

	for (const [stageId, pageNumber] of Object.entries(rawMapping)) {
		const normalizedStageId = String(stageId);
		const normalizedPageNumber = Number(pageNumber);
		if (!stageIds.has(normalizedStageId)) {
			throw new Error(
				`Override references unknown stage ${normalizedStageId}.`,
			);
		}
		if (!pageNumbers.has(normalizedPageNumber)) {
			throw new Error(
				`Override references unknown page ${normalizedPageNumber}.`,
			);
		}
		mapping[normalizedStageId] = normalizedPageNumber;
	}

	return Object.keys(mapping).length > 0 ? mapping : undefined;
}

/** @returns {Mare2MatchDetails} */
function parseMatchDetails(html, matchUrl) {
	let url;
	try {
		url = new URL(matchUrl);
	} catch (error) {
		throw new Error(`Invalid Mare2 match URL: ${matchUrl}.`, { cause: error });
	}
	const match = url.pathname.match(/\/front\/match\/details\/(\d+)/);
	const matchId = match?.[1];
	if (!matchId)
		throw new Error(`Cannot extract Mare2 match id from ${matchUrl}.`);

	const title = decodeHtml(
		matchFirst(html, /<h2[^>]*id=["']title["'][^>]*>([\s\S]*?)<\/h2>/i) ??
			`Mare2 match ${matchId}`,
	)
		.trim()
		.replace(/\s+/g, " ");
	const [dateFrom, dateTo] = findMatchDates(html);
	const location = findMatchLocation(html);

	const links = extractLinks(html, matchUrl);
	const sourceLinks = {};
	for (const link of links) {
		const label = link.text.toUpperCase();
		if (label) sourceLinks[label] = link.href;
	}

	const verifyPdfUrl = links.find(
		(link) => link.text.toUpperCase() === "VERIFY",
	)?.href;
	const rankingUrl = links.find((link) =>
		link.href.includes(`/front/match/ranking/${matchId}`),
	)?.href;
	const imageUrls = extractImageUrls(html, matchUrl).filter((imageUrl) =>
		imageUrl.includes(`/uploads/gare/${matchId}/locandina-anteprima/`),
	);

	return {
		matchId,
		matchUrl: url.toString(),
		title,
		dateFrom,
		dateTo,
		location,
		rankingUrl,
		verifyPdfUrl,
		imageUrls: [...new Set(imageUrls)],
		sourceLinks,
		fetchedAt: new Date().toISOString(),
	};
}

function findMatchLocation(html) {
	const locationHtml = matchFirst(
		html,
		/<li[^>]*>\s*<i[^>]*data-name=["']location["'][\s\S]*?<\/i>\s*\|\s*([\s\S]*?)<\/li>/i,
	);
	return optionalText(
		decodeHtml(stripTags(locationHtml ?? ""))
			.trim()
			.replace(/\s+/g, " "),
	);
}

function findMatchDates(html) {
	const listCardDate = matchFirst(
		html,
		/<h5[^>]*class=["']text-primary["'][^>]*>(\d{2}\/\d{2}\/\d{4}\s*\|\s*\d{2}\/\d{2}\/\d{4})<\/h5>/i,
	);
	if (listCardDate)
		return listCardDate.split("|").map((part) => parseItalianDate(part.trim()));

	const detailsDate = html.match(
		/<h2[^>]*class=["']text-primary["'][^>]*>\s*(\d{2}\/\d{2}\/\d{4})\s*<br\s*\/?>\s*(\d{2}\/\d{2}\/\d{4})\s*<\/h2>/i,
	);
	return [
		parseItalianDate(detailsDate?.[1] ?? ""),
		parseItalianDate(detailsDate?.[2] ?? ""),
	];
}

function extractLinks(html, baseUrl) {
	const links = [];
	const regex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
	for (const match of html.matchAll(regex)) {
		const href = matchFirst(match[1], /href=["']([^"']+)["']/i);
		if (!href) continue;
		links.push({
			href: new URL(decodeHtml(href), baseUrl).toString(),
			text: decodeHtml(stripTags(match[2])).trim().replace(/\s+/g, " "),
		});
	}
	return links;
}

function extractImageUrls(html, baseUrl) {
	const urls = [];
	const regex = /<img\b([^>]*)>/gi;
	for (const match of html.matchAll(regex)) {
		const src = matchFirst(match[1], /src=["']([^"']+)["']/i);
		if (src) urls.push(new URL(decodeHtml(src), baseUrl).toString());
	}
	return urls;
}

async function throttleRequests() {
	if (requestDelayMs <= 0) return;
	const elapsed = Date.now() - lastRequestAt;
	if (elapsed < requestDelayMs) {
		await new Promise((resolve) =>
			setTimeout(resolve, requestDelayMs - elapsed),
		);
	}
	lastRequestAt = Date.now();
}

async function fetchText(url) {
	await throttleRequests();
	const response = await fetch(url, {
		headers: { "user-agent": "shooting-logbook-mare2-importer/0.1" },
	});
	if (!response.ok) throw new Error(`GET ${url} failed: ${response.status}`);
	return response.text();
}

async function fetchBinary(url) {
	await throttleRequests();
	const response = await fetch(url, {
		headers: { "user-agent": "shooting-logbook-mare2-importer/0.1" },
	});
	if (!response.ok) throw new Error(`GET ${url} failed: ${response.status}`);
	return new Uint8Array(await response.arrayBuffer());
}

async function fetchBinaryToCache(url, outputPath, force) {
	if (!force && existsSync(outputPath))
		return new Uint8Array(await readFile(outputPath));
	const bytes = await fetchBinary(url);
	await mkdir(path.dirname(outputPath), { recursive: true });
	await writeFile(outputPath, bytes);
	return bytes;
}

async function extractPdfText(bytes) {
	const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
	pdfjs.GlobalWorkerOptions.workerSrc = new URL(
		"../../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
		import.meta.url,
	).toString();
	const pdf = await pdfjs.getDocument({ data: bytes }).promise;
	const pageTexts = [];

	for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
		const page = await pdf.getPage(pageNumber);
		const content = await page.getTextContent();
		const rows = new Map();

		for (const item of content.items) {
			if (!("str" in item) || !item.str.trim()) continue;
			const y = Math.round(item.transform[5]);
			rows.set(y, [...(rows.get(y) ?? []), item]);
		}

		pageTexts.push(
			[...rows.entries()]
				.sort(([a], [b]) => b - a)
				.map(([, rowItems]) =>
					rowItems
						.sort((a, b) => a.transform[4] - b.transform[4])
						.map((item) => item.str)
						.join(" ")
						.replace(/\s+/g, " ")
						.trim(),
				)
				.join("\n"),
		);
	}

	return pageTexts.join("\n");
}

function parseMare2TextSnapshot(text, details, verifyPdfSha256) {
	const normalizedText = text.replace(/\r\n?/g, "\n");
	const lines = normalizedText.split("\n");
	const matchName = findMatchName(lines) || details.title;
	const matchDate =
		findPrintedDate(lines) ||
		details.dateTo ||
		details.dateFrom ||
		new Date().toISOString().slice(0, 10);
	const importedAt = new Date().toISOString();
	const practiscoreMatchId = `mare2:${details.matchId}`;
	const competitors = [];
	const scores = [];
	const stageBestPoints = new Map();

	let currentCompetitor;
	for (const line of lines) {
		const competitor = parseCompetitorLine(line);
		if (competitor) {
			currentCompetitor = competitor;
			competitors.push(competitor);
			continue;
		}

		const stageScore = currentCompetitor
			? parseStageScoreLine(line, currentCompetitor.internalMemberId)
			: undefined;
		if (!stageScore) continue;
		scores.push(stageScore);
		stageBestPoints.set(
			stageScore.internalStageId,
			Math.max(
				stageBestPoints.get(stageScore.internalStageId) ?? 0,
				stageScore.finalScore ?? 0,
			),
		);
	}

	if (!competitors.length || !scores.length) {
		throw new Error("No Mare2 score verification data found in VERIFY PDF.");
	}

	const stages = [...stageBestPoints.entries()]
		.sort(([a], [b]) => Number(a) - Number(b))
		.map(([stageId, bestPoints]) => {
			const minRounds = bestPoints > 0 ? Math.ceil(bestPoints / 5) : undefined;
			return {
				internalStageId: stageId,
				name: `Stage ${stageId}`,
				maxPoints: minRounds ? minRounds * 5 : undefined,
				minRounds,
			};
		});

	return {
		practiscoreMatchId,
		importedAt,
		sourceFileName:
			details.verifyPdfUrl?.split("/").pop() ?? "mare2-verify.pdf",
		match: {
			internalMatchId: practiscoreMatchId,
			name: matchName,
			date: matchDate,
			location: details.location,
		},
		stages,
		competitors,
		scores,
		rawXml: {
			MARE2_TEXT_SHA256: sha256(new TextEncoder().encode(normalizedText)),
			MARE2_VERIFY_PDF_SHA256: verifyPdfSha256,
		},
	};
}

const ITALIAN_MONTHS = {
	gen: "01",
	feb: "02",
	mar: "03",
	apr: "04",
	mag: "05",
	giu: "06",
	lug: "07",
	ago: "08",
	set: "09",
	ott: "10",
	nov: "11",
	dic: "12",
};

function findMatchName(lines) {
	const titleIndex = lines.findIndex(
		(line) => line.trim().toLowerCase() === "score verification by competitor",
	);
	return titleIndex >= 0 ? lines[titleIndex + 1]?.trim() : undefined;
}

function findPrintedDate(lines) {
	const printedLine = lines.find((line) =>
		/Printed\s+\d{1,2}\s+\p{L}{3}\s+\d{4}/iu.test(line),
	);
	const match = printedLine?.match(
		/Printed\s+(\d{1,2})\s+(\p{L}{3})\s+(\d{4})/iu,
	);
	if (!match) return undefined;
	const [, day, monthName, year] = match;
	return `${year}-${ITALIAN_MONTHS[monthName.toLowerCase()] ?? "01"}-${day.padStart(2, "0")}`;
}

function parseCompetitorLine(line) {
	const match = line.match(
		/^\s*(\d+)\s+(.+?)\s+DIV:\s*(\S+)\s+CLASS:\s*(\S+)\s+FACTOR:\s*(\S+)(?:\s+CATEGORY:\s*(.*))?\s*$/,
	);
	if (!match) return undefined;
	const [, number, rawName, division, , , category] = match;
	const displayName = rawName.trim().replace(/\s+/g, " ");
	const [lastName, ...firstNameParts] = displayName
		.split(",")
		.map((part) => part.trim());

	return {
		internalMemberId: number,
		competitorNumber: number,
		firstName: firstNameParts.join(" ") || undefined,
		lastName: lastName || undefined,
		displayName,
		divisionId: division,
		categoryId: optionalText(category),
		disqualified: false,
	};
}

function parseStageScoreLine(line, internalMemberId) {
	const match = line.match(
		/^\s*Stage\s+(\d+)\s+([\d,.]+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)(?:\s+\S+)?\s+([\d,.]+)\s*$/i,
	);
	if (!match) return undefined;
	const [
		,
		stageId,
		factor,
		points,
		alpha,
		charlie,
		delta,
		,
		misses,
		noShoot,
		procedurals,
		time,
	] = match;
	return {
		internalStageId: stageId,
		internalMemberId,
		scoreA: parseInteger(alpha),
		scoreC: parseInteger(charlie),
		scoreD: parseInteger(delta),
		misses: parseInteger(misses),
		penalties: parseInteger(noShoot),
		procedurals: parseInteger(procedurals),
		shootTime: parseDecimal(time),
		hitFactor: parseDecimal(factor),
		finalScore: parseInteger(points),
		disqualified: false,
	};
}

async function convertToWebp(inputPath, outputPath, force) {
	if (!force && existsSync(outputPath)) return;
	await mkdir(path.dirname(outputPath), { recursive: true });

	try {
		await run("magick", [
			inputPath,
			"-auto-orient",
			"-quality",
			"82",
			outputPath,
		]);
	} catch (error) {
		const fallbackPath = outputPath.replace(/\.webp$/i, ".jpg");
		await copyFile(inputPath, fallbackPath);
		throw new Error(
			`ImageMagick conversion failed. Copied fallback to ${fallbackPath}.`,
			{ cause: error },
		);
	}
}

function run(command, args) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, { stdio: "pipe" });
		let stderr = "";
		child.stderr.on("data", (chunk) => {
			stderr += chunk.toString();
		});
		child.on("error", reject);
		child.on("close", (code) => {
			if (code === 0) resolve();
			else
				reject(
					new Error(
						`${command} ${args.join(" ")} exited with ${code}: ${stderr}`,
					),
				);
		});
	});
}

function parseItalianDate(value) {
	const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
	if (!match) return undefined;
	const [, day, month, year] = match;
	return `${year}-${month}-${day}`;
}

function matchFirst(value, regex) {
	return value.match(regex)?.[1];
}

function stripTags(value) {
	return value.replace(/<[^>]*>/g, " ");
}

function decodeHtml(value) {
	return value
		.replace(/&amp;/g, "&")
		.replace(/&#039;/g, "'")
		.replace(/&quot;/g, '"')
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&nbsp;/g, " ");
}

function optionalText(value) {
	const trimmed = value?.trim();
	return trimmed ? trimmed : undefined;
}

function parseInteger(value) {
	return Number.parseInt(value, 10);
}

function parseDecimal(value) {
	return Number.parseFloat(value.replace(",", "."));
}

function sha256(bytes) {
	return createHash("sha256").update(bytes).digest("hex");
}

async function writeJson(filePath, value) {
	await mkdir(path.dirname(filePath), { recursive: true });
	await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function printStdout(message) {
	process.stdout.write(message);
}

function printStderr(message) {
	process.stderr.write(message);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	main().catch((error) => {
		printStderr(`${error instanceof Error ? error.message : String(error)}\n`);
		process.exitCode = 1;
	});
}
