import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initCommand() {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'cloud',
      message: 'Select cloud provider:',
      choices: ['aws lambda', 'azure function(soon)', 'gcp functions (soon)'],
      default: 'aws lambda'
    },
    {
      type: 'input',
      name: 'awsAccessKeyId',
      message: 'AWS Access Key ID',
      when: (a) => a.cloud === 'aws lambda'
    },
    {
      type: 'input',
      name: 'awsSecretAccessKey',
      message: 'AWS Secret Access Key',
      when: (a) => a.cloud === 'aws lambda'
    },
    {
      type: 'input',
      name: 'awsRegion',
      message: 'AWS Region',
      default: 'us-east-1',
      when: (a) => a.cloud === 'aws lambda'
    },
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name',
      default: 'my-serverless-app'
    }
  ]);

  const projectRoot = path.resolve(process.cwd(), answers.projectName);
  fs.mkdirSync(projectRoot, { recursive: true });

  const pkg = {
    name: answers.projectName,
    version: '0.0.1',
    private: true,
    type: "module",
    scripts: {
      dev: 'node serverless.local.js',
      build: 'serverlessjs build',
      deploy: 'serverlessjs deploy'
    },
    dependencies: {},
    devDependencies: {}
  };
  fs.writeFileSync(
    path.join(projectRoot, 'package.json'),
    JSON.stringify(pkg, null, 2)
  );

  const envContent =
    `AWS_ACCESS_KEY_ID=${answers.awsAccessKeyId || ''}
` +
    `AWS_SECRET_ACCESS_KEY=${answers.awsSecretAccessKey || ''}
` +
    `AWS_REGION=${answers.awsRegion || 'us-east-1'}
`;
  fs.writeFileSync(path.join(projectRoot, '.env'), envContent);

  const config = {
    cloud: answers.cloud,
    aws: {
      region: answers.awsRegion,
      apiName: `${answers.projectName}-api`
    }
  };
  fs.writeFileSync(
    path.join(projectRoot, 'serverless.config.json'),
    JSON.stringify(config, null, 2)
  );

  const appDir = path.join(projectRoot, 'app');
  const routeDir = path.join(appDir, 'route');
  const apiDir = path.join(appDir, 'api');
  fs.mkdirSync(routeDir, { recursive: true });
  fs.mkdirSync(apiDir, { recursive: true });

  const indexJs = `
export async function GET() {
  const html = \`
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>ServerlessJS Starter</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        :root {
          color-scheme: dark light;
          --bg: #020817;
          --bg-soft: #020617;
          --fg: #e5e7eb;
          --fg-muted: #9ca3af;
          --accent: #3b82f6;
          --accent-soft: rgba(59,130,246,0.15);
          --border: #1f2937;
          --code-bg: #020617;
        }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          min-height: 100vh;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text",
            "Segoe UI", sans-serif;
          background: radial-gradient(circle at top, #0b1120 0, #020617 45%, #020617 100%);
          color: var(--fg);
          display: flex;
          align-items: stretch;
          justify-content: center;
        }
        .page {
          width: 100%;
          max-width: 960px;
          padding: 32px 16px 48px;
          margin: auto;
        }
        .logo-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 32px;
        }
        .logo {
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }
        .logo-badge {
          width: 32px;
          height: 32px;
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at 30% 0%, #38bdf8 0, #3b82f6 40%, #4f46e5 85%);
          box-shadow: 0 0 0 1px rgba(15,23,42,0.9), 0 12px 40px rgba(37,99,235,0.5);
        }
        .logo-badge span {
          font-size: 16px;
          font-weight: 700;
          color: white;
        }
        .logo-text {
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          font-size: 13px;
          color: var(--fg-muted);
        }
        .pill {
          font-size: 12px;
          border-radius: 999px;
          border: 1px solid var(--border);
          padding: 4px 10px;
          color: var(--fg-muted);
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(15,23,42,0.7);
        }
        .pill-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #22c55e;
          box-shadow: 0 0 0 4px rgba(34,197,94,0.25);
        }
        .hero {
          border-radius: 24px;
          padding: 32px 24px 24px;
          border: 1px solid rgba(148,163,184,0.2);
          background:
            radial-gradient(circle at top left, rgba(56,189,248,0.12), transparent 55%),
            radial-gradient(circle at top right, rgba(99,102,241,0.18), transparent 55%),
            linear-gradient(to bottom right, rgba(15,23,42,0.96), #020617);
          box-shadow:
            0 24px 80px rgba(15,23,42,0.9),
            0 0 0 1px rgba(15,23,42,0.9);
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
          gap: 32px;
        }
        @media (max-width: 768px) {
          .hero { grid-template-columns: minmax(0, 1fr); }
          .logo-row { flex-direction: column; align-items: flex-start; }
        }
        .hero-title {
          font-size: clamp(28px, 4vw, 34px);
          line-height: 1.1;
          font-weight: 700;
          letter-spacing: -0.04em;
          margin-bottom: 12px;
        }
        .hero-title span {
          background: linear-gradient(to right, #38bdf8, #3b82f6, #a855f7);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .hero-subtitle {
          font-size: 14px;
          line-height: 1.6;
          color: var(--fg-muted);
          max-width: 32rem;
          margin-bottom: 20px;
        }
        .hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 24px;
        }
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 999px;
          font-size: 13px;
          border: 1px solid transparent;
          cursor: pointer;
          text-decoration: none;
          transition: background 0.15s ease, border-color 0.15s ease, transform 0.08s ease;
          user-select: none;
        }
        .btn-primary {
          background: linear-gradient(to right, #3b82f6, #2563eb);
          color: white;
          box-shadow:
            0 12px 35px rgba(37,99,235,0.55),
            0 0 0 1px rgba(15,23,42,0.9);
        }
        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow:
            0 18px 45px rgba(37,99,235,0.75),
            0 0 0 1px rgba(15,23,42,0.9);
        }
        .btn-secondary {
          background: rgba(15,23,42,0.7);
          color: var(--fg-muted);
          border-color: rgba(148,163,184,0.35);
        }
        .btn-secondary:hover {
          border-color: rgba(148,163,184,0.6);
          background: rgba(15,23,42,0.9);
        }
        .hero-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          font-size: 12px;
          color: var(--fg-muted);
        }
        .hero-meta span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .dot {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: rgba(148,163,184,0.7);
        }
        .hero-right {
          border-radius: 18px;
          padding: 16px;
          background: rgba(15,23,42,0.9);
          border: 1px solid rgba(148,163,184,0.25);
          box-shadow: inset 0 0 0 1px rgba(15,23,42,0.9);
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .hero-right-title {
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.16em;
          color: var(--fg-muted);
        }
        .code-block {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
            "Liberation Mono", "Courier New", monospace;
          font-size: 12px;
          line-height: 1.5;
          border-radius: 12px;
          background: radial-gradient(circle at top left, #020617 0, #020617 60%) padding-box;
          border: 1px solid rgba(15,23,42,0.9);
          padding: 10px 12px 10px;
          color: #e5e7eb;
          position: relative;
          overflow: hidden;
        }
        .code-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
          color: var(--fg-muted);
        }
        .code-dots {
          display: flex;
          gap: 4px;
        }
        .code-dot {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: #4b5563;
        }
        .code-dot:nth-child(1) { background: #ef4444; }
        .code-dot:nth-child(2) { background: #eab308; }
        .code-dot:nth-child(3) { background: #22c55e; }
        .code-body { white-space: pre; }
        .code-comment { color: #6b7280; }
        .code-keyword { color: #38bdf8; }
        .code-accent { color: #a855f7; }
        .code-string { color: #22c55e; }
        .stack { display: grid; gap: 8px; margin-top: 6px; }
        .stack-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          color: var(--fg-muted);
        }
        .stack-label {
          text-transform: uppercase;
          letter-spacing: 0.16em;
        }
        .stack-badge {
          padding: 3px 8px;
          border-radius: 999px;
          border: 1px solid rgba(148,163,184,0.35);
          background: rgba(15,23,42,0.8);
        }
        .footer {
          margin-top: 16px;
          font-size: 11px;
          color: var(--fg-muted);
          display: flex;
          justify-content: space-between;
          gap: 8px;
        }
        @media (max-width: 480px) {
          .hero { padding: 24px 18px 18px; }
          .page { padding-inline: 12px; }
        }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="logo-row">
          <div class="logo">
            <div class="logo-badge">
              <span>Λ</span>
            </div>
            <div class="logo-text">serverlessjs • dev</div>
          </div>
          <div class="pill">
            <span class="pill-dot"></span>
            <span>Local dev server running on <code>http://localhost:3000</code></span>
          </div>
        </div>

        <section class="hero">
          <div>
            <h1 class="hero-title">
              Ship file-based routes<br />
              <span>directly to AWS Lambda.</span>
            </h1>
            <p class="hero-subtitle">
              You are looking at the default <code>app/route/index.js</code> page for ServerlessJS.
              Create files under <code>app/route</code> and <code>app/api</code> to define routes,
              then run <code>npm run build</code> and <code>npm run deploy</code> to publish them.
            </p>
            <div class="hero-actions">
              <a class="btn btn-primary" href="#">
                Get started by editing <code>app/route/index.js</code>
              </a>
              <button class="btn btn-secondary" type="button">
                Try adding <code>app/route/blog/[slug].js</code>
              </button>
            </div>
            <div class="hero-meta">
              <span><span class="dot"></span> File-based routing</span>
              <span><span class="dot"></span> AWS Lambda + API Gateway</span>
              <span><span class="dot"></span> Local dev via Node HTTP server</span>
            </div>
          </div>

          <aside class="hero-right">
            <div class="hero-right-title">Quick start</div>
            <div class="code-block">
              <div class="code-title">
                <span>terminal</span>
                <div class="code-dots">
                  <span class="code-dot"></span>
                  <span class="code-dot"></span>
                  <span class="code-dot"></span>
                </div>
              </div>
              <div class="code-body">
<span class="code-comment"># create a new project</span>
<span class="code-keyword">serverlessjs</span> init

<span class="code-comment"># develop locally</span>
<span class="code-keyword">npm</span> run dev

<span class="code-comment"># build lambdas from app/route and app/api</span>
<span class="code-keyword">npm</span> run build

<span class="code-comment"># deploy to AWS Lambda + API Gateway</span>
<span class="code-keyword">npm</span> run deploy
              </div>
            </div>

            <div class="stack">
              <div class="stack-item">
                <span class="stack-label">Routing</span>
                <span class="stack-badge">app/route &amp; app/api</span>
              </div>
              <div class="stack-item">
                <span class="stack-label">Runtime</span>
                <span class="stack-badge">Node.js Lambda (HTTP)</span>
              </div>
              <div class="stack-item">
                <span class="stack-label">Provider</span>
                <span class="stack-badge">AWS (MVP)</span>
              </div>
            </div>
          </aside>
        </section>

        <div class="footer">
          <span>Edit this page at <code>app/route/index.js</code>.</span>
          <span>Tip: Add <code>app/route/docs/index.js</code> for <code>/docs</code>.</span>
        </div>
      </div>
    </body>
  </html>
  \`.trim();

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html' },
    body: html
  };
}
`.trimStart();
  fs.writeFileSync(path.join(routeDir, 'index.js'), indexJs);

  const helloJs = `
export async function GET() {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Hello from API' })
  };
}
`.trimStart();
  fs.writeFileSync(path.join(apiDir, 'hello.js'), helloJs);

  const localServer = `
import http from 'http';
import url from 'url';
import path from 'path';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const appDir = path.join(__dirname, 'app');

function mapPathToFile(reqPath) {
  if (reqPath === '/') {
    return { type: 'route', file: path.join(appDir, 'route', 'index.js') };
  }
  if (reqPath.startsWith('/api')) {
    const rel = reqPath.slice('/api'.length) || '/index';
    return { type: 'api', file: path.join(appDir, 'api', rel + '.js') };
  }
  const relRoute = reqPath === '' ? '/index' : reqPath;
  return { type: 'route', file: path.join(appDir, 'route', relRoute + '.js') };
}

const server = http.createServer(async (req, res) => {
  const { pathname } = url.parse(req.url);
  const method = req.method || 'GET';

  function resolveDynamicRoute(baseDir, urlPath) {
    const segments = urlPath.split('/').filter(Boolean);
    let currentDir = baseDir;
    let params = {};

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];

      const fileCandidate = path.join(currentDir, seg + '.js');
      if (fs.existsSync(fileCandidate)) {
        if (i === segments.length - 1) return { file: fileCandidate, params };
      }

      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      const dynFile = entries.find(
        (e) => e.isFile() && /^\\[.+\\]\\.js$/.test(e.name)
      );
      if (dynFile && i === segments.length - 1) {
        const paramName = dynFile.name.slice(1, -3);
        params[paramName] = seg;
        return { file: path.join(currentDir, dynFile.name), params };
      }

      const nextDir = path.join(currentDir, seg);
      if (fs.existsSync(nextDir) && fs.statSync(nextDir).isDirectory()) {
        currentDir = nextDir;
      }
    }

    return null;
  }

  let mapping = mapPathToFile(pathname);
  if (!fs.existsSync(mapping.file)) {
    const baseDir =
      mapping.type === 'api'
        ? path.join(appDir, 'api')
        : path.join(appDir, 'route');
    const dyn = resolveDynamicRoute(
      baseDir,
      pathname.replace(mapping.type === 'api' ? '/api' : '', '') || '/'
    );
    if (!dyn) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }
    mapping.file = dyn.file;
    req.params = dyn.params;
  }

  try {
    const modUrl =
      pathToFileURL(mapping.file).href + \`?cacheBust=\${Date.now()}\`;
    const mod = await import(modUrl);
    const handler = mod[method];

    if (!handler) {
      res.statusCode = 405;
      res.end('Method not allowed');
      return;
    }

    const result = await handler({
      path: pathname,
      method,
      params: req.params || {}
    });

    res.statusCode = result.statusCode || 200;
    if (result.headers) {
      for (const [k, v] of Object.entries(result.headers)) {
        res.setHeader(k, v);
      }
    }
    res.end(result.body || '');
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    res.end('Internal server error');
  }
});

server.listen(3000, () => {
  console.log('ServerlessJS local dev on http://localhost:3000');
});
`.trimStart();

  fs.writeFileSync(path.join(projectRoot, 'serverless.local.js'), localServer);
  console.log(`Project created at ${projectRoot}`);
}
