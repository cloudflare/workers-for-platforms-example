# Workers for Platforms Example Project
**This workflow looks solid for deploying a Cloudflare Worker via GitHub Actions.** A few observations and suggestions:

### What's working well
- ✅ Correctly gates deployment to `main` branch pushes only (PRs run checks but don't deploy)
- ✅ Uses `npm ci` for reproducible installs
- ✅ TypeScript checking and test running before deploy
- ✅ `wrangler-action@v3` is the current major version

### Potential improvements

1. **Add `wrangler.toml` or `wrangler.jsonc` awareness** — The action auto-detects your wrangler config, but make sure your config file is committed and the `main` field points to your Worker entry point.

2. **Pin the action version** — `@v3` floats to the latest minor/patch. For reproducibility, consider pinning to a specific version (e.g., `cloudflare/wrangler-action@v3.14.0`).

3. **`--if-present` on tests** — `npm run test --if-present` silently skips if no test script exists. If tests are required for deployment, remove `--if-present` so the pipeline fails when tests are missing.

4. **Secret names** — Ensure `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are set in your GitHub repo's **Settings → Secrets and variables → Actions**. The API token needs the "Edit Cloudflare Workers" template permission (or equivalent scoped permissions).

5. **Deploy command** — If you're not deploying a standard Worker (e.g., Pages, Pages Functions, or a Worker with custom commands), you may need to specify `command: deploy` explicitly or add pre/post deploy steps.

### What are you looking to do?

- Get this workflow **working / troubleshoot a failure**?
- **Improve or extend** it (e.g., add environments, previews on PRs, deploy Pages instead)?
- Understand **permissions or token scoping** for the API token?

Let me know and I can dig deeper into any of these.
- [Blog post](https://blog.cloudflare.com/workers-for-platforms/)
- [Docs](https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms)
- [Discord](https://discord.cloudflare.com/)

This is a **minimal Workers for Platforms** example that demonstrates the core concepts of dynamic dispatch. The platform allows users to create and upload custom Workers through a simple web interface, then access them via friendly URLs.

Workers for Platforms gives your customers the ability to build services and customizations (powered by Workers) while you retain full control over how their code is executed and billed. The **dynamic dispatch namespaces** feature makes this possible.

By creating a dispatch namespace and using the `dispatch_namespaces` binding in a regular fetch handler, you have a "dispatch Worker":

```javascript
export default {
  async fetch(request, env) {
    // "dispatcher" is a binding defined in wrangler.jsonc
    // "my-user-worker" is a script previously uploaded to the dispatch namespace
    const worker = env.dispatcher.get("my-user-worker");
    return await worker.fetch(request);
  }
}
```

This is the perfect way for a platform to create boilerplate functions, handle routing to "user Workers", and sanitize responses. You can manage thousands of Workers with a single Cloudflare Workers account!

## In this example

Users can upload Workers scripts through a simple web form. The platform uploads the script to a dispatch namespace and stores a name → Worker ID mapping in Workers KV. Users can then access their Workers via URLs like `/user-workers/my-worker`.

This minimal example focuses on the core Workers for Platforms concepts:
- Dynamic dispatch using the `dispatcher` binding
- Worker upload via the Cloudflare API
- Simple name-based routing using KV storage

## Key Features

- **Simple Worker Creation**: Web form for uploading Worker code
- **Dynamic Dispatch**: Route requests to user Workers by name
- **KV Storage**: Store friendly name mappings
- **No Dependencies**: Pure Workers runtime with minimal external dependencies

## Getting started

Your Cloudflare account needs access to Workers for Platforms.

1. Install the package and dependencies:

   ```
   npm install
   ```

2. Create an API token with Workers Scripts (Edit) permission:

   Visit [https://dash.cloudflare.com/?to=/:account/api-tokens](https://dash.cloudflare.com/?to=/:account/api-tokens) and create a new token with the "Workers Scripts (Edit)" permission.

3. Copy the `.env.test` file to `.env` and set the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets:

   ```sh
   cp .env.test .env
   ```

   Then edit the `.env` file with your actual values:

   ```sh
   CLOUDFLARE_ACCOUNT_ID = "your_actual_account_id"
   CLOUDFLARE_API_TOKEN = "your_actual_api_token"
   ```

   The `.env` file is already in `.gitignore` and will not be committed to git.

   Then run the following commands to add these secrets to your Worker in production:

   ```
   npx wrangler secret put CLOUDFLARE_API_TOKEN
   ```

   ```
   npx wrangler secret put CLOUDFLARE_ACCOUNT_ID
   ```

4. Create a KV namespace for Worker mappings:

   ```
   npx wrangler kv:namespace create "WORKER_MAPPINGS"
   ```

   Copy the namespace ID and preview ID into `wrangler.jsonc` under the `kv_namespaces` binding.

5. Create a dispatch namespace:

   ```
   npx wrangler dispatch-namespace create workers-for-platforms-example-project
   ```

6. Run the Worker in dev mode:
   ```
   npm run dev
   ```
   Or deploy to production:
   ```
   npm run deploy
   ```

Once the Worker is live, visit [localhost:8787](http://localhost:8787/) in a browser. You can create a new Worker via the "/upload" link. Access your Workers at `/user-workers/{name}`!

Then access it at: `http://localhost:8787/user-workers/my-worker`
