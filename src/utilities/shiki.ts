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

/**
 * A rendered block in Shiki Highlighter's registry. After every highlighter reload
 * (theme change, light/dark switch), Shiki Highlighter calls `forceRerender` on each one.
 */
interface ShikiActiveBlock {
	ctx: { sourcePath: string };
	forceRerender(): Promise<void>;
	rerenderOnNoteChange(): Promise<void>;
}

/**
 * The part of the Shiki Highlighter plugin that this plugin calls.
 */
export interface ShikiPlugin {
	highlighter: ShikiHighlighter;
	addActiveCodeBlock(block: ShikiActiveBlock): void;
	removeActiveCodeBlock(block: ShikiActiveBlock): void;
}

type PluginRegistry = { plugins?: Record<string, Partial<ShikiPlugin> | undefined> };

/**
 * Returns the Shiki Highlighter plugin (`shiki-highlighter`),
 * or `undefined` when that plugin is disabled or has not finished loading.
 */
export function getShikiPlugin(app: App): ShikiPlugin | undefined {
	// `App.plugins` is missing from Obsidian's public type definitions.
	const registry = (app as App & { plugins?: PluginRegistry }).plugins;
	const plugin = registry?.plugins?.['shiki-highlighter'];
	if (
		typeof plugin?.addActiveCodeBlock !== 'function' ||
		typeof plugin.removeActiveCodeBlock !== 'function' ||
		typeof plugin.highlighter?.renderWithEc !== 'function' ||
		typeof plugin.highlighter.obsidianSafeLanguageNames !== 'function'
	) {
		return undefined;
	}

	return plugin as ShikiPlugin;
}

/**
 * Picks the Shiki language for a file: its extension (e.g. `tf`) if Shiki lists it,
 * then the PrismJS tag from {@link Langs} (e.g. `c` for `.h`), then plain text.
 */
export function shikiLanguageFor(shiki: ShikiPlugin, path: string, prismLang: string | undefined): string {
	const supported = new Set(shiki.highlighter.obsidianSafeLanguageNames());
	const extension = path.split('.').pop()?.toLowerCase();
	return [extension, prismLang].find((lang): lang is string => !!lang && supported.has(lang)) ?? PLAIN_TEXT;
}

/**
 * Adds `render` to Shiki Highlighter's registry, so a theme change or light/dark switch
 * re-renders the snippet. Returns the function that removes it.
 */
export function rerenderOnShikiReload(shiki: ShikiPlugin, render: () => Promise<void>): () => void {
	const block: ShikiActiveBlock = {
		// Shiki Highlighter groups blocks by note path and calls `rerenderOnNoteChange` when that
		// note is saved. A snippet's code comes from GitHub, so note saves leave it as is.
		ctx: { sourcePath: 'github-embeds-shiki' },
		forceRerender: () => render().catch((err) => console.error('Shiki failed to re-render file snippet', err)),
		rerenderOnNoteChange: async () => {},
	};
	shiki.addActiveCodeBlock(block);
	return () => shiki.removeActiveCodeBlock(block);
}
