const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function importDb() {
  console.log("Iniciando importación de BD...");
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'db',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || process.env.DB_ROOT_PASSWORD,
      database: process.env.DB_NAME,
      multipleStatements: true
    });

    console.log("Conectado a MySQL.");
    const sqlPath = path.join(__dirname, 'sync_dealer_prod_20260709.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log("Ejecutando SQL (" + sql.length + " bytes)...");
    await connection.query(sql);

    console.log("¡Importación completada con éxito!");
    await connection.end();
  } catch (error) {
    console.error("Error importando:", error);
  }
}

importDb();
