# HTML Table Paste

An Obsidian plugin for pasting clipboard HTML tables into Markdown notes while keeping useful table structure and cell styling.

## What it does

- Adds editor context menu actions for choosing how clipboard table data should be pasted.
- Inserts HTML tables directly instead of Obsidian's default Markdown-style paste output when you choose the HTML table action.
- Converts clipboard table data to Markdown tables, either using clipboard `<th>` cells as headers or forcing the first row to be the Markdown header.
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

## Usage

- Right-click in a Markdown editor and choose `Paste as Markdown table` to convert the clipboard table to Markdown. If the clipboard HTML contains `<th>` cells in the first row, they are used as headers. Otherwise generic `Column 1`, `Column 2`, ... headers are inserted because Markdown tables require a header row.
- Right-click in a Markdown editor and choose `Paste as Markdown table, first row as header` to force the first clipboard row to become the Markdown table header.
- Right-click in a Markdown editor and choose `Paste as HTML table` to paste the clipboard's first HTML table.
- Use the command palette action `Insert HTML table from clipboard` for the same HTML-table paste behavior.
- Regular `Ctrl+V` / `Cmd+V` is left to Obsidian's default paste behavior.

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
