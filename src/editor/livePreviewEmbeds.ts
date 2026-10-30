import { syntaxTree } from '@codemirror/language';
import { EditorState, RangeSetBuilder, StateField, Transaction } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, WidgetType } from '@codemirror/view';
import { Component, editorLivePreviewField } from 'obsidian';
import { Client } from '../client';
import { Settings } from '../settings';
import styles from '../styles.scss';

/**
 * Renders the embed for `url` into `el`.
 *
 * `parent` lives as long as the widget's DOM, so anything registered on it
 * is released when the editor drops the widget.
 */
export type RenderEmbed = (url: string, el: HTMLElement, parent: Component) => void;

/** Candidate GitHub URLs in note text; {@link Client} decides which ones embed. */
const githubUrlRegex = /https:\/\/github\.com\/[^\s<>()[\]`]+/g;

/**
 * A Live Preview extension that draws an embed below every line holding an embeddable GitHub URL,
 * the way the Reading view post-processor does.
 */
export function livePreviewEmbeds(settings: Settings, render: RenderEmbed): StateField<DecorationSet> {
	return StateField.define<DecorationSet>({
		create: (state) => buildDecorations(state, settings, render),
		update: (decorations, tr) =>
			needsRebuild(tr) ? buildDecorations(tr.state, settings, render) : decorations.map(tr.changes),
		provide: (field) => EditorView.decorations.from(field),
	});
}

function needsRebuild(tr: Transaction): boolean {
	return (
		tr.docChanged ||
		// The parser finishes long notes in the background, which adds new `url` nodes.
		syntaxTree(tr.state) !== syntaxTree(tr.startState) ||
		tr.state.field(editorLivePreviewField, false) !== tr.startState.field(editorLivePreviewField, false)
	);
}

function buildDecorations(state: EditorState, settings: Settings, render: RenderEmbed): DecorationSet {
	if (!state.field(editorLivePreviewField, false)) {
		return Decoration.none;
	}

	const builder = new RangeSetBuilder<Decoration>();
	const tree = syntaxTree(state);
	const text = state.doc.toString();
	const urls = new RegExp(githubUrlRegex);

	for (let match = urls.exec(text); match; match = urls.exec(text)) {
		const from = match.index;
		if (!isUrlToken(tree.resolveInner(from + 1, 1).name)) {
			continue;
		}

		const url = match[0].replace(/[.,;:!?]+$/, '');
		const embed =
			(Client.isFileUrl(url) && settings.embedFiles) || (Client.isIssueUrl(url) && settings.embedIssues);
		if (!embed) {
			continue;
		}

		const lineEnd = state.doc.lineAt(from).to;
		builder.add(
			lineEnd,
			lineEnd,
			Decoration.widget({ widget: new EmbedWidget(url, render), block: true, side: 1 }),
		);
	}

	return builder.finish();
}

/**
 * Obsidian's Markdown parser names URL tokens `url` (bare) or `..._url` (link targets).
 * Text in code spans and code blocks carries other names, so it gets no embed.
 */
function isUrlToken(nodeName: string): boolean {
	return nodeName.split('_').includes('url');
}

class EmbedWidget extends WidgetType {
	private readonly components = new WeakMap<HTMLElement, Component>();

	constructor(
		private readonly url: string,
		private readonly render: RenderEmbed,
	) {
		super();
	}

	eq(other: EmbedWidget): boolean {
		return other.url === this.url;
	}

	toDOM(): HTMLElement {
		const el = createDiv({ cls: styles.embedContainer });
		const component = new Component();
		component.load();
		this.components.set(el, component);
		this.render(this.url, el, component);
		return el;
	}

	destroy(dom: HTMLElement): void {
		this.components.get(dom)?.unload();
		this.components.delete(dom);
	}

	// Clicks inside the card (expand, links) belong to the card, not the editor.
	ignoreEvent(): boolean {
		return true;
	}
}
