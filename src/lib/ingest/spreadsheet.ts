/**
 * Excel / CSV İşleme — ExcelJS
 *
 * Faz 6.5: xlsx → exceljs geçişi (CVE-free, actively maintained).
 *
 * Output: markdown tablosu (AI'a gönderilmek için ideal).
 */

import ExcelJS from "exceljs";

interface SheetResult {
  text: string;
  sheetCount: number;
  totalRows: number;
  warnings: string[];
}

/** ExcelJS Cell value'sini güvenli string'e çevir */
function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString().split("T")[0];

  // Rich text object
  if (typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((r) => r.text).join("");
    }
    if ("text" in value) return String(value.text);
    if ("result" in value) return String(value.result); // formula sonucu
    if ("hyperlink" in value && "text" in value) return String(value.text);
  }

  return String(value);
}

export async function extractSpreadsheet(
  buffer: Buffer,
  fileName: string
): Promise<SheetResult> {
  try {
    const workbook = new ExcelJS.Workbook();
    // .xlsx için
    if (fileName.toLowerCase().endsWith(".csv")) {
      // CSV: streaming reader
      const text = buffer.toString("utf-8");
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length === 0) {
        return {
          text: `[Boş CSV: ${fileName}]`,
          sheetCount: 0,
          totalRows: 0,
          warnings: [],
        };
      }
      const headers = lines[0].split(",").map((h) => h.trim());
      let out = `# ${fileName}\n\n**CSV — 1 sayfa, ${lines.length - 1} satır**\n\n`;
      out += "| " + headers.join(" | ") + " |\n";
      out += "| " + headers.map(() => "---").join(" | ") + " |\n";
      const dataLines = lines.slice(1, Math.min(101, lines.length));
      for (const line of dataLines) {
        out += "| " + line.split(",").map((c) => c.trim()).join(" | ") + " |\n";
      }
      return {
        text: out,
        sheetCount: 1,
        totalRows: lines.length - 1,
        warnings:
          lines.length > 101 ? [`${lines.length - 101} satır daha kesildi`] : [],
      };
    }

    await workbook.xlsx.load(new Uint8Array(buffer).buffer);

    const worksheets = workbook.worksheets;
    if (worksheets.length === 0) {
      return {
        text: `[Boş Excel dosyası: ${fileName}]`,
        sheetCount: 0,
        totalRows: 0,
        warnings: ["Çalışma sayfası bulunamadı"],
      };
    }

    let output = `# ${fileName}\n\n**${worksheets.length} sayfa**\n\n`;
    let totalRows = 0;

    for (const sheet of worksheets) {
      const sheetName = sheet.name;
      const rowCount = sheet.actualRowCount;

      if (rowCount === 0) {
        output += `## ${sheetName}\n*[Boş]*\n\n`;
        continue;
      }

      // İlk satır = header
      const headerRow = sheet.getRow(1);
      const headers: string[] = [];
      headerRow.eachCell({ includeEmpty: true }, (cell) => {
        headers.push(cellToString(cell.value) || "—");
      });

      // Boş başlık satırı kontrolü
      if (headers.length === 0 || headers.every((h) => h === "—")) {
        output += `## ${sheetName}\n*[Başlık satırı tespit edilemedi]*\n\n`;
        continue;
      }

      totalRows += rowCount;
      output += `## ${sheetName} (${rowCount - 1} satır)\n\n`;
      output += "| " + headers.join(" | ") + " |\n";
      output += "| " + headers.map(() => "---").join(" | ") + " |\n";

      const limit = Math.min(rowCount, 101); // header + 100 satır
      for (let r = 2; r <= limit; r++) {
        const row = sheet.getRow(r);
        const cells: string[] = [];
        for (let c = 1; c <= headers.length; c++) {
          cells.push(cellToString(row.getCell(c).value));
        }
        output += "| " + cells.join(" | ") + " |\n";
      }

      if (rowCount > 101) {
        output += `\n*[${rowCount - 101} satır daha kesildi]*\n`;
      }
      output += "\n";
    }

    return {
      text: output.trim(),
      sheetCount: worksheets.length,
      totalRows,
      warnings:
        totalRows > 5000
          ? ["Çok büyük dosya — sadece ilk 100 satır/sayfa alındı"]
          : [],
    };
  } catch (err) {
    return {
      text: "",
      sheetCount: 0,
      totalRows: 0,
      warnings: [
        `Excel okuma hatası: ${err instanceof Error ? err.message : "bilinmeyen"}`,
      ],
    };
  }
}
