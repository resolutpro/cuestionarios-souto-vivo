import { pool } from "../server/db";

async function main() {
  console.log("🔄 Iniciando migración de columnas a Arrays...");

  const client = await pool.connect();

  try {
    // 1. Migrar 'uso_suelo' de texto a array de texto
    console.log("Migrando columna 'uso_suelo'...");
    await client.query(`
      ALTER TABLE submissions 
      ALTER COLUMN uso_suelo TYPE text[] 
      USING CASE 
        WHEN uso_suelo IS NULL THEN NULL 
        ELSE ARRAY[uso_suelo::text] 
      END;
    `);

    // 2. Migrar 'colaboracion' de texto a array de texto
    console.log("Migrando columna 'colaboracion'...");
    await client.query(`
      ALTER TABLE submissions 
      ALTER COLUMN colaboracion TYPE text[] 
      USING CASE 
        WHEN colaboracion IS NULL THEN NULL 
        ELSE ARRAY[colaboracion::text] 
      END;
    `);

    console.log("✅ ¡Migración completada con éxito!");
  } catch (error) {
    console.error("❌ Error durante la migración:", error);
  } finally {
    client.release();
    process.exit(0);
  }
}

main();
