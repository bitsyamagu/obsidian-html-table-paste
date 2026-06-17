import { Editor, MarkdownView, Notice, Plugin } from "obsidian";

type ClipboardTableCell = {
  text: string;
  isHeader: boolean;
};

type ClipboardTable = ClipboardTableCell[][];

export default class HtmlTablePastePlugin extends Plugin {
  async onload(): Promise<void> {
    this.addCommand({
      id: "insert-html-table-from-clipboard",
      name: "Insert HTML table from clipboard",
      callback: async () => {
        const html = await readClipboardHtml();
        if (!html || !html.includes("<table")) {
          new Notice("Clipboard does not contain HTML table text.");
          return;
        }

        if (this.insertHtmlTableFromClipboardHtml(html)) {
          new Notice("Inserted HTML table.");
        } else {
          new Notice("No HTML table found in clipboard.");
        }
      },
    });

    this.registerEvent(this.app.workspace.on("editor-menu", (menu, editor) => {
      menu.addItem((item) => {
        item
          .setTitle("Paste as Markdown table")
          .setIcon("sheet")
          .onClick(async () => {
            await this.insertMarkdownTableFromClipboard(editor, false);
          });
      });

      menu.addItem((item) => {
        item
          .setTitle("Paste as Markdown table, first row as header")
          .setIcon("heading")
          .onClick(async () => {
            await this.insertMarkdownTableFromClipboard(editor, true);
          });
      });

      menu.addItem((item) => {
        item
          .setTitle("Paste as HTML table")
          .setIcon("table")
          .onClick(async () => {
            const html = await readClipboardHtml();
            if (!html || !html.includes("<table")) {
              new Notice("Clipboard does not contain HTML table text.");
              return;
            }

            if (this.insertHtmlTable(editor, html)) {
              new Notice("Inserted HTML table.");
            } else {
              new Notice("No HTML table found in clipboard.");
            }
          });
      });
    }));
  }

  private insertHtmlTableFromClipboardHtml(html: string): boolean {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) {
      return false;
    }

    return this.insertHtmlTable(view.editor, html);
  }

  private insertHtmlTable(editor: Editor, html: string): boolean {
    const tableHtml = extractAndCleanFirstTable(html);
    if (!tableHtml) {
      return false;
    }

    editor.replaceSelection(`${tableHtml}\n`);
    return true;
  }

  private async insertMarkdownTableFromClipboard(editor: Editor, forceFirstRowAsHeader: boolean): Promise<void> {
    const html = await readClipboardHtml();
    const text = await readClipboardText();
    const markdownTable = createMarkdownTableFromClipboard(html, text, forceFirstRowAsHeader);

    if (!markdownTable) {
      new Notice("Clipboard does not contain table data.");
      return;
    }

    editor.replaceSelection(`${markdownTable}\n`);
    new Notice("Inserted Markdown table.");
  }
}

async function readClipboardHtml(): Promise<string | null> {
  if (!navigator.clipboard.read) {
    return null;
  }

  const items = await navigator.clipboard.read();
  for (const item of items) {
    if (!item.types.includes("text/html")) {
      continue;
    }

    const blob = await item.getType("text/html");
    return await blob.text();
  }

  return null;
}

async function readClipboardText(): Promise<string | null> {
  if (!navigator.clipboard.readText) {
    return null;
  }

  const text = await navigator.clipboard.readText();
  return text || null;
}

function createMarkdownTableFromClipboard(
  html: string | null,
  text: string | null,
  forceFirstRowAsHeader: boolean,
): string | null {
  const table = html ? extractClipboardTable(html) : null;
  const rows = table ?? (text ? parseDelimitedTable(text) : null);

  if (!rows || rows.length === 0 || rows.every((row) => row.length === 0)) {
    return null;
  }

  return formatMarkdownTable(rows, forceFirstRowAsHeader);
}

