"use client";

import { useMemo } from "react";
import katex from "katex";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderRichContent(content: string): string {
  const placeholders: string[] = [];
  let text = content;

  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => {
    const idx = placeholders.length;
    try {
      placeholders.push(
        katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false })
      );
    } catch {
      placeholders.push(`<pre>${escapeHtml(tex.trim())}</pre>`);
    }
    return `%%MATH_${idx}%%`;
  });

  text = text.replace(/\$([^$\n]+?)\$/g, (_, tex) => {
    const idx = placeholders.length;
    try {
      placeholders.push(
        katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false })
      );
    } catch {
      placeholders.push(`<code>${escapeHtml(tex.trim())}</code>`);
    }
    return `%%MATH_${idx}%%`;
  });

  let html = escapeHtml(text);
  html = html.replace(/\n/g, "<br/>");
  html = html.replace(/%%MATH_(\d+)%%/g, (_, i) => placeholders[Number(i)]);

  return html;
}

export function RichContent({ content }: { content: string }) {
  const html = useMemo(() => renderRichContent(content), [content]);

  return (
    <div
      className="rich-content text-sm leading-relaxed text-neutral-700 [&_.katex-display]:my-3 [&_.katex-display]:overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
