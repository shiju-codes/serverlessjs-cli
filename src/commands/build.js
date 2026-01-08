import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function walkRoutes(baseDir, baseUrl = '') {
  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    if (e.isDirectory()) {
      files.push(...walkRoutes(path.join(baseDir, e.name), baseUrl + '/' + e.name));
    } else if (e.isFile() && e.name.endsWith('.js')) {
      const name = e.name.replace(/\.js$/, '');
      let routePath = baseUrl;
      if (name === 'index') {
        if (!routePath) routePath = '/';
      } else if (/^\[.+\]$/.test(name)) {
        const param = name.slice(1, -1);
        routePath += `/{${param}}`;
      } else {
        routePath += `/${name}`;
      }
      files.push({
        filePath: path.join(baseDir, e.name),
        routePath: routePath || '/',
      });
    }
  }
  return files;
}

export async function buildCommand() {
  const projectRoot = process.cwd();
  const appDir = path.join(projectRoot, 'app');
  const routeDir = path.join(appDir, 'route');
  const apiDir = path.join(appDir, 'api');

  const outDir = path.join(projectRoot, '.serverless');
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const routes = walkRoutes(routeDir);
  const apis = walkRoutes(apiDir, '/api');

  const all = [
    ...routes.map(r => ({ ...r, type: 'route' })),
    ...apis.map(r => ({ ...r, type: 'api' }))
  ];

  const mapping = [];
  for (const r of all) {
    const lambdaName = r.routePath
      .replace(/[{}]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'root';
    const lambdaDir = path.join(outDir, lambdaName);
    fs.mkdirSync(lambdaDir, { recursive: true });

    const destModule = path.join(lambdaDir, 'route.js');
    fs.copyFileSync(r.filePath, destModule);

    const handlerCode = `
import * as routeModule from './route.js';
import { createLambdaHandler } from '../../src/runtime/awsAdapter.js';

export const handler = createLambdaHandler(routeModule);
`.trimStart();
    fs.writeFileSync(path.join(lambdaDir, 'handler.mjs'), handlerCode);

    mapping.push({
      lambdaName,
      routePath: r.routePath,
      type: r.type
    });
  }

  fs.writeFileSync(
    path.join(outDir, 'routes.json'),
    JSON.stringify(mapping, null, 2)
  );

  console.log('Build complete. Lambdas in .serverless/');
}
