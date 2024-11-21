# ts-from-mssql

`ts-from-mssql` is used to generate interfaces matching SQL Server tables. It is very limited and lightweight, so it will do the minimum, but types and expanded functionality may be limited.

Usage:
```
npm install -g ts-from-mssql
```

```
ts-from-mssql -c {connection string} -o {output file path}
```

## Connection string

The connection string should be similar to `Server=localhost,1433;Database=database;User Id=username;Password=password;Encrypt=true`

Any further options such as:
- `TrustServerCertificate: boolean`

will be in the same section as `Encrypt`

## Debugging

This package works by querying 

- sys.tables
- sys.columns
- sys.types

Ensure that the user has correct access to these databases to ensure this works as expected.