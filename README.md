# Workers for Platforms Example Project

- [Blog post](https://blog.cloudflare.com/workers-for-platforms/)
- [Docs](https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms)
- [Discord](https://discord.cloudflare.com/)

Minecraft continues to be one of the most popular sandbox games in the world because of its endless creativity and flexibility. Players can build massive structures, survive dangerous environments, explore hidden areas, and create completely unique adventures. One major reason why Minecraft remains popular after so many years is the ability to personalize gameplay.
https://minecraftjenny-mod.com/pt/br/
Character customization and gameplay enhancements allow players to make their Minecraft experience feel more immersive and enjoyable. Whether someone enjoys roleplay, creative building, exploration, or survival mode, customization can add variety and excitement to the game. https://sites.google.com/view/download-jenny-mod-apk/

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
