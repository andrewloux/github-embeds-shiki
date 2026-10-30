import { Component, MarkdownRenderChild } from 'obsidian';

/**
 * What an {@link EmbedContainer} attaches its lifecycle to: the `MarkdownPostProcessorContext`
 * in Reading view, or the widget's {@link Component} in Live Preview.
 */
export type EmbedParent = { addChild(child: MarkdownRenderChild): unknown };

/**
 * Container for embed components.
 *
 * This class is used to manage the lifecycle of embed components,
 * and is itself managed by its {@link EmbedParent}.
 *
 * Each instance of this class is associated with at most a single component.
 */
export class EmbedContainer {
	private readonly container: MarkdownRenderChild;
	private currentChild: Component | null = null;

	constructor(
		public readonly containerEl: HTMLElement,
		parent: EmbedParent,
	) {
		this.container = new MarkdownRenderChild(containerEl);
		parent.addChild(this.container);
	}

	/**
	 * Calls `callback` when this container unloads.
	 */
	public register(callback: () => void) {
		this.container.register(callback);
	}

	/**
	 * Set the child component of this container.
	 *
	 * Unloads the previous child component, if any.
	 *
	 * @param child A function to create the child component from the container element.
	 */
	public setChild<T extends Component>(child: (containerEl: HTMLElement) => T): T {
		if (this.currentChild) {
			this.container.removeChild(this.currentChild);
			this.containerEl.empty();
		}

		const component = child(this.containerEl);
		this.currentChild = this.container.addChild(component);
		return component;
	}

	/**
	 * Removes the child component from this container and empties the element.
	 */
	public empty() {
		if (this.currentChild) {
			this.container.removeChild(this.currentChild);
		}

		this.containerEl.empty();
	}
}
