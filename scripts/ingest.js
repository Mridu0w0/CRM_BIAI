import fs from "node:fs";
import { parse } from "csv-parse/sync";
import { db } from "../src/lib/firebase.js";
import { classifyEnquiry } from "../src/lib/classify.js";

const force = process.argv.includes("--force");

function contactKey(row) {
  let digits = (row.phone || "").replace(/\D/g, "");
  if (digits.startsWith("880")) digits = "0" + digits.slice(3);
  if (digits) return digits;
  return `${row.sender_name}|${row.channel}`.toLowerCase();
}

const raw = fs.readFileSync("data/sample-enquiries.csv", "utf8");
const rows = parse(raw, {
  bom: true,
  columns: (header) =>
    header.map((h) => h.trim().toLowerCase().replace(/\s+/g, "_")),
  skip_empty_lines: true,
  trim: true,
});

console.log(
  `Read ${rows.length} rows. Columns: ${Object.keys(rows[0]).join(", ")}`,
);

// Count enquiries per contact so repeat contacts are visible
const counts = {};
for (const row of rows) {
  const key = contactKey(row);
  counts[key] = (counts[key] || 0) + 1;
}

for (const row of rows) {
  const ref = db.collection("enquiries").doc(String(row.id));

  if (!force && (await ref.get()).exists) {
    console.log(`#${row.id} already ingested, skipping (use --force to redo)`);
    continue;
  }

  try {
    let ai;
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        ai = await classifyEnquiry(row);
        break;
      } catch (err) {
        if (attempt === 4) throw err;
        console.log(`#${row.id} attempt ${attempt} failed, retrying...`);
        await new Promise((resolve) => setTimeout(resolve, attempt * 3000));
      }
    }
    const key = contactKey(row);
    await ref.set({
      id: row.id,
      channel: row.channel,
      received_at: row.received_at,
      sender_name: row.sender_name,
      phone: row.phone || null,
      message: row.message,
      contact_key: key,
      contact_enquiry_count: counts[key],
      ai,
      status: "new",
      ingested_at: new Date().toISOString(),
    });
    console.log(
      `#${row.id} → ${ai.category} (score ${ai.lead_score}, ${ai.priority})`,
    );
    await new Promise((resolve) => setTimeout(resolve, 4000));
  } catch (err) {
    console.error(`#${row.id} failed:`, err.message);
  }
}

console.log("Done.");
