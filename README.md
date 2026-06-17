# HTML Table Paste

An Obsidian plugin for pasting clipboard HTML tables into Markdown notes while keeping useful table structure and cell styling.

## What it does

- Intercepts paste events in Markdown notes when the clipboard contains an HTML `<table>`.
- Inserts the HTML table directly instead of Obsidian's default Markdown-style paste output.
- Preserves cell background colors from inline styles, stylesheet rules, and `bgcolor` attributes when available.
- Keeps table rows readable in source mode by outputting one `<tr>...</tr>` per line while keeping cells on the same line.
- Removes unsupported tags and attributes from pasted table HTML.

Example output shape:

```html
<table><tbody>
<tr><td>...</td><td>...</td></tr>
<tr><td>...</td><td>...</td></tr>
</tbody></table>
```

## Install for local use

Copy these files into your vault plugin directory:

- `manifest.json`
- `main.js`
- `versions.json`

Example destination:

```text
.obsidian/plugins/html-table-paste/
```

Then enable the plugin from Obsidian's community plugins settings.

## Build

```bash
npm install
npm run build
```

## Notes

- This is desktop-only.
- Whether spreadsheet cell colors survive depends on what HTML your clipboard actually contains.
- The plugin currently keeps a narrow set of tags and attributes to avoid dumping arbitrary clipboard HTML into notes.
- Licensed under the MIT License.
