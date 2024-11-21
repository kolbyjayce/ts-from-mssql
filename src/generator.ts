import * as sql from "mssql";
import * as fs from "fs";
import * as path from "path";
import { sqlToTsType } from "./utils/typeMapping";

export async function generateTypes(
  connectionString: string,
  outputPath: string
): Promise<void> {
  try {
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Connect to database
    const pool = await sql.connect(connectionString);

    // Query to get all tables and their columns
    const result = await pool.request().query(`
      SELECT 
        t.name AS TableName,
        c.name AS ColumnName,
        tp.name AS DataType,
        c.max_length AS MaxLength,
        c.precision AS Precision,
        c.scale AS Scale,
        c.is_nullable AS IsNullable
      FROM 
        sys.tables t
      INNER JOIN 
        sys.columns c ON t.object_id = c.object_id
      INNER JOIN 
        sys.types tp ON c.user_type_id = tp.user_type_id
      WHERE 
        t.is_ms_shipped = 0  -- Exclude system tables
      ORDER BY 
        t.name, c.column_id;
    `);

    // Generate interfaces
    let output = "";
    let currentTable = "";

    for (const row of result.recordset) {
      if (currentTable !== row.TableName) {
        if (currentTable) {
          output += "}\n\n";
        }
        currentTable = row.TableName;
        output += `export interface ${row.TableName} {\n`;
      }

      const tsType = sqlToTsType(row.DataType, row.IsNullable);
      output += `  ${row.ColumnName}${row.IsNullable ? "?" : ""}: ${tsType};\n`;
    }

    if (currentTable) {
      output += "}\n";
    }

    // Write to file
    fs.writeFileSync(outputPath, output);

    await pool.close();
  } catch (error) {
    throw error;
  }
}
