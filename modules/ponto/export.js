const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { formatDuration, formatDateTime } = require("./time.js");

function sessionsToCsv(sessions) {
  const header = "id,user_id,username,patente,setor,status,started_at,ended_at,total_time,paused_time_ms,approved\n";
  const rows = sessions.map((s) => {
    const cols = [
      s.id,
      s.user_id,
      `"${(s.username || "").replace(/"/g, '""')}"`,
      `"${(s.patente || "").replace(/"/g, '""')}"`,
      `"${(s.setor || "").replace(/"/g, '""')}"`,
      s.status,
      s.started_at,
      s.ended_at || "",
      formatDuration(s.total_time_ms),
      s.paused_time_ms,
      s.approved ? "sim" : "nao"
    ];
    return cols.join(",");
  });
  return header + rows.join("\n");
}

async function writeTempCsv(sessions, filename) {
  const csv = sessionsToCsv(sessions);
  const filePath = path.join(os.tmpdir(), filename);
  fs.writeFileSync(filePath, csv, "utf8");
  return filePath;
}

function buildWeeklyReportText(sessions) {
  const lines = [
    "RELATÓRIO OPERACIONAL SEMANAL — LITORAL PAULISTA",
    "═".repeat(50),
    ""
  ];
  if (!sessions.length) {
    lines.push("Nenhum registro no período.");
    return lines.join("\n");
  }
  for (const s of sessions) {
    lines.push(
      `#${s.id} | ${s.username} | ${s.status} | ${formatDuration(s.total_time_ms)} | ${formatDateTime(s.started_at)}`
    );
  }
  return lines.join("\n");
}

module.exports = { sessionsToCsv, writeTempCsv, buildWeeklyReportText };
