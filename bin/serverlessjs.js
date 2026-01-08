#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from '../src/commands/init.js';
import { buildCommand } from '../src/commands/build.js';
import { deployCommand } from '../src/commands/deploy.js';

const program = new Command();

program
  .name('serverlessjs')
  .description('File-based routing + serverless deployer')
  .version('0.0.1');

program
  .command('init')
  .description('Initialize a new serverlessjs project')
  .action(initCommand);

program
  .command('build')
  .description('Build serverlessjs lambdas')
  .action(buildCommand);

program
  .command('deploy')
  .description('Deploy lambdas and API Gateway routes')
  .action(deployCommand);

program.parse(process.argv);
