import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const ACCESS_CODE = process.env.ACCESS_CODE || "1462";
const MANUSCRIPT_PATH = resolve(
  process.cwd(),
  "Freiburg Klara Faller",
  "MANUSCRIPT.md",
);

function extractHeadings(markdown) {
  return markdown
    .split("\n")
    .map((line, index) => {
      const match = /^(#{1,3})\s+(.+)$/.exec(line.trim());
      if (!match) return null;
      return {
        level: match[1].length,
        title: match[2],
        line: index + 1,
        id: match[2]
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
      };
    })
    .filter(Boolean);
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (String(req.body?.code || "").trim() !== ACCESS_CODE) {
    res.status(401).json({ error: "Der Code ist nicht korrekt." });
    return;
  }

  try {
    const markdown = await readFile(MANUSCRIPT_PATH, "utf8");
    res.status(200).json({
      title: "Tod zwischen Kräutern",
      subtitle: "Arbeitsfassung Romanmanuskript",
      markdown,
      headings: extractHeadings(markdown),
    });
  } catch {
    res.status(500).json({
      error: "Das Manuskript konnte nicht geladen werden.",
    });
  }
}