function extractClipboardTable(html: string): ClipboardTable | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const table = doc.querySelector("table");

  if (!table) {
    return null;
  }

  const rows = Array.from(table.querySelectorAll("tr"))
    .map((row) => Array.from(row.children)
      .filter((child) => child.tagName === "TD" || child.tagName === "TH")
      .map((cell) => ({
        text: getCellMarkdownText(cell),
        isHeader: cell.tagName === "TH",
      })))
    .filter((row) => row.length > 0);

  return rows.length > 0 ? rows : null;
}

function parseDelimitedTable(text: string): ClipboardTable | null {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return null;
  }

  const delimiter = lines.some((line) => line.includes("\t")) ? "\t" : ",";
  const rows = lines
    .map((line) => line.split(delimiter).map((cell) => ({
      text: normalizeCellText(cell),
      isHeader: false,
    })))
    .filter((row) => row.length > 0);

  return rows.length > 0 ? rows : null;
}

function formatMarkdownTable(rows: ClipboardTable, forceFirstRowAsHeader: boolean): string | null {
  const width = Math.max(...rows.map((row) => row.length));
  if (width === 0) {
    return null;
  }

  const normalizedRows = rows.map((row) => padRow(row, width));
  const firstRowHasHeaders = normalizedRows[0].some((cell) => cell.isHeader);
  const header = forceFirstRowAsHeader || firstRowHasHeaders
    ? normalizedRows[0].map((cell) => cell.text)
    : Array.from({ length: width }, (_, index) => `Column ${index + 1}`);
  const bodyRows = forceFirstRowAsHeader || firstRowHasHeaders
    ? normalizedRows.slice(1)
    : normalizedRows;

  return [
    formatMarkdownRow(header),
    formatMarkdownRow(Array.from({ length: width }, () => "---")),
    ...bodyRows.map((row) => formatMarkdownRow(row.map((cell) => cell.text))),
  ].join("\n");
}

function padRow(row: ClipboardTableCell[], width: number): ClipboardTableCell[] {
  return [
    ...row,
    ...Array.from({ length: width - row.length }, () => ({ text: "", isHeader: false })),
  ];
}

function formatMarkdownRow(cells: string[]): string {
  return `| ${cells.map(escapeMarkdownTableCell).join(" | ")} |`;
}

function getCellMarkdownText(cell: Element): string {
  return normalizeCellText(cell.textContent ?? "");
}

function normalizeCellText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function escapeMarkdownTableCell(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\|/g, "\\|");
}

function extractAndCleanFirstTable(html: string): string | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const table = doc.querySelector("table");

  if (!table) {
    return null;
  }

  applyStylesheetCellBackgrounds(doc, table);
  applyCellBackgroundAttributes(table);
  sanitizeTable(table);
  normalizeTableWhitespace(table);
  return formatTableHtml(table);
}

function normalizeTableWhitespace(table: HTMLTableElement): void {
  const structuralTags = new Set(["TABLE", "THEAD", "TBODY", "TFOOT", "TR", "COLGROUP"]);

  for (const element of Array.from(table.querySelectorAll("*"))) {
    if (structuralTags.has(element.tagName)) {
      removeWhitespaceOnlyTextNodes(element);
    }
  }

  for (const cell of Array.from(table.querySelectorAll("td, th, caption"))) {
    trimEdgeTextNodes(cell);
  }
}

function removeWhitespaceOnlyTextNodes(element: Element): void {
  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim() === "") {
      child.remove();
    }
  }
}

function trimEdgeTextNodes(element: Element): void {
  const first = element.firstChild;
  if (first?.nodeType === Node.TEXT_NODE && first.textContent) {
    first.textContent = first.textContent.replace(/^\s+/, "");
  }

  const last = element.lastChild;
  if (last?.nodeType === Node.TEXT_NODE && last.textContent) {
    last.textContent = last.textContent.replace(/\s+$/, "");
  }
}

