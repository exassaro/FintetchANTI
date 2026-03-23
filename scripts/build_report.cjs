/**
 * Build Report -- Corporate Theme
 * Converts MD source to self-contained HTML with Mermaid diagrams.
 * Theme: Cambria font, dark blue headings, light gray tables, A4 print.
 */
const fs = require('fs');
const INPUT = 'C:\\Users\\USER\\.gemini\\antigravity\\brain\\004794f1-13af-47e8-b9f9-075273c76cea\\FintechAnti_Project_Report.md';
const OUTPUT = 'C:\\Users\\USER\\Documents\\Capstone_project\\FintechAnti\\Auditron_Project_Report.html';
const md = fs.readFileSync(INPUT, 'utf-8');
function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

const codeBlocks = [];
let src = md.replace(/```(\w*)\r?\n([\s\S]*?)```/g, (_, lang, code) => {
  const i = codeBlocks.length; codeBlocks.push({ lang, code: code.trimEnd() }); return `\x00CB${i}\x00`;
});

src = src.replace(/((?:^\|.*\|\s*$\r?\n?){2,})/gm, (block) => {
  const lines = block.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2 || !/^\|[\s:|-]+\|$/.test(lines[1].trim())) return block;
  const parse = r => r.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
  const hdr = parse(lines[0]);
  let t = '<table><thead><tr>' + hdr.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>\n';
  for (let i = 2; i < lines.length; i++) { const cells = parse(lines[i]); t += '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>\n'; }
  return t + '</tbody></table>\n';
});

