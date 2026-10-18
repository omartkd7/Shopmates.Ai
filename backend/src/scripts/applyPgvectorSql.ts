import { readFile } from "node:fs/promises";
import path from "node:path";
import sequelize from "../config/database";

/**
 * Applies the idempotent pgvector SQL after Sequelize has created `chunks`.
 * This runs on every container start and is safe when the index already exists.
 */
async function main(): Promise<void> {
  try {
    const sqlPath = path.resolve(__dirname, "../../sql/001_init_pgvector.sql");
    const sql = await readFile(sqlPath, "utf8");
    await sequelize.query(sql);
    console.log("pgvector extension and HNSW index are ready.");
  } finally {
    await sequelize.close();
  }
}

main().catch((error) => {
  console.error("Unable to apply pgvector SQL:", error);
  process.exitCode = 1;
});
