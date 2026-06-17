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
        if (!html || !html.includes("<table")) {
          new import_obsidian.Notice("Clipboard does not contain HTML table text.");
          return;
        }
        if (this.insertHtmlTable(html)) {
          new import_obsidian.Notice("Inserted HTML table.");
        } else {
          new import_obsidian.Notice("No HTML table found in clipboard.");
        }
      }
    });
    this.registerDomEvent(document, "paste", (event) => {
      if (!event.clipboardData) {
        return;
      }
      const html = event.clipboardData.getData("text/html");
      if (!html || !html.includes("<table")) {
        return;
      }
      if (!this.hasActiveMarkdownEditor()) {
        return;
      }
      const inserted = this.insertHtmlTable(html);
      if (!inserted) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      new import_obsidian.Notice("Pasted HTML table.");
    }, { capture: true });
  }
  hasActiveMarkdownEditor() {
    return this.app.workspace.getActiveViewOfType(import_obsidian.MarkdownView) !== null;
  }
  insertHtmlTable(html) {
    const view = this.app.workspace.getActiveViewOfType(import_obsidian.MarkdownView);
    if (!view) {
      return false;
    }
    const tableHtml = extractAndCleanFirstTable(html);
    if (!tableHtml) {
      return false;
    }
    view.editor.replaceSelection(`${tableHtml}
`);
    return true;
  }
};
async function readClipboardHtml() {
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
      const color = backgroundColor || extractBackgroundColor(background);
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