src = src.replace(/((?:^> .*$\r?\n?)+)/gm, b => `<blockquote>${b.replace(/^> ?/gm, '').trim()}</blockquote>\n`);
src = src.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
src = src.replace(/^### (.+)$/gm, '<h3>$1</h3>');
src = src.replace(/^## (.+)$/gm, '<h2>$1</h2>');
src = src.replace(/^# (.+)$/gm, '<h1>$1</h1>');
src = src.replace(/^-{3,}$/gm, '<hr/>');
src = src.replace(/((?:^- .+$\r?\n?)+)/gm, b => '<ul>' + b.trim().split(/\r?\n/).map(l => `<li>${l.replace(/^- /, '')}</li>`).join('\n') + '</ul>\n');
src = src.replace(/((?:^\d+\. .+$\r?\n?)+)/gm, b => '<ol>' + b.trim().split(/\r?\n/).map(l => `<li>${l.replace(/^\d+\. /, '')}</li>`).join('\n') + '</ol>\n');
src = src.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
src = src.replace(/\*(.+?)\*/g, '<em>$1</em>');
src = src.replace(/`([^`]+)`/g, '<code>$1</code>');
src = src.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

src = src.split(/\r?\n/).map(line => {
  const t = line.trim();
  if (!t || /^</.test(t) || /^\x00CB/.test(t)) return line;
  return `<p>${line}</p>`;
}).join('\n');

src = src.replace(/(?:<p>)?\x00CB(\d+)\x00(?:<\/p>)?/g, (_, idx) => {
  const b = codeBlocks[parseInt(idx)];
  if (b.lang === 'mermaid') return `<pre class="mermaid">${b.code}</pre>`;
  return `<pre><code class="language-${b.lang}">${esc(b.code)}</code></pre>`;
});

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Auditron -- Project Completion Report</title>
<style>
/* === CORPORATE DOCUMENTATION THEME === */
@page {
  size: A4;
  margin: 1in;
  @bottom-center { content: counter(page); font-family: Cambria, 'Times New Roman', serif; font-size: 10pt; color: #555; }
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: Cambria, 'Times New Roman', Georgia, serif;
  font-size: 11pt;
  line-height: 1.15;
  color: #000;
  background: #fff;
  max-width: 210mm;
  margin: 0 auto;
  padding: 1in;
  text-align: justify;
}

/* Headings */
h1 {
  font-size: 22pt;
  font-weight: bold;
  color: #1a3c6e;
  margin-bottom: 8pt;
  text-align: left;
  border-bottom: 2px solid #1a3c6e;
  padding-bottom: 6pt;
}

h2 {
  font-size: 16pt;
  font-weight: bold;
  color: #1a3c6e;
  margin-top: 24pt;
  margin-bottom: 10pt;
  padding-bottom: 4pt;
  border-bottom: 1px solid #ccc;
  text-align: left;
}

h3 {
  font-size: 14pt;
  font-weight: bold;
  color: #2a2a2a;
  margin-top: 18pt;
  margin-bottom: 6pt;
  text-align: left;
}

h4 {
  font-size: 12pt;
  font-weight: bold;
  color: #333;
  margin-top: 12pt;
  margin-bottom: 4pt;
  text-align: left;
}

/* Paragraphs */
p {
  margin-bottom: 6pt;
  color: #000;
  text-align: justify;
}

/* Links */
a { color: #1a3c6e; text-decoration: underline; }

/* Blockquotes */
blockquote {
  border-left: 3px solid #1a3c6e;
  padding: 8pt 12pt;
  margin: 10pt 0;
  background: #f7f8fa;
  font-style: italic;
  color: #333;
}

/* Tables */
table {
  width: 100%;
  border-collapse: collapse;
  margin: 10pt 0;
  font-size: 10.5pt;
  border: 1px solid #999;
}

thead { background: #e8eaed; }

th {
  font-weight: bold;
  text-align: left;
  padding: 6pt 8pt;
  color: #000;
  border: 1px solid #999;
  background: #e8eaed;
}

td {
  padding: 5pt 8pt;
  border: 1px solid #bbb;
  color: #222;
  text-align: left;
  vertical-align: top;
}

tr:nth-child(even) td { background: #f9f9fb; }

/* Lists */
ul, ol { margin: 6pt 0 6pt 24pt; color: #000; }
li { margin-bottom: 3pt; font-size: 11pt; text-align: justify; }

/* Horizontal rules */
hr { border: none; height: 1px; background: #ccc; margin: 18pt 0; }

/* Code */
code {
  font-family: 'Courier New', Courier, monospace;
  font-size: 10pt;
  background: #f0f0f0;
  padding: 1pt 4pt;
  border-radius: 2px;
  color: #333;
}

pre {
  background: #f5f5f5;
  border: 1px solid #ccc;
  border-radius: 3px;
  padding: 10pt;
  overflow-x: auto;
  margin: 10pt 0;
  font-family: 'Courier New', Courier, monospace;
  font-size: 9.5pt;
  line-height: 1.4;
}

pre code { background: none; padding: 0; }

strong { color: #000; }

/* Mermaid diagrams */
.mermaid {
  background: #fafafa;
  border: 1px solid #ccc;
  border-radius: 3px;
  padding: 12pt;
  margin: 12pt 0;
  text-align: center;
}
.mermaid svg {
  max-width: 100% !important;
  height: auto !important;
  max-height: 70vh !important;
}

/* Print optimizations */
@media print {
  body { padding: 0; max-width: none; }
  h2, h3, h4 { break-after: avoid; page-break-after: avoid; }
  p, li, td, th { orphans: 3; widows: 3; }
  table, pre, .mermaid { break-inside: avoid; page-break-inside: avoid; }
  .mermaid svg { max-height: 200mm !important; }
  hr { break-after: avoid; page-break-after: avoid; }
  .no-print { display: none !important; }
}

/* Save as PDF button */
.print-btn {
  position: fixed;
  bottom: 20pt;
  right: 20pt;
  background: #1a3c6e;
  color: #fff;
  border: none;
  padding: 8pt 18pt;
  border-radius: 3px;
  font-family: Cambria, serif;
  font-weight: bold;
  font-size: 11pt;
  cursor: pointer;
  z-index: 999;
}
.print-btn:hover { background: #15325c; }
</style>
</head>
<body>

${src}

<button class="print-btn no-print" onclick="window.print()" style="right: 20pt;">Save as PDF</button>
<button class="print-btn no-print" onclick="exportDocx()" style="right: 140pt; background: #2a5a2a;">Save as DOCX</button>

<script>
function exportDocx() {
  const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Auditron Project Report</title></head><body>";
  const footer = "</body></html>";
  
  const clone = document.body.cloneNode(true);
  const elementsToRemove = clone.querySelectorAll('.no-print, script');
  elementsToRemove.forEach(e => e.remove());
  
  const sourceHTML = header + clone.innerHTML + footer;
  const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
  
  const fileDownload = document.createElement("a");
  document.body.appendChild(fileDownload);
  fileDownload.href = source;
  fileDownload.download = 'Auditron_Project_Report.doc';
  fileDownload.click();
  document.body.removeChild(fileDownload);
}
</script>

<script type="module">
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
mermaid.initialize({
  startOnLoad: true,
  theme: 'neutral',
  flowchart: { curve: 'linear', nodeSpacing: 30, rankSpacing: 40 },
  themeVariables: {
    primaryColor: '#dce6f0',
    primaryTextColor: '#1a1a1a',
    primaryBorderColor: '#555',
    lineColor: '#555',
    secondaryColor: '#e8eaed',
    tertiaryColor: '#f0f0f0',
    fontFamily: 'Cambria, Times New Roman, serif',
    fontSize: '12px'
  }
});
</script>
</body>
</html>`;

fs.writeFileSync(OUTPUT, html, 'utf-8');
console.log('Report built:', OUTPUT);
