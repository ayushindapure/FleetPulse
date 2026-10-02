const fs = require("fs");
const {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun
} = require("docx");

const markdown = fs.readFileSync("project_status.md", "utf8");
const lines = markdown.split(/\r?\n/);
const children = [];
let index = 0;
let inCodeBlock = false;
let codeLines = [];

function cleanInline(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1");
}

function addParagraph(text, options = {}) {
  if (!text.trim()) {
    children.push(new Paragraph({ spacing: { after: 100 } }));
    return;
  }

  children.push(new Paragraph({
    alignment: options.alignment,
    heading: options.heading,
    indent: options.indent,
    spacing: { after: options.heading ? 160 : 100, line: 276 },
    children: [new TextRun({
      text: cleanInline(text),
      bold: options.bold,
      italics: options.italics,
      font: options.code ? "Courier New" : "Aptos",
      size: options.code ? 18 : 21
    })]
  }));
}

function addCodeBlock(code) {
  children.push(new Paragraph({
    shading: { fill: "F2F2F2" },
    indent: { left: 240, right: 240 },
    spacing: { before: 80, after: 120 },
    children: [new TextRun({
      text: code.join("\n"),
      font: "Courier New",
      size: 18
    })]
  }));
}

function splitTableRow(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cleanInline(cell.trim()));
}

function addTable(tableLines) {
  const rows = tableLines.filter((line) => !/^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/.test(line));
  const tableRows = rows.map((line, rowIndex) => new TableRow({
    children: splitTableRow(line).map((cell) => new TableCell({
      shading: rowIndex === 0 ? { fill: "D9EAF7" } : undefined,
      children: [new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun({
          text: cell,
          bold: rowIndex === 0,
          font: "Aptos",
          size: 18
        })]
      })]
    }))
  }));

  children.push(new Table({
    rows: tableRows,
    width: { size: 100, type: "pct" },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "A6A6A6" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "A6A6A6" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "A6A6A6" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "A6A6A6" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "D9D9D9" },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: "D9D9D9" }
    }
  }));
  children.push(new Paragraph({ spacing: { after: 120 } }));
}

while (index < lines.length) {
  const line = lines[index];

  if (line.trim() === "```" || line.trim().startsWith("```")) {
    if (inCodeBlock) {
      addCodeBlock(codeLines);
      codeLines = [];
      inCodeBlock = false;
    } else {
      inCodeBlock = true;
    }
    index += 1;
    continue;
  }

  if (inCodeBlock) {
    codeLines.push(line);
    index += 1;
    continue;
  }

  if (/^\|/.test(line) && index + 1 < lines.length && /^\|?\s*:?-+:?/.test(lines[index + 1])) {
    const tableLines = [line];
    index += 1;
    while (index < lines.length && /^\|/.test(lines[index])) {
      tableLines.push(lines[index]);
      index += 1;
    }
    addTable(tableLines);
    continue;
  }

  const heading = line.match(/^(#{1,6})\s+(.*)$/);
  if (heading) {
    const level = heading[1].length;
    addParagraph(heading[2], {
      heading: level === 1 ? HeadingLevel.TITLE : level === 2 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
      bold: true
    });
    index += 1;
    continue;
  }

  if (/^---+$/.test(line.trim())) {
    index += 1;
    continue;
  }

  const bullet = line.match(/^\s*[-*]\s+(.*)$/);
  if (bullet) {
    addParagraph(`• ${bullet[1]}`, { indent: { left: 360, hanging: 180 } });
    index += 1;
    continue;
  }

  const numbered = line.match(/^\s*(\d+)\.\s+(.*)$/);
  if (numbered) {
    addParagraph(`${numbered[1]}. ${numbered[2]}`, { indent: { left: 360, hanging: 180 } });
    index += 1;
    continue;
  }

  if (/^\*\*.*\*\*$/.test(line.trim())) {
    addParagraph(line, { bold: true });
  } else {
    addParagraph(line);
  }
  index += 1;
}

const document = new Document({
  styles: {
    default: {
      document: { run: { font: "Aptos", size: 21 } }
    }
  },
  sections: [{
    properties: {
      page: {
        margin: { top: 900, right: 900, bottom: 900, left: 900 }
      }
    },
    children
  }]
});

Packer.toBuffer(document).then((buffer) => {
  fs.writeFileSync("project_status.docx", buffer);
  console.log("Created project_status.docx");
});
