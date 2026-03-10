/**
 * Convert a DOM element tree to a Markdown string.
 *
 * Runs in the ISOLATED-world content script — no `window` attachment needed.
 * Skips hidden elements (display:none / visibility:hidden) and data-URI images.
 */
export function htmlToMarkdown(element: Element): string {
  function traverse(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent ?? "";
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return "";

    const el = node as HTMLElement;
    const tagName = el.tagName.toLowerCase();

    // Skip hidden elements
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return "";

    // Recurse children
    let content = "";
    for (const child of Array.from(el.childNodes)) {
      content += traverse(child);
    }

    switch (tagName) {
      case "h1":
        return `\n# ${content}\n`;
      case "h2":
        return `\n## ${content}\n`;
      case "h3":
        return `\n### ${content}\n`;
      case "h4":
        return `\n#### ${content}\n`;
      case "h5":
        return `\n##### ${content}\n`;
      case "h6":
        return `\n###### ${content}\n`;
      case "p":
      case "div":
        return content.trim() ? `\n\n${content}\n` : "";
      case "a":
        return `[${content}](${(el as HTMLAnchorElement).href})`;
      case "img": {
        const img = el as HTMLImageElement;
        if (img.src?.startsWith("data:")) return "";
        return `![${img.alt || "image"}](${img.src})`;
      }
      case "ul":
      case "ol":
        return `\n${content}\n`;
      case "li":
        return `\n- ${content}`;
      case "table":
        return `\n${content}\n`;
      case "tr":
        return `\n| ${content} |`;
      case "td":
      case "th":
        return ` ${content} |`;
      case "b":
      case "strong":
        return `**${content}**`;
      case "i":
      case "em":
        return `*${content}*`;
      case "br":
        return "\n";
      case "code":
        return `\`${content}\``;
      case "pre":
        return `\n\`\`\`\n${content}\n\`\`\`\n`;
      default:
        return content;
    }
  }

  const md = traverse(element);

  // Collapse excessive newlines
  return md.replace(/\n{3,}/g, "\n\n").trim();
}
