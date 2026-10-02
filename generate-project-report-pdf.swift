import AppKit
import CoreGraphics
import CoreText
import Foundation

let inputURL = URL(fileURLWithPath: "project_report.md")
let outputURL = URL(fileURLWithPath: "project_report.pdf")
let source = try String(contentsOf: inputURL, encoding: .utf8)
let reportText = NSMutableAttributedString()
let appendixText = NSMutableAttributedString()
var writingAppendix = false
var inCodeBlock = false

func color(_ red: CGFloat, _ green: CGFloat, _ blue: CGFloat) -> CGColor {
    CGColor(colorSpace: CGColorSpaceCreateDeviceRGB(), components: [red, green, blue, 1])!
}

func append(_ rawText: String, to destination: NSMutableAttributedString, size: CGFloat,
            fontName: String = "Avenir Next", textColor: CGColor = color(0.13, 0.17, 0.18),
            bold: Bool = false) {
    let cleaned = rawText
        .replacingOccurrences(of: #"\*\*(.*?)\*\*"#, with: "$1", options: .regularExpression)
        .replacingOccurrences(of: #"`([^`]+)`"#, with: "$1", options: .regularExpression)
    let font = CTFontCreateWithName("\(fontName)\(bold ? " Demi Bold" : "")" as CFString, size, nil)
    let attributes: [NSAttributedString.Key: Any] = [
        NSAttributedString.Key(kCTFontAttributeName as String): font,
        NSAttributedString.Key(kCTForegroundColorAttributeName as String): textColor
    ]
    destination.append(NSAttributedString(string: cleaned, attributes: attributes))
}

for line in source.components(separatedBy: .newlines) {
    if line.hasPrefix("```") {
        inCodeBlock.toggle()
        append("\n", to: writingAppendix ? appendixText : reportText, size: 3)
        continue
    }

    let destination = writingAppendix ? appendixText : reportText
    if inCodeBlock {
        append(line.isEmpty ? " " : line, to: destination, size: 7.1, fontName: "Menlo", textColor: color(0.16, 0.22, 0.23))
        append("\n", to: destination, size: 7.1, fontName: "Menlo")
    } else if line.hasPrefix("# ") {
        let titleColor = color(0.09, 0.29, 0.29)
        append(String(line.dropFirst(2)), to: destination, size: writingAppendix ? 15 : 23, textColor: titleColor, bold: true)
        append("\n\n", to: destination, size: 6)
    } else if line.hasPrefix("## ") {
        let heading = String(line.dropFirst(3))
        if heading.hasPrefix("Appendix ") {
            writingAppendix = true
        }
        let target = writingAppendix ? appendixText : reportText
        append(heading, to: target, size: writingAppendix ? 13 : 14, textColor: color(0.12, 0.37, 0.35), bold: true)
        append("\n", to: target, size: 3)
    } else if line.hasPrefix("### ") {
        append(String(line.dropFirst(4)), to: destination, size: 11, textColor: color(0.12, 0.37, 0.35), bold: true)
        append("\n", to: destination, size: 2)
    } else if line.hasPrefix("- ") {
        append("  •  \(String(line.dropFirst(2)))", to: destination, size: 9.2)
        append("\n", to: destination, size: 2)
    } else if line.hasPrefix("**") && line.hasSuffix("**") {
        append(line, to: destination, size: 9, textColor: color(0.24, 0.35, 0.34), bold: true)
        append("\n", to: destination, size: 3)
    } else if line.isEmpty {
        append("\n", to: destination, size: 4)
    } else {
        append(line, to: destination, size: 9.2)
        append("\n", to: destination, size: 2)
    }
}

guard let consumer = CGDataConsumer(url: outputURL as CFURL) else {
    fatalError("Could not create PDF output at \(outputURL.path)")
}
var mediaBox = CGRect(x: 0, y: 0, width: 612, height: 792)
guard let context = CGContext(consumer: consumer, mediaBox: &mediaBox, nil) else {
    fatalError("Could not initialize PDF context")
}

context.beginPDFPage([kCGPDFContextMediaBox as String: NSData(bytes: &mediaBox, length: MemoryLayout<CGRect>.size)] as CFDictionary)
let bodyRect = CGRect(x: 54, y: 54, width: 504, height: 684)
var pageNumber = 1

func drawPageNumber(_ number: Int) {
    let font = CTFontCreateWithName("Avenir Next" as CFString, 8, nil)
    let attributes: [NSAttributedString.Key: Any] = [
        NSAttributedString.Key(kCTFontAttributeName as String): font,
        NSAttributedString.Key(kCTForegroundColorAttributeName as String): color(0.4, 0.47, 0.47)
    ]
    let line = CTLineCreateWithAttributedString(NSAttributedString(string: "FleetPulse  |  Final Project Report  |  \(number)", attributes: attributes))
    context.textPosition = CGPoint(x: 54, y: 32)
    CTLineDraw(line, context)
}

func draw(_ text: NSAttributedString, startOnNewPage: Bool) {
    if startOnNewPage {
        drawPageNumber(pageNumber)
        context.endPDFPage()
        pageNumber += 1
        context.beginPDFPage([kCGPDFContextMediaBox as String: NSData(bytes: &mediaBox, length: MemoryLayout<CGRect>.size)] as CFDictionary)
    }

    let framesetter = CTFramesetterCreateWithAttributedString(text)
    var location = 0
    while location < text.length {
        let path = CGPath(rect: bodyRect, transform: nil)
        let frame = CTFramesetterCreateFrame(framesetter, CFRange(location: location, length: 0), path, nil)
        CTFrameDraw(frame, context)
        let visibleRange = CTFrameGetVisibleStringRange(frame)
        if visibleRange.length == 0 {
            break
        }
        location += visibleRange.length
        if location < text.length {
            drawPageNumber(pageNumber)
            context.endPDFPage()
            pageNumber += 1
            context.beginPDFPage([kCGPDFContextMediaBox as String: NSData(bytes: &mediaBox, length: MemoryLayout<CGRect>.size)] as CFDictionary)
        }
    }
}

draw(reportText, startOnNewPage: false)
if appendixText.length > 0 {
    draw(appendixText, startOnNewPage: true)
}
drawPageNumber(pageNumber)
context.endPDFPage()
context.closePDF()
print("Created \(outputURL.lastPathComponent) (\(pageNumber) pages)")