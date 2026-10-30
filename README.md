# GitHub Embeds (Shiki)

Paste a GitHub permalink into an Obsidian note. Reading view shows the linked lines as a code card. The card's line numbers match the file.

This plugin is a fork of [GitHub Embeds](https://github.com/MrGVSV/obsidian-github-embeds) 1.0.7 by Gino Valente. [Shiki Highlighter](https://github.com/mProjectsCode/obsidian-shiki-plugin) renders each card.

## Why a fork

With upstream GitHub Embeds, a link to `#L1086-L1139` shows coloured code without line numbers. Three steps lead there:

1. Upstream wraps the snippet in a code fence. It renders the fence with `MarkdownRenderer.render`.
2. Shiki Highlighter calls `getSectionInfo` to read the fence's line in the note. That line holds options such as `showLineNumbers`.
3. The fence came from GitHub, so the note has no fence line. Shiki colours the code with its default options, which show no line numbers.

This fork calls Shiki's renderer directly and passes the options itself.

## How a card renders

1. `getShikiHighlighter` looks up the Shiki Highlighter plugin. If that plugin is off or loading, the card renders the upstream way.
2. `shikiLanguageFor` picks a language from Shiki's own list, `obsidianSafeLanguageNames`. It tries the file extension first, such as `tf` or `yml`. Next it tries upstream's PrismJS name, such as `c` for a `.h` file. Shiki has no grammar for some files, such as `.fga`. Those render as `plaintext`.
3. `renderWithEc` draws the code with `showLineNumbers startLineNumber=<first line> wrap`. A link to `#L172-L183` shows lines 172 to 183. Long lines wrap inside the code column.
4. If `renderWithEc` fails, the card renders the upstream way.

Obsidian finds plugin updates by looking up each plugin's ID in the community store. This plugin's ID is `github-embeds-shiki`, and the store lists no plugin under that ID. So Obsidian never offers upstream as an update to this fork.

## Install

1. Install and enable **Shiki Highlighter** from Obsidian's community plugins.
2. Build this plugin:

   ```sh
   git clone https://github.com/andrewloux/github-embeds-shiki.git
   cd github-embeds-shiki
   npm ci
   npm run build
   ```

3. Copy `main.js`, `manifest.json` and `styles.css` into `<vault>/.obsidian/plugins/github-embeds-shiki/`.
4. Reload Obsidian. Open Settings → Community plugins and enable **GitHub Embeds (Shiki)**.
5. Paste a GitHub token into the plugin's settings. Every GitHub API call needs one. For private repositories, use a [fine-grained token](https://github.com/settings/personal-access-tokens/new). Give it read-only **Contents**, **Issues** and **Pull requests** permissions.

The plugin saves the token as plain text in `<vault>/.obsidian/plugins/github-embeds-shiki/data.json`. Obsidian Sync and git copy that file with the rest of the vault.

## Usage

Paste a permalink into a note. Then switch to Reading view:

```
https://github.com/<owner>/<repo>/blob/<sha>/<path>#L12-L19
```

- `#L12` shows one line. `#L12-L19` shows lines 12 to 19. A link without `#L` shows the whole file.
- Long snippets start collapsed. The **Snippet preview threshold** setting sets the limit, `10` lines by default. Click a snippet's file path to open it.
- Issue and pull request links get cards too, as in upstream. Turn them off under **Issues → Enable**.

## Limits from upstream

- Cards render in Reading view only. Live Preview shows the plain link.
- Every GitHub `blob`, `issues` and `pull` link in a note gets a card. Upstream has no way to skip one link.
- Each card downloads the whole file. Then it cuts out the line range.

## License

MIT. Copyright (c) 2023 Gino Valente. This fork's changes use the same license.