function formatTableHtml(table: HTMLTableElement): string {
  return table.outerHTML
    .replace(/(<(?:table|thead|tbody|tfoot)\b[^>]*>)(?=<tr\b)/g, "$1\n")
    .replace(/(<\/tr>)(?=<tr\b)/g, "$1\n")
    .replace(/(<\/tr>)(?=<\/(?:table|thead|tbody|tfoot)>)/g, "$1\n");
}

function applyStylesheetCellBackgrounds(doc: Document, table: HTMLTableElement): void {
  for (const style of Array.from(doc.querySelectorAll("style"))) {
    for (const rule of parseCssRules(style.textContent ?? "")) {
      const backgroundColor = getCssProperty(rule.declarations, "background-color");
      const background = getCssProperty(rule.declarations, "background");
      const color = backgroundColor || extractBackgroundColor(background);

      if (!color) {
        continue;
      }

      for (const selector of rule.selectors) {
        let matches: Element[];
        try {
          matches = Array.from(doc.querySelectorAll(selector)).filter((element) => table.contains(element));
        } catch {
          continue;
        }

        for (const element of matches) {
          if (element.tagName === "TD" || element.tagName === "TH") {
            const cell = element as HTMLTableCellElement;
            if (!cell.style.backgroundColor) {
              cell.style.backgroundColor = color;
            }
          }
        }
      }
    }
  }
}

function applyCellBackgroundAttributes(table: HTMLTableElement): void {
  for (const element of Array.from(table.querySelectorAll<HTMLTableCellElement>("td, th"))) {
    const background = element.getAttribute("bgcolor");
    if (background && !element.style.backgroundColor) {
      element.style.backgroundColor = background;
    }
  }
}

function parseCssRules(css: string): { selectors: string[]; declarations: string }[] {
  const rules: { selectors: string[]; declarations: string }[] = [];
  const cleanedCss = css
    .replace(/<!--|-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  const rulePattern = /([^{}]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;

  while ((match = rulePattern.exec(cleanedCss)) !== null) {
    const selectors = match[1]
      .split(",")
      .map((selector) => selector.trim())
      .filter(Boolean);

    if (selectors.length > 0) {
      rules.push({ selectors, declarations: match[2] });
    }
  }

  return rules;
}

function getCssProperty(declarations: string, propertyName: string): string | null {
  const style = document.createElement("div").style;
  style.cssText = declarations;
  const value = style.getPropertyValue(propertyName).trim();
  return value || null;
}

function extractBackgroundColor(background: string | null): string | null {
  if (!background) {
    return null;
  }

  const tempStyle = document.createElement("div").style;
  tempStyle.background = background;
  const color = tempStyle.backgroundColor.trim();
  return color && color !== "rgba(0, 0, 0, 0)" ? color : null;
}

function sanitizeTable(table: HTMLTableElement): void {
  const allowedTags = new Set([
    "TABLE",
    "THEAD",
    "TBODY",
    "TFOOT",
    "TR",
    "TH",
    "TD",
    "COLGROUP",
    "COL",
    "CAPTION",
    "P",
    "BR",
    "SPAN",
    "B",
    "STRONG",
    "I",
    "EM",
    "U",
    "S",
    "SUP",
    "SUB",
    "A",
  ]);

  for (const element of Array.from(table.querySelectorAll("*"))) {
    if (!allowedTags.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes));
      continue;
    }

    for (const attribute of Array.from(element.attributes)) {
      if (!isAllowedAttribute(element, attribute.name)) {
        element.removeAttribute(attribute.name);
      }
    }
  }
}

function isAllowedAttribute(element: Element, attributeName: string): boolean {
  if (attributeName === "style") {
    return true;
  }

  if (attributeName === "rowspan" || attributeName === "colspan") {
    return element.tagName === "TD" || element.tagName === "TH";
  }

  if (attributeName === "href") {
    return element.tagName === "A";
  }

  return false;
}
