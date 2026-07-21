/**
 * Markdown <-> HTML 转换工具
 * TipTap 内部用 HTML 表示内容，但数据库存储的是 Markdown 字符串
 * 原始内容里的 [tag:name] 和 [due:date] 是文本内嵌标记，需原样保留
 */
import { marked } from "marked";
import TurndownService from "turndown";

// 配置 marked：关闭 mangle、headerIds，避免破坏 [tag:xxx] 这种自定义标记
marked.setOptions({
  gfm: true,
  breaks: false,
});

const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
  emDelimiter: "*",
});

// 自定义规则：图片转 Markdown 图片语法
turndownService.addRule("images", {
  filter: "img",
  replacement: (_content, node) => {
    const alt = node.getAttribute("alt") || "";
    const src = node.getAttribute("src") || "";
    const title = node.getAttribute("title");
    return title ? `![${alt}](${src} "${title}")` : `![${alt}](${src})`;
  },
});

/**
 * Markdown 字符串转 HTML（用于初始化 TipTap 编辑器）
 * 注意：[tag:xxx] 和 [due:xxx] 是纯文本，marked 会原样保留
 */
export function markdownToHtml(markdown) {
  if (!markdown) return "";
  try {
    return marked.parse(markdown);
  } catch (err) {
    console.error("markdownToHtml failed:", err);
    return markdown;
  }
}

/**
 * HTML 转 Markdown 字符串（用于保存到数据库）
 */
export function htmlToMarkdown(html) {
  if (!html) return "";
  try {
    return turndownService.turndown(html).trim();
  } catch (err) {
    console.error("htmlToMarkdown failed:", err);
    return html;
  }
}
