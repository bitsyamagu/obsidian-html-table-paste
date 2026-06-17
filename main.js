"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => HtmlTablePastePlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var HtmlTablePastePlugin = class extends import_obsidian.Plugin {
  async onload() {
    this.addCommand({
      id: "insert-html-table-from-clipboard",
      name: "Insert HTML table from clipboard",
      callback: async () => {
        const html = await readClipboardHtml();
        if (!html) {
          new import_obsidian.Notice("Clipboard does not contain HTML table text.");
          return;
        }
        if (this.insertHtmlTableFromClipboardHtml(html)) {
          new import_obsidian.Notice("Inserted HTML table.");
        } else {
          new import_obsidian.Notice("No HTML table found in clipboard.");
        }
      }
    });
    this.registerEvent(this.app.workspace.on("editor-menu", (menu, editor) => {
      menu.addItem((item) => {
        item.setTitle("Paste as Markdown table").setIcon("sheet").onClick(async () => {
          await this.insertMarkdownTableFromClipboard(editor, false);
        });
      });
      menu.addItem((item) => {
        item.setTitle("Paste as Markdown table, first row as header").setIcon("heading").onClick(async () => {
          await this.insertMarkdownTableFromClipboard(editor, true);
        });
      });
      menu.addItem((item) => {
        item.setTitle("Paste as HTML table").setIcon("table").onClick(async () => {
          const html = await readClipboardHtml();
          if (!html) {
            new import_obsidian.Notice("Clipboard does not contain HTML table text.");
            return;
          }
          if (this.insertHtmlTable(editor, html)) {
            new import_obsidian.Notice("Inserted HTML table.");
          } else {
            new import_obsidian.Notice("No HTML table found in clipboard.");
          }
        });
      });
    }));
  }
  insertHtmlTableFromClipboardHtml(html) {
    const view = this.app.workspace.getActiveViewOfType(import_obsidian.MarkdownView);
    if (!view) {
      return false;
    }
    return this.insertHtmlTable(view.editor, html);
  }
  insertHtmlTable(editor, html) {
    const tableHtml = extractAndCleanFirstTable(html);
    if (!tableHtml) {
      return false;
    }
    editor.replaceSelection(`${tableHtml}
`);
    return true;
  }
  async insertMarkdownTableFromClipboard(editor, forceFirstRowAsHeader) {
    const html = await readClipboardHtml();
    const text = await readClipboardText();
    const markdownTable = createMarkdownTableFromClipboard(html, text, forceFirstRowAsHeader);
    if (!markdownTable) {
      new import_obsidian.Notice("Clipboard does not contain table data.");
      return;
    }
    editor.replaceSelection(`${markdownTable}
`);
    new import_obsidian.Notice("Inserted Markdown table.");
  }
};
async function readClipboardHtml() {
  const candidates = [];
  const electronHtml = readElectronClipboardHtml();
  if (electronHtml) {
    candidates.push(electronHtml);
  }
  if (navigator.clipboard.read) {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      if (!item.types.includes("text/html")) {
        continue;
      }
      const blob = await item.getType("text/html");
      const html = await blob.text();
      if (html) {
        candidates.push(html);
      }
    }
  }
  return candidates.find(hasHtmlTable) ?? null;
}
async function readClipboardText() {
  const electronText = readElectronClipboardText();
  if (electronText) {
    return electronText;
  }
  if (!navigator.clipboard.readText) {
    return null;
  }
  const text = await navigator.clipboard.readText();
  return text || null;
}
function readElectronClipboardHtml() {
  try {
    const electronClipboard = require("electron")?.clipboard;
    const html = electronClipboard?.readHTML?.();
    return html || null;
  } catch {
    return null;
  }
}
function readElectronClipboardText() {
  try {
    const electronClipboard = require("electron")?.clipboard;
    const text = electronClipboard?.readText?.();
    return text || null;
  } catch {
    return null;
  }
}
function hasHtmlTable(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  return doc.querySelector("table") !== null;
}
function createMarkdownTableFromClipboard(html, text, forceFirstRowAsHeader) {
  const table = html ? extractClipboardTable(html) : null;
  const rows = table ?? (text ? parseDelimitedTable(text) : null);
  if (!rows || rows.length === 0 || rows.every((row) => row.length === 0)) {
    return null;
  }
  return formatMarkdownTable(rows, forceFirstRowAsHeader);
}
function extractClipboardTable(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const table = doc.querySelector("table");
  if (!table) {
    return null;
  }
  const rows = Array.from(table.querySelectorAll("tr")).map((row) => Array.from(row.children).filter((child) => child.tagName === "TD" || child.tagName === "TH").map((cell) => ({
    text: getCellMarkdownText(cell),
    isHeader: cell.tagName === "TH"
  }))).filter((row) => row.length > 0);
  return rows.length > 0 ? rows : null;
}
function parseDelimitedTable(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((line) => line.length > 0);
  if (lines.length === 0) {
    return null;
  }
  const delimiter = lines.some((line) => line.includes("	")) ? "	" : ",";
  const rows = lines.map((line) => line.split(delimiter).map((cell) => ({
    text: normalizeCellText(cell),
    isHeader: false
  }))).filter((row) => row.length > 0);
  return rows.length > 0 ? rows : null;
}
function formatMarkdownTable(rows, forceFirstRowAsHeader) {
  const width = Math.max(...rows.map((row) => row.length));
  if (width === 0) {
    return null;
  }
  const normalizedRows = rows.map((row) => padRow(row, width));
  const firstRowHasHeaders = normalizedRows[0].some((cell) => cell.isHeader);
  const header = forceFirstRowAsHeader || firstRowHasHeaders ? normalizedRows[0].map((cell) => cell.text) : Array.from({ length: width }, (_, index) => `Column ${index + 1}`);
  const bodyRows = forceFirstRowAsHeader || firstRowHasHeaders ? normalizedRows.slice(1) : normalizedRows;
  return [
    formatMarkdownRow(header),
    formatMarkdownRow(Array.from({ length: width }, () => "---")),
    ...bodyRows.map((row) => formatMarkdownRow(row.map((cell) => cell.text)))
  ].join("\n");
}
function padRow(row, width) {
  return [
    ...row,
    ...Array.from({ length: width - row.length }, () => ({ text: "", isHeader: false }))
  ];
}
function formatMarkdownRow(cells) {
  return `| ${cells.map(escapeMarkdownTableCell).join(" | ")} |`;
}
function getCellMarkdownText(cell) {
  return normalizeCellText(cell.textContent ?? "");
}
function normalizeCellText(text) {
  return text.replace(/\s+/g, " ").trim();
}
function escapeMarkdownTableCell(text) {
  return text.replace(/\\/g, "\\\\").replace(/\|/g, "\\|");
}
function extractAndCleanFirstTable(html) {
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
function normalizeTableWhitespace(table) {
  const structuralTags = /* @__PURE__ */ new Set(["TABLE", "THEAD", "TBODY", "TFOOT", "TR", "COLGROUP"]);
  for (const element of Array.from(table.querySelectorAll("*"))) {
    if (structuralTags.has(element.tagName)) {
      removeWhitespaceOnlyTextNodes(element);
    }
  }
  for (const cell of Array.from(table.querySelectorAll("td, th, caption"))) {
    trimEdgeTextNodes(cell);
  }
}
function removeWhitespaceOnlyTextNodes(element) {
  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim() === "") {
      child.remove();
    }
  }
}
function trimEdgeTextNodes(element) {
  const first = element.firstChild;
  if (first?.nodeType === Node.TEXT_NODE && first.textContent) {
    first.textContent = first.textContent.replace(/^\s+/, "");
  }
  const last = element.lastChild;
  if (last?.nodeType === Node.TEXT_NODE && last.textContent) {
    last.textContent = last.textContent.replace(/\s+$/, "");
  }
}
function formatTableHtml(table) {
  return table.outerHTML.replace(/(<(?:table|thead|tbody|tfoot)\b[^>]*>)(?=<tr\b)/g, "$1\n").replace(/(<\/tr>)(?=<tr\b)/g, "$1\n").replace(/(<\/tr>)(?=<\/(?:table|thead|tbody|tfoot)>)/g, "$1\n");
}
function applyStylesheetCellBackgrounds(doc, table) {
  for (const style of Array.from(doc.querySelectorAll("style"))) {
    for (const rule of parseCssRules(style.textContent ?? "")) {
      const backgroundColor = getCssProperty(rule.declarations, "background-color");
      const background = getCssProperty(rule.declarations, "background");
      const color = backgroundColor || extractBackgroundColor(background) || extractRawCssBackgroundColor(rule.declarations);
      if (!color) {
        continue;
      }
      for (const selector of rule.selectors) {
        let matches;
        try {
          matches = Array.from(doc.querySelectorAll(selector)).filter((element) => table.contains(element));
        } catch {
          continue;
        }
        for (const element of matches) {
          if (element.tagName === "TD" || element.tagName === "TH") {
            const cell = element;
            if (!cell.style.backgroundColor) {
              cell.style.backgroundColor = color;
            }
          }
        }
      }
    }
  }
}
function applyCellBackgroundAttributes(table) {
  for (const element of Array.from(table.querySelectorAll("td, th"))) {
    const background = element.getAttribute("bgcolor");
    if (background && !element.style.backgroundColor) {
      element.style.backgroundColor = background;
    }
  }
}
function parseCssRules(css) {
  const rules = [];
  const cleanedCss = css.replace(/<!--|-->/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  const rulePattern = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = rulePattern.exec(cleanedCss)) !== null) {
    const selectors = match[1].split(",").map((selector) => selector.trim()).filter(Boolean);
    if (selectors.length > 0) {
      rules.push({ selectors, declarations: match[2] });
    }
  }
  return rules;
}
function getCssProperty(declarations, propertyName) {
  const style = document.createElement("div").style;
  style.cssText = declarations;
  const value = style.getPropertyValue(propertyName).trim();
  return value || null;
}
function extractBackgroundColor(background) {
  if (!background) {
    return null;
  }
  const tempStyle = document.createElement("div").style;
  tempStyle.background = background;
  const color = tempStyle.backgroundColor.trim();
  return color && color !== "rgba(0, 0, 0, 0)" ? color : null;
}
function extractRawCssBackgroundColor(declarations) {
  const match = declarations.match(/(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/i);
  if (!match) {
    return null;
  }
  const colorMatch = match[1].match(/#[0-9a-f]{3,8}\b|rgba?\([^)]+\)|hsla?\([^)]+\)|\b[a-z]+\b/i);
  return colorMatch?.[0] ?? null;
}
function sanitizeTable(table) {
  const allowedTags = /* @__PURE__ */ new Set([
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
    "A"
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
function isAllowedAttribute(element, attributeName) {
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
