# ts-from-mssql

`ts-from-mssql` is used to generate interfaces matching SQL Server tables. It is very limited and lightweight, so it will do the minimum, but types and expanded functionality may be limited.

Usage:
```bash
npm install -g ts-from-mssql
```

```bash
# add connection
ts-from-mssql add
# delete connection from list
ts-from-mssql remove
# list all available connections
ts-from-mssql list
# generate types from database connection
ts-from-mssql generate
```

## Generate parameters
- `-t`: 
    - TrustServerCertificate: true;
- `-e`
    - Encrypt: true;


## Debugging

This package works by querying 

- sys.tables
- sys.columns
- sys.types
- sys.check_constraints

Ensure that the user has correct access to these databases to ensure this works as expected.

## Security

Connection information is stored locally for a user. Password are stored securely using the system keychain. All other information are stored in a database that is created with use.