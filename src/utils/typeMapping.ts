export function sqlToTsType(sqlType: string, isNullable: boolean): string {
    const baseType = getSqlToTsBaseType(sqlType);
    return baseType;
  }
  
  function getSqlToTsBaseType(sqlType: string): string {
    switch (sqlType.toLowerCase()) {
      case 'bit':
        return 'boolean';
      case 'tinyint':
      case 'smallint':
      case 'int':
      case 'bigint':
      case 'decimal':
      case 'numeric':
      case 'float':
      case 'real':
        return 'number';
      case 'date':
      case 'datetime':
      case 'datetime2':
      case 'smalldatetime':
        return 'Date';
      case 'uniqueidentifier':
        return 'string';
      case 'char':
      case 'varchar':
      case 'text':
      case 'nchar':
      case 'nvarchar':
      case 'ntext':
        return 'string';
      default:
        return 'any';
    }
  } 