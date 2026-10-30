import { App } from 'obsidian';

/** Shiki's built-in language for code with no grammar (e.g. `.fga` files). */
const PLAIN_TEXT = 'plaintext';

/**
 * The part of the Shiki Highlighter plugin's highlighter that this plugin calls.
 *
 * See https://github.com/mProjectsCode/obsidian-shiki-plugin.
 */
export interface ShikiHighlighter {
	/** Language names and aliases (e.g. `go`, `tf`, `yml`) that Shiki Highlighter highlights in notes. */
	obsidianSafeLanguageNames(): string[];

	/**
	 * Renders `code` with Expressive Code into `el`.
	 *
	 * @param meta The options that would follow the language on a fence line (e.g. `showLineNumbers`)
	 */
	renderWithEc(code: string, language: string, meta: string, el: HTMLElement): Promise<void>;
}

type PluginRegistry = { plugins?: Record<string, { highlighter?: Partial<ShikiHighlighter> } | undefined> };

/**
 * Returns the highlighter of the Shiki Highlighter plugin (`shiki-highlighter`),
 * or `undefined` when that plugin is disabled or has not finished loading.
 */
export function getShikiHighlighter(app: App): ShikiHighlighter | undefined {
	// `App.plugins` is missing from Obsidian's public type definitions.
	const registry = (app as App & { plugins?: PluginRegistry }).plugins;
	const highlighter = registry?.plugins?.['shiki-highlighter']?.highlighter;
	if (
		typeof highlighter?.renderWithEc !== 'function' ||
		typeof highlighter.obsidianSafeLanguageNames !== 'function'
	) {
		return undefined;
	}

	return highlighter as ShikiHighlighter;
}

/**
 * Picks the Shiki language for a file: its extension (e.g. `tf`) if Shiki lists it,
 * then the PrismJS tag from {@link Langs} (e.g. `c` for `.h`), then plain text.
 */
export function shikiLanguageFor(shiki: ShikiHighlighter, path: string, prismLang: string | undefined): string {
	const supported = new Set(shiki.obsidianSafeLanguageNames());
	const extension = path.split('.').pop()?.toLowerCase();
	return [extension, prismLang].find((lang): lang is string => !!lang && supported.has(lang)) ?? PLAIN_TEXT;
}
