const fs = require("fs");
const {
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

const markdown = fs.readFileSync("project_report.md", "utf8");
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
    children.push(new Paragraph({ spacing: { after: 80 } }));
    return;
  }

  children.push(new Paragraph({
    heading: options.heading,
    indent: options.indent,
    spacing: { after: options.heading ? 120 : 80, line: 260 },
    children: [new TextRun({
      text: cleanInline(text),
      bold: options.bold,
      color: options.color,
      font: options.code ? "Courier New" : "Aptos",
      size: options.code ? 16 : 19
    })]
  }));
}

function addCodeBlock(code) {
  for (const line of code) {
    children.push(new Paragraph({
      shading: { fill: "F1F4F5" },
      indent: { left: 180, right: 120 },
      spacing: { after: 0, line: 220 },
      children: [new TextRun({
        text: line || " ",
        font: "Menlo",
        size: 14,
        color: "263238"
      })]
    }));
  }
  children.push(new Paragraph({ spacing: { after: 90 } }));
}

function splitTableRow(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "")
    .split("|").map((cell) => cleanInline(cell.trim()));
}

function addTable(tableLines) {
  const rows = tableLines.filter((line) => !/^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/.test(line));
  const tableRows = rows.map((line, rowIndex) => new TableRow({
    children: splitTableRow(line).map((cell) => new TableCell({
      shading: rowIndex === 0 ? { fill: "DCE9E8" } : undefined,
      margins: { top: 70, bottom: 70, left: 90, right: 90 },
      children: [new Paragraph({
        spacing: { after: 20 },
        children: [new TextRun({
          text: cell,
          bold: rowIndex === 0,
          font: "Aptos",
          size: 16
        })]
      })]
    }))
  }));

  children.push(new Table({
    rows: tableRows,
    width: { size: 100, type: "pct" },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "9BAEAC" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "9BAEAC" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "9BAEAC" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "9BAEAC" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "D6DEDD" },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: "D6DEDD" }
    }
  }));
  children.push(new Paragraph({ spacing: { after: 100 } }));
}

while (index < lines.length) {
  const line = lines[index];

  if (line.trim().startsWith("```")) {
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

  const heading = line.match(/^(#{1,6})\s+(.*)$/);
  if (heading) {
    const level = heading[1].length;
    addParagraph(heading[2], {
      heading: level === 1 ? HeadingLevel.TITLE : level === 2 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
      bold: true,
      color: level < 3 ? "174A4A" : "276B65"
    });
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

  if (/^\*\*.*\*\*$/.test(line.trim())) {
    addParagraph(line, { bold: true, color: "405B58" });
    index += 1;
    continue;
  }

  const bullet = line.match(/^\s*[-*]\s+(.*)$/);
  if (bullet) {
    addParagraph(`• ${bullet[1]}`, { indent: { left: 300, hanging: 160 } });
    index += 1;
    continue;
  }

  addParagraph(line);
  index += 1;
}

const document = new Document({
  creator: "Driverless Taxi System Project",
  title: "FleetPulse: Scalable IoT Fleet Management for Driverless Taxis",
  subject: "Final project report",
  styles: {
    default: {
      document: { run: { font: "Aptos", size: 19 } }
    }
  },
  sections: [{
    properties: {
      page: {
        margin: { top: 760, right: 780, bottom: 760, left: 780 }
      }
    },
    children
  }]
});

Packer.toBuffer(document).then((buffer) => {
  fs.writeFileSync("project_report.docx", buffer);
  console.log("Created project_report.docx");
}).catch((error) => {
  console.error("Failed to create project_report.docx:", error);
  process.exitCode = 1;
});