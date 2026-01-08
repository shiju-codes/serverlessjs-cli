export function createLambdaHandler(routeModule) {
  return async function handler(event) {
    const method = (event.requestContext?.http?.method || 'GET').toUpperCase();
    const path = event.requestContext?.http?.path || '/';

    const fn = routeModule[method];
    if (!fn) {
      return { statusCode: 405, headers: {}, body: 'Method not allowed' };
    }

    const params = event.pathParameters || {};
    const query = event.queryStringParameters || {};

    const res = await fn({ path, method, params, query, event });
    return {
      statusCode: res.statusCode || 200,
      headers: res.headers || {},
      body: res.body || ''
    };
  };
}
