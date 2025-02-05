#!/usr/bin/env node

import { Command } from 'commander';
import { generateTypes } from './generator';
import inquirer from 'inquirer';
import { DatabaseManager } from './utils/db';

const program = new Command();

program
  .name('mssql-to-ts')
  .description('Generate TypeScript interfaces from MSSQL database tables')
  .version('1.0.0');

program
  .command('add')
  .description('Add a new database connection')
  .action(async () => {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Enter a name for this connection:',
        validate: (input) => input.length > 0
      },
      {
        type: 'input',
        name: 'server',
        message: 'Enter the MSSQL server:',
        validate: (input) => input.length > 0
      },
      {
        type: 'input',
        name: 'database',
        message: 'Enter the database name:',
        validate: (input) => input.length > 0
      },
      {
        type: 'input',
        name: 'username',
        message: 'Enter the username:',
        validate: (input) => input.length > 0
      },
      {
        type: 'password',
        name: 'password',
        message: 'Enter the password:',
        validate: (input) => input.length > 0
      }
    ]);

    try {
      const db = DatabaseManager.getInstance();
      await db.saveConnection(
        answers.name,
        answers.server,
        answers.database,
        answers.username,
        answers.password
      );
      console.log('Connection saved successfully!');
    } catch (error) {
      console.error('Error saving connection:', error);
    }
  });

program
  .command('generate')
  .description('Generate TypeScript interfaces from a saved connection')
  .option('-e', 'Encrypt connection to database', false)
  .option('-t', 'Trust server certificate', false)
  .action(async (options) => {
    const db = DatabaseManager.getInstance();
    const connections = db.getAllConnections();

    if (connections.length === 0) {
      console.log('No saved connections found. Use "add" command to add a connection first.');
      return;
    }

    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'connectionName',
        message: 'Select a connection:',
        choices: connections.map(conn => conn.name)
      },
      {
        type: 'input',
        name: 'output',
        message: 'Enter the output file path:',
        default: './dbschema/types.ts'
      }
    ]);

    const connection = db.getConnectionByName(answers.connectionName);
    if (!connection) {
      console.error('Connection not found');
      return;
    }

    let connectionString = await db.buildConnectionString(connection);
    if (options.e) {
      connectionString = connectionString.replace('Encrypt=false', 'Encrypt=true');
    }
    if (options.t) {
      connectionString = connectionString.replace('TrustServerCertificate=false', 'TrustServerCertificate=true');
    }


    try {
      await generateTypes(connectionString, answers.output);
      console.log('Types generated successfully!');
    } catch (error) {
      console.error('Error generating types:', error);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List all saved connections')
  .action(() => {
    const db = DatabaseManager.getInstance();
    const connections = db.getAllConnections();
    
    if (connections.length === 0) {
      console.log('No saved connections found.');
      return;
    }

    console.log('\nSaved connections:');
    connections.forEach(conn => {
      console.log(`- ${conn.name} (${conn.server}/${conn.database})`);
    });
  });

program
  .command('remove')
  .description('Remove a saved connection')
  .action(async () => {
    const db = DatabaseManager.getInstance();
    const connections = db.getAllConnections();

    if (connections.length === 0) {
      console.log('No saved connections found.');
      return;
    }

    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'connectionName',
        message: 'Select a connection to remove:',
        choices: connections.map(conn => conn.name)
      }
    ]);

    try {
      db.deleteConnection(answer.connectionName);
      console.log('Connection removed successfully!');
    } catch (error) {
      console.error('Error removing connection:', error);
    }
  });

program.parse(process.argv); 