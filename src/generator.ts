import * as sql from "mssql";
import * as fs from "fs";
import * as path from "path";
import { sqlToTsType } from "./utils/typeMapping";

/** Represents a single record from the database schema query */
interface DatabaseRecord {
  TableName: string;
  ColumnName: string;
  DataType: string;
  MaxLength: number;
  Precision: number;
  Scale: number;
  IsNullable: boolean;
  CheckConstraintName: string | null;
  CheckConstraintDefinition: string | null;
  ObjectType: 'Table' | 'View';
}

/** Structure for organizing records by tables and views */
interface GroupedRecords {
  tables: Record<string, DatabaseRecord[]>;
  views: Record<string, DatabaseRecord[]>;
}

/**
 * Generates TypeScript interfaces from MSSQL database schema
 * @param connectionString - MSSQL connection string
 * @param outputPath - Path where the TypeScript file will be written
 * @returns Promise that resolves when the file is written
 * 
 * @example
 * await generateTypes(
 *   "Server=localhost;Database=mydb;User Id=sa;Password=pwd;",
 *   "./types/database.ts"
 * );
 */
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

    /**
     * Query the database schema
     * - Gets tables and views using UNION ALL
     * - Joins with columns to get column information
     * - Gets check constraints for enum-like types
     * - Filters system tables and specific constraint names
     */
    const result = await pool.request().query<DatabaseRecord>(`
      SELECT 
        t.name AS TableName,
        c.name AS ColumnName,
        tp.name AS DataType,
        c.max_length AS MaxLength,
        c.precision AS Precision,
        c.scale AS Scale,
        c.is_nullable AS IsNullable,
        cc.name AS CheckConstraintName,
        cc.definition AS CheckConstraintDefinition,
        CASE 
            WHEN t.type = 'U' THEN 'Table'
            WHEN t.type = 'V' THEN 'View'
        END AS ObjectType
      FROM 
        (SELECT object_id, name, type FROM sys.tables 
        UNION ALL 
        SELECT object_id, name, type FROM sys.views) t
      INNER JOIN 
        sys.columns c ON t.object_id = c.object_id
      INNER JOIN 
        sys.types tp ON c.user_type_id = tp.user_type_id
      LEFT JOIN 
        sys.check_constraints cc ON t.object_id = cc.parent_object_id 
          AND c.column_id = cc.parent_column_id
      WHERE 
        t.type IN ('U', 'V')  -- 'U' for Tables, 'V' for Views
        AND (cc.name LIKE 'chk_%' OR cc.name IS NULL)  -- Constraints filter
      ORDER BY 
        t.name, c.column_id;
    `);

    /**
     * Group records by their object type (table/view) and name
     * Creates a structure like:
     * {
     *   tables: { 
     *     TableName1: [columns...],
     *     TableName2: [columns...]
     *   },
     *   views: {
     *     ViewName1: [columns...]
     *   }
     * }
     */
    const recordsByObject = result.recordset.reduce<GroupedRecords>((acc, row) => {
      const content = row.ObjectType === 'View' ? acc.views : acc.tables;
      if (!content[row.TableName]) {
        content[row.TableName] = [];
      }
      content[row.TableName].push(row);
      return acc;
    }, { tables: {}, views: {} });

    /**
     * Generates the interface content for a table or view
     * - Handles check constraints by converting them to union types
     * - Converts SQL types to TypeScript types
     * - Adds null to nullable fields
     */
    const generateContent = (records: DatabaseRecord[]): string => {
      let content = '';
      records.forEach(row => {
        // If there's a check constraint, create a union type from its values
        // Otherwise, convert the SQL type to TypeScript type
        const finalType = row.CheckConstraintName 
          ? row.CheckConstraintDefinition?.match(/'([^']+)'/g)
              ?.map((match: string) => match.replace(/'/g, '"'))
              .sort()
              .join(' | ') 
          : sqlToTsType(row.DataType, row.IsNullable);

        // Add null to type if field is nullable
        content += `      ${row.ColumnName}: ${row.IsNullable ? `${finalType} | null` : finalType};\n`;
      });
      return content;
    };

    // Build the output interface string
    let output = "export interface Database {\n";
    
    // Generate table interfaces
    output += "  Tables: {\n";
    Object.entries(recordsByObject.tables).forEach(([tableName, records]) => {
      output += `    ${tableName}: {\n`;
      output += generateContent(records);
      output += "    }\n";
    });
    output += "  }\n";

    // Generate view interfaces
    output += "  Views: {\n";
    Object.entries(recordsByObject.views).forEach(([viewName, records]) => {
      output += `    ${viewName}: {\n`;
      output += generateContent(records);
      output += "    }\n";
    });
    output += "  }\n";
    output += "}\n\n";

    // Add helper types for easier table/view access
    output += "export type Tables<T extends keyof Database['Tables']> = Database['Tables'][T];\n";
    output += "export type Views<T extends keyof Database['Views']> = Database['Views'][T];\n";

    // Write the generated interfaces to file
    fs.writeFileSync(outputPath, output);

    await pool.close();
  } catch (error) {
    throw error;
  }
}