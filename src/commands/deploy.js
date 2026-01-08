import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { LambdaClient, CreateFunctionCommand, UpdateFunctionCodeCommand } from '@aws-sdk/client-lambda';
import { ApiGatewayV2Client, CreateApiCommand, GetApisCommand, CreateIntegrationCommand, CreateRouteCommand, GetRoutesCommand } from '@aws-sdk/client-apigatewayv2';
import { IAMClient, CreateRoleCommand, AttachRolePolicyCommand } from '@aws-sdk/client-iam';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

function zipDir(srcDir, outFile) {
  execSync(`cd "${srcDir}" && zip -r "${outFile}" .`);
}

async function ensureRole(iam, projectName) {
  const roleName = `${projectName}-lambda-role`;
  const assumeRolePolicy = JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: { Service: 'lambda.amazonaws.com' },
        Action: 'sts:AssumeRole'
      }
    ]
  });

  try {
    await iam.send(
      new CreateRoleCommand({
        RoleName: roleName,
        AssumeRolePolicyDocument: assumeRolePolicy
      })
    );
    await iam.send(
      new AttachRolePolicyCommand({
        RoleName: roleName,
        PolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
      })
    );
  } catch (e) {
    // assume exists
  }

  return `arn:aws:iam::${process.env.AWS_ACCOUNT_ID || 'YOUR_ACCOUNT_ID'}:role/${roleName}`;
}

async function ensureHttpApi(apiClient, apiName) {
  const apis = await apiClient.send(new GetApisCommand({ MaxResults: '50' }));
  const existing = apis.Items?.find(a => a.Name === apiName);
  if (existing) return existing.ApiId;

  const res = await apiClient.send(
    new CreateApiCommand({
      Name: apiName,
      ProtocolType: 'HTTP'
    })
  );
  return res.ApiId;
}

export async function deployCommand() {
  const projectRoot = process.cwd();
  const config = JSON.parse(fs.readFileSync(path.join(projectRoot, 'serverless.config.json'), 'utf-8'));
  const mapping = JSON.parse(fs.readFileSync(path.join(projectRoot, '.serverless', 'routes.json'), 'utf-8'));

  const region = process.env.AWS_REGION || config.aws.region;
  const lambda = new LambdaClient({ region });
  const apiClient = new ApiGatewayV2Client({ region });
  const iam = new IAMClient({ region });

  const roleArn = await ensureRole(iam, config.aws.apiName);
  const apiId = await ensureHttpApi(apiClient, config.aws.apiName);

  const routesExisting = await apiClient.send(new GetRoutesCommand({ ApiId: apiId }));
  const existingRoutes = routesExisting.Items || [];

  for (const route of mapping) {
    const lambdaName = route.lambdaName;
    const lambdaDir = path.join(projectRoot, '.serverless', lambdaName);
    const zipPath = path.join(projectRoot, '.serverless', `${lambdaName}.zip`);

    zipDir(lambdaDir, zipPath);

    const zipBuffer = fs.readFileSync(zipPath);
    const funcName = `${config.aws.apiName}-${lambdaName}`;

    let functionArn;
    try {
      const createRes = await lambda.send(
        new CreateFunctionCommand({
          FunctionName: funcName,
          Role: roleArn,
          Runtime: 'nodejs20.x',
          Handler: 'handler.mjs',
          Code: { ZipFile: zipBuffer }
        })
      );
      functionArn = createRes.FunctionArn;
    } catch (e) {
      if (e.name === 'ResourceConflictException') {
        const upd = await lambda.send(
          new UpdateFunctionCodeCommand({
            FunctionName: funcName,
            ZipFile: zipBuffer
          })
        );
        functionArn = upd.FunctionArn;
      } else {
        throw e;
      }
    }

    const integRes = await apiClient.send(
      new CreateIntegrationCommand({
        ApiId: apiId,
        IntegrationType: 'AWS_PROXY',
        IntegrationUri: `arn:aws:lambda:${region}:${process.env.AWS_ACCOUNT_ID}:function:${funcName}`,
        PayloadFormatVersion: '2.0'
      })
    );

    const routeKey = `GET ${route.routePath || '/'}`;
    const already = existingRoutes.find(r => r.RouteKey === routeKey);
    if (!already) {
      await apiClient.send(
        new CreateRouteCommand({
          ApiId: apiId,
          RouteKey: routeKey,
          Target: `integrations/${integRes.IntegrationId}`
        })
      );
    }
  }

  console.log(`Deployed to API ID ${apiId}`);
}
