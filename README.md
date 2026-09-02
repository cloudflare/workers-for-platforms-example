Here are the full operational details, complete configuration files, and step-by-step commands for setting up your Workers for Platforms dynamic dispatch application.
1. Configuration Manifest (wrangler.jsonc)
Save this file in your root directory to link your dispatch namespace and KV mappings:
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "workers-for-platforms-example-project",
  "main": "src/index.ts",
  "compatibility_date": "2026-03-01",
  
  // Dynamic Dispatch Namespace Binding for User Workers
  "dispatch_namespaces": [
    {
      "binding": "dispatcher",
      "namespace": "workers-for-platforms-example-project",
      "remote": true
    }
  ],

  // KV storage mapping friendly names to user script IDs
  "kv_namespaces": [
    {
      "binding": "WORKER_MAPPINGS",
      "id": "REPLACE_WITH_KV_ID",
      "preview_id": "REPLACE_WITH_PREVIEW_KV_ID"
    }
  ],

  "vars": {
    "DISPATCH_NAMESPACE_NAME": "workers-for-platforms-example-project"
  }
}

2. Core Dispatch Script (src/index.ts)
This entry-point script handles incoming requests, checks the KV mapping for the requested worker name, and routes execution dynamically to the target user worker:
export interface Env {
  dispatcher: DispatchNamespace;
  WORKER_MAPPINGS: KVNamespace;
  DISPATCH_NAMESPACE_NAME: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");

    // Example route pattern: /user-workers/{worker-name}
    if (pathParts[1] === "user-workers" && pathParts[2]) {
      const workerFriendlyName = pathParts[2];

      try {
        // 1. Look up the actual internal script name/ID from KV
        const scriptName = await env.WORKER_MAPPINGS.get(workerFriendlyName);
        if (!scriptName) {
          return new Response(`Worker "${workerFriendlyName}" not found in mappings.`, { status: 404 });
        }

        // 2. Fetch the user worker dynamically from the dispatch namespace binding
        const userWorker = env.dispatcher.get(scriptName);
        
        // 3. Rewrite request path if needed and proxy execution
        const modifiedRequest = new Request(request);
        return await userWorker.fetch(modifiedRequest);

      } catch (error: any) {
        return new Response(`Error dispatching worker: ${error.message}`, { status: 500 });
      }
    }

    return new Response("Workers for Platforms Gateway Active. Use /user-workers/{name}", {
      status: 200,
      headers: { "Content-Type": "text/plain" }
    });
  },
};

3. Setup & Deployment Command Sequence
Execute these steps in your terminal to initialize and provision your platform infrastructure:
 * Install Dependencies:
   npm install

 * Authenticate & Set API Secrets:
   npx wrangler secret put CLOUDFLARE_API_TOKEN
npx wrangler secret put CLOUDFLARE_ACCOUNT_ID

 * Create the KV Namespace for Mappings:
   npx wrangler kv:namespace create "WORKER_MAPPINGS"

   (Copy the generated ID and update it in your wrangler.jsonc file).
 * Create the Dispatch Namespace:
   npx wrangler dispatch-namespace create workers-for-platforms-example-project

 * Run Locally or Deploy:
   * Local Emulation:
     npm run dev

   * Production Deployment:
     npm run deploy

