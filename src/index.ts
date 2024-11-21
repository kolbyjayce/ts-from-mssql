#!/usr/bin/env node

import { Command } from 'commander';
import { generateTypes } from './generator';

const program = new Command();

program
  .name('mssql-to-ts')
  .description(`Generate TypeScript interfaces from MSSQL database tables.
  
  The connection string should follow this format:
  Server=localhost,1433;Database=database;User Id=username;Password=password;Encrypt=true
  `)
  .requiredOption('-c, --connection <string>', 'MSSQL connection string')
  .requiredOption('-o, --output <string>', 'Output file path')
  .parse(process.argv);

const options = program.opts();

generateTypes(options.connection, options.output)
  .then(() => console.log('Types generated successfully!'))
  .catch((error) => {
    console.error('Error generating types:', error);
    process.exit(1);
  }); 