import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const workspaceDir = process.cwd();
const buildDir = path.join(workspaceDir, ".deck-build");
const outputDir = path.join(workspaceDir, "docs", "defense");
const skillDir = "C:\\Users\\User\\.codex\\plugins\\cache\\openai-primary-runtime\\presentations\\26.1015.12040\\skills\\presentations";
const runtimePython = "C:\\Users\\User\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";
const finalPptx = path.join(outputDir, "shopmate-ai-defense-2026.pptx");

const P = { w: 1280, h: 720 };
const C = {
  ink: "#15261F", paper: "#FBF7EE", cream: "#F1E7D4", green: "#2F6B4F",
  mint: "#B9D8BE", orange: "#D66B3D", gold: "#E7B64C", muted: "#66756D", white: "#FFFFFF",
};

function addText(slide, text, x, y, w, h, size = 20, color = C.ink, bold = false, align = "left") {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position: { left: x, top: y, width: w, height: h },
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  shape.text = text;
  shape.text.style = { fontFamily: "Aptos", fontSize: size, color, bold, align, breakLine: false };
  return shape;
}

function rect(slide, x, y, w, h, fill, radius = "rounded-md", line = fill) {
  return slide.shapes.add({
    geometry: "roundRect",
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: { style: "solid", fill: line, width: 1 },
    borderRadius: radius,
  });
}

function line(slide, x1, y1, x2, y2, color = C.green, width = 2) {
  return slide.shapes.add({
    geometry: "line",
    position: { left: Math.min(x1, x2), top: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1) },
    line: { style: "solid", fill: color, width },
  });
}

function header(slide, section, title, page) {
  addText(slide, section.toUpperCase(), 72, 50, 380, 25, 13, C.orange, true);
  addText(slide, title, 72, 86, 1040, 58, 37, C.ink, true);
  addText(slide, `SHOPMATE AI  /  ${String(page).padStart(2, "0")}`, 990, 54, 218, 22, 12, C.muted, true, "right");
  line(slide, 72, 157, 1208, 157, C.mint, 2);
}

function bullet(slide, text, x, y, w, accent = C.orange) {
  rect(slide, x, y + 9, 10, 10, accent, "rounded-full", accent);
  addText(slide, text, x + 24, y, w - 24, 44, 21, C.ink);
}

async function writeBlob(filePath, blob) {
  await fs.writeFile(filePath, new Uint8Array(await blob.arrayBuffer()));
}

async function main() {
  await fs.mkdir(buildDir, { recursive: true });
  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(path.join(workspaceDir, ".codex-finalizer"), { recursive: true });
  await fs.rm(finalPptx, { force: true });

  const presentation = Presentation.create({ slideSize: { width: P.w, height: P.h } });

  // 1. Cover
  {
    const s = presentation.slides.add(); s.background.fill = C.paper;
    rect(s, 72, 74, 17, 536, C.orange, "rounded-full", C.orange);
    addText(s, "SHOPMATE AI", 122, 92, 320, 28, 15, C.orange, true);
    addText(s, "Mobile e-commerce\nwith a safe AI assistant", 122, 166, 790, 160, 52, C.ink, true);
    addText(s, "Fil Rouge — Mobile Augmented AI", 126, 360, 510, 36, 25, C.green, true);
    addText(s, "Omar Fahid  |  Defense preparation  |  24 October 2026", 126, 413, 650, 28, 18, C.muted);
    rect(s, 905, 130, 235, 390, C.green, "rounded-2xl", C.green);
    addText(s, "Customer\nchat", 938, 180, 168, 78, 28, C.white, true);
    line(s, 937, 278, 1107, 278, C.mint, 2);
    addText(s, "Live stock\nand price", 938, 307, 175, 76, 28, C.cream, true);
    line(s, 937, 402, 1107, 402, C.mint, 2);
    addText(s, "COD order\nwith confirmation", 938, 431, 175, 80, 24, C.white, true);
  }

  // 2. Problem
  {
    const s = presentation.slides.add(); s.background.fill = C.paper; header(s, "Problem", "The store needs fast answers without losing control", 2);
    addText(s, "A COD store handles repetitive questions and sensitive actions every day.", 72, 192, 1060, 38, 23, C.muted);
    rect(s, 72, 274, 340, 230, C.cream, "rounded-2xl", C.cream);
    addText(s, "Customers", 102, 302, 200, 30, 25, C.green, true);
    addText(s, "Ask about products, delivery, returns and their orders.", 102, 354, 255, 95, 23, C.ink);
    rect(s, 470, 274, 340, 230, C.mint, "rounded-2xl", C.mint);
    addText(s, "Store manager", 500, 302, 240, 30, 25, C.green, true);
    addText(s, "Updates catalogue data and needs a trace of agent activity.", 500, 354, 258, 95, 23, C.ink);
    rect(s, 868, 274, 340, 230, "#F5D4C6", "rounded-2xl", "#F5D4C6");
    addText(s, "Risk", 898, 302, 200, 30, 25, C.orange, true);
    addText(s, "An AI must not invent prices, create orders by mistake or expose another store.", 898, 354, 265, 112, 23, C.ink);
  }

  // 3. Solution
  {
    const s = presentation.slides.add(); s.background.fill = C.paper; header(s, "Solution", "One application for customers and store managers", 3);
    addText(s, "The mobile app connects each request to a controlled backend. The backend decides which source can answer it.", 72, 190, 1060, 60, 23, C.muted);
    rect(s, 92, 305, 280, 190, C.green, "rounded-2xl", C.green);
    addText(s, "Customer app", 125, 334, 210, 32, 27, C.white, true);
    addText(s, "Catalogue\nChat in French or darija\nCOD orders", 125, 386, 200, 87, 21, C.cream);
    rect(s, 500, 305, 280, 190, C.ink, "rounded-2xl", C.ink);
    addText(s, "Express API", 533, 334, 210, 32, 27, C.white, true);
    addText(s, "JWT and roles\nAgent guardrails\nAudit logs", 533, 386, 190, 87, 21, C.cream);
    rect(s, 908, 305, 280, 190, C.orange, "rounded-2xl", C.orange);
    addText(s, "Manager tools", 941, 334, 220, 32, 27, C.white, true);
    addText(s, "Catalogue\nDocuments\nAudit review", 941, 386, 185, 87, 21, C.white);
    line(s, 372, 400, 500, 400, C.gold, 4); line(s, 780, 400, 908, 400, C.gold, 4);
  }

  // 4. Architecture
  {
    const s = presentation.slides.add(); s.background.fill = C.paper; header(s, "Architecture", "A controlled path from a message to verified data", 4);
    const nodes = [
      ["Expo mobile", 80, 260, C.green, C.white], ["Express API", 330, 260, C.ink, C.white],
      ["PostgreSQL\n+ pgvector", 580, 230, C.orange, C.white], ["LLM provider", 580, 365, C.gold, C.ink],
      ["MCP shipment\nserver", 860, 230, C.mint, C.ink], ["n8n webhook\noptional", 860, 365, C.cream, C.ink],
    ];
    for (const [t, x, y, fill, color] of nodes) { rect(s, x, y, 190, 94, fill, "rounded-2xl", fill); addText(s, t, x + 18, y + 24, 154, 52, 22, color, true, "center"); }
    line(s, 270, 307, 330, 307, C.green, 3); line(s, 520, 285, 580, 277, C.green, 3); line(s, 520, 330, 580, 410, C.green, 3); line(s, 770, 277, 860, 277, C.green, 3); line(s, 770, 410, 860, 410, C.green, 3);
    addText(s, "JWT provides user and store context. The server ignores any storeId sent by the client.", 112, 564, 1020, 42, 22, C.muted, true, "center");
  }

  // 5. RAG vs tools
  {
    const s = presentation.slides.add(); s.background.fill = C.paper; header(s, "Agent design", "RAG answers knowledge questions. Tools read or act on live data", 5);
    rect(s, 86, 225, 505, 310, C.cream, "rounded-2xl", C.cream);
    addText(s, "RAG: store knowledge", 122, 258, 330, 34, 28, C.green, true);
    bullet(s, "Searches uploaded delivery and return documents", 122, 322, 420, C.green);
    bullet(s, "Uses chunks filtered by storeId", 122, 386, 420, C.green);
    bullet(s, "Cites sources or says: « Je n'ai pas cette information »", 122, 450, 420, C.green);
    rect(s, 689, 225, 505, 310, "#F5D4C6", "rounded-2xl", "#F5D4C6");
    addText(s, "Function calling: live operations", 725, 258, 410, 34, 28, C.orange, true);
    bullet(s, "Reads current product, stock and price from PostgreSQL", 725, 322, 420, C.orange);
    bullet(s, "Creates or cancels an order only after confirmation", 725, 386, 420, C.orange);
    bullet(s, "Uses Zod validation and an eight-tool allowlist", 725, 450, 420, C.orange);
  }

  // 6. Guardrails
  {
    const s = presentation.slides.add(); s.background.fill = C.paper; header(s, "Guardrails", "The assistant can answer only within the store rules", 6);
    const items = [
      ["No hallucination", "Similarity threshold blocks unsupported RAG answers."],
      ["Prompt injection", "Documents and tool results stay data, never instructions."],
      ["Sensitive requests", "Discounts, refunds, medical, legal and off-topic requests are refused and can go to the manager."],
      ["Safe writes", "Orders require explicit confirmation and run inside a transaction."],
      ["Tenant isolation", "The JWT storeId scopes queries. Customers see only their own orders."],
    ];
    let y = 205;
    for (const [name, desc] of items) { rect(s, 84, y, 188, 56, C.green, "rounded-md", C.green); addText(s, name, 98, y + 15, 158, 25, 18, C.white, true, "center"); addText(s, desc, 306, y + 12, 830, 36, 20, C.ink); y += 72; }
  }

  // 7. Verification
  {
    const s = presentation.slides.add(); s.background.fill = C.paper; header(s, "Results", "Automated checks cover the critical backend paths", 7);
    addText(s, "Current local evidence", 72, 194, 340, 34, 25, C.green, true);
    const evidence = [
      ["Auth", "refresh rotation and logout"], ["Tenant isolation", "store and customer boundaries"], ["Orders", "stock consistency and explicit confirmation"],
      ["Agent", "Zod allowlist, guardrails and cost limits"], ["Automation", "n8n notification service"],
    ];
    let y = 256; for (const [a, b] of evidence) { rect(s, 72, y, 210, 44, C.mint, "rounded-md", C.mint); addText(s, a, 87, y + 10, 180, 22, 18, C.ink, true); addText(s, b, 316, y + 9, 440, 25, 20, C.ink); y += 57; }
    rect(s, 815, 236, 330, 230, C.ink, "rounded-2xl", C.ink);
    addText(s, "Run from backend", 850, 275, 260, 25, 20, C.cream, true, "center");
    addText(s, "npm test", 850, 328, 260, 38, 32, C.white, true, "center");
    addText(s, "CI also runs this command on GitHub Actions.", 849, 398, 262, 40, 18, C.mint, false, "center");
    addText(s, "The clean-clone, phone and public-deployment checks still need rehearsal evidence.", 78, 563, 1050, 31, 19, C.orange, true, "center");
  }

  // 8. Demo
  {
    const s = presentation.slides.add(); s.background.fill = C.paper; header(s, "Demo plan", "A 6–8 minute story with a working fallback", 8);
    const steps = [
      ["01", "Customer chat", "RAG answer with source, then live stock."],
      ["02", "COD order", "Show the confirmation before the write."],
      ["03", "Admin work", "Change catalogue, upload a document and inspect chunks."],
      ["04", "Audit", "Open the full trace: question, tools, sources, tokens and latency."],
    ];
    let x = 72; for (const [n, t, d] of steps) { addText(s, n, x, 220, 52, 36, 26, C.orange, true); addText(s, t, x, 278, 228, 32, 24, C.green, true); addText(s, d, x, 330, 228, 86, 19, C.ink); x += 285; }
    rect(s, 72, 500, 1136, 88, C.cream, "rounded-2xl", C.cream);
    addText(s, "Fallback: a recorded video shows the same journey if the network, phone, LLM or MCP server fails during the defense.", 112, 528, 1050, 34, 22, C.ink, true, "center");
  }

  // 9. Closing
  {
    const s = presentation.slides.add(); s.background.fill = C.green;
    addText(s, "ShopMate AI", 78, 74, 360, 32, 18, C.mint, true);
    addText(s, "A store assistant that knows\nwhere its answer comes from", 78, 160, 800, 132, 48, C.white, true);
    addText(s, "Key defense points", 82, 372, 320, 28, 22, C.cream, true);
    addText(s, "• RAG uses store documents and cites them\n• Tools read live data and protect writes with confirmation\n• JWT store context protects tenant data\n• Audit logs make every agent turn reviewable", 82, 421, 805, 140, 24, C.white);
    rect(s, 940, 160, 200, 290, C.orange, "rounded-2xl", C.orange);
    addText(s, "Ready for\nthe demo", 974, 235, 132, 75, 30, C.white, true, "center");
    addText(s, "24 Oct 2026", 970, 358, 140, 24, 17, C.cream, true, "center");
  }

  for (const [index, slide] of presentation.slides.items.entries()) {
    await writeBlob(path.join(buildDir, `slide-${String(index + 1).padStart(2, "0")}.png`), await presentation.export({ slide, format: "png", scale: 1 }));
  }
  await writeBlob(path.join(buildDir, "montage.webp"), await presentation.export({ format: "webp", montage: true }));

  const { finalizePresentation } = await import(pathToFileURL(path.join(skillDir, "container_tools", "artifact_tool_utils.mjs")).href);
  const candidatePath = path.join(workspaceDir, ".codex-finalizer", "shopmate-defense-candidate.pptx");
  await (await PresentationFile.exportPptx(presentation)).save(candidatePath);
  await finalizePresentation({
    explicitTotalSlideCount: 9,
    requiredNativeTableOwnerSlides: [],
    workspaceDir,
    candidatePath,
    finalPath: finalPptx,
    pythonExecutable: runtimePython,
    integrityValidatorPath: path.join(skillDir, "container_tools", "inspect_presentation_package_integrity.py"),
    layoutValidatorPath: path.join(skillDir, "container_tools", "inspect_presentation_layout_geometry.py"),
    layoutArgs: ["--expected-slide-size-emu", "12192000,6858000", "--validate-bullet-geometry", "--validate-heading-fit"],
    fontPolicy: { basis: "design", families: ["Aptos"] },
    verifyArtifactToolImport: true,
    receiptPath: path.join(workspaceDir, ".codex-finalizer", "shopmate-defense.validation.json"),
  });
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
