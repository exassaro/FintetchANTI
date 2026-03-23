/**
 * Build Report Script
 * Converts the Markdown project report to a self-contained, printable HTML document.
 * Uses the 'marked' npm package for Markdown parsing and Mermaid CDN for diagram rendering.
 *
 * Usage: node scripts/build_report.js
 */

import { marked } from 'marked';
import fs from 'fs';
import path from 'path';

const INPUT = path.resolve('C:/Users/USER/.gemini/antigravity/brain/004794f1-13af-47e8-b9f9-075273c76cea/FintechAnti_Project_Report.md');
const OUTPUT = path.resolve('C:/Users/USER/Documents/Capstone_project/FintechAnti/FintechAnti_Project_Report.html');

const md = fs.readFileSync(INPUT, 'utf-8');

// Custom renderer to handle mermaid code blocks
const renderer = new marked.Renderer();
const origCode = renderer.code;

renderer.code = function({ text, lang }) {
  if (lang === 'mermaid') {
    return `<pre class="mermaid">${text}</pre>`;
  }
  return `<pre><code class="language-${lang || ''}">${text}</code></pre>`;
};

marked.setOptions({ renderer, gfm: true, breaks: false });

// Convert GitHub-style alerts
let processedMd = md
  .replace(/> \[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\n> (.*?)(?=\n(?!>))/gs, (_, type, content) => {
    const cleanContent = content.replace(/^> /gm, '');
    return `<div class="alert alert-${type.toLowerCase()}"><strong>${type}:</strong> ${cleanContent}</div>`;
  });

const body = marked.parse(processedMd);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>FintechAnti — Project Report</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400&display=swap');

  :root {
    --bg: #0f1117;
    --surface: #1a1d27;
    --surface2: #232733;
    --border: #2e3345;
    --text: #e4e6ef;
    --text-secondary: #9da3b7;
    --accent: #6366f1;
    --accent-light: #818cf8;
    --success: #34d399;
    --warn: #fbbf24;
    --danger: #f87171;
    --info: #60a5fa;
  }

  @media print {
    :root {
      --bg: #fff;
      --surface: #f8f9fc;
      --surface2: #f0f1f5;
      --border: #d1d5e0;
      --text: #1a1d27;
      --text-secondary: #4a5068;
    }
    body { font-size: 11pt; }
    h1 { page-break-before: avoid; }
    h2 { page-break-before: always; }
    h2:first-of-type { page-break-before: avoid; }
    pre, table, .mermaid, .alert { page-break-inside: avoid; }
    .no-print { display: none !important; }
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.7;
    max-width: 960px;
    margin: 0 auto;
    padding: 3rem 2rem;
  }

  h1 {
    font-size: 2.2rem;
    font-weight: 700;
    background: linear-gradient(135deg, var(--accent-light), var(--success));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 0.5rem;
    letter-spacing: -0.03em;
  }

  h2 {
    font-size: 1.6rem;
    font-weight: 600;
    color: var(--accent-light);
    margin-top: 3rem;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid var(--border);
  }

  h3 {
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--text);
    margin-top: 2rem;
    margin-bottom: 0.75rem;
  }

  h4 { font-size: 1.05rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.5rem; }

  p { margin-bottom: 1rem; color: var(--text-secondary); }

  a { color: var(--accent-light); text-decoration: none; }
  a:hover { text-decoration: underline; }

  blockquote {
    border-left: 4px solid var(--accent);
    padding: 1rem 1.25rem;
    margin: 1.5rem 0;
    background: var(--surface);
    border-radius: 0 8px 8px 0;
    color: var(--text-secondary);
  }
  blockquote strong { color: var(--text); }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 1.25rem 0;
    font-size: 0.9rem;
    background: var(--surface);
    border-radius: 8px;
    overflow: hidden;
  }

  thead { background: var(--surface2); }
  th { font-weight: 600; text-align: left; padding: 0.75rem 1rem; color: var(--text); border-bottom: 2px solid var(--border); }
  td { padding: 0.65rem 1rem; border-bottom: 1px solid var(--border); color: var(--text-secondary); }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: rgba(99,102,241,0.05); }

  pre {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1.25rem;
    overflow-x: auto;
    margin: 1.25rem 0;
    font-family: 'Fira Code', monospace;
    font-size: 0.85rem;
    line-height: 1.6;
  }

  code {
    font-family: 'Fira Code', monospace;
    font-size: 0.85em;
    background: var(--surface);
    padding: 0.15em 0.4em;
    border-radius: 4px;
  }

  pre code { background: none; padding: 0; }

  ul, ol { margin: 0.75rem 0 0.75rem 1.5rem; color: var(--text-secondary); }
  li { margin-bottom: 0.35rem; }

  hr {
    border: none;
    height: 1px;
    background: var(--border);
    margin: 2.5rem 0;
  }

  .alert {
    padding: 1rem 1.25rem;
    border-radius: 8px;
    margin: 1.5rem 0;
    font-size: 0.92rem;
    border-left: 4px solid;
  }
  .alert-important { background: rgba(99,102,241,0.1); border-color: var(--accent); }
  .alert-tip { background: rgba(52,211,153,0.1); border-color: var(--success); }
  .alert-note { background: rgba(96,165,250,0.1); border-color: var(--info); }
  .alert-warning { background: rgba(251,191,36,0.1); border-color: var(--warn); }
  .alert-caution { background: rgba(248,113,113,0.1); border-color: var(--danger); }

  .mermaid {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1.5rem;
    margin: 1.5rem 0;
    text-align: center;
    font-family: 'Inter', sans-serif;
  }

  .print-btn {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    background: var(--accent);
    color: #fff;
    border: none;
    padding: 0.85rem 1.75rem;
    border-radius: 50px;
    font-family: 'Inter', sans-serif;
    font-weight: 600;
    font-size: 0.95rem;
    cursor: pointer;
    box-shadow: 0 4px 20px rgba(99,102,241,0.4);
    transition: transform 0.2s, box-shadow 0.2s;
    z-index: 999;
  }
  .print-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(99,102,241,0.5); }
</style>
</head>
<body>

${body}

<button class="print-btn no-print" onclick="window.print()">📄 Save as PDF</button>

<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
  mermaid.initialize({
    startOnLoad: true,
    theme: 'dark',
    themeVariables: {
      primaryColor: '#6366f1',
      primaryTextColor: '#e4e6ef',
      primaryBorderColor: '#818cf8',
      lineColor: '#818cf8',
      secondaryColor: '#232733',
      tertiaryColor: '#1a1d27',
      fontFamily: 'Inter, sans-serif',
    }
  });
</script>
</body>
</html>`;

fs.writeFileSync(OUTPUT, html, 'utf-8');
console.log(`✅ Report generated → ${OUTPUT}`);
