# Workers for Platforms Example Project

- [Blog post](https://blog.cloudflare.com/workers-for-platforms/)
- [Docs](https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms)
- [Discord](https://discord.cloudflare.com/)

For SaaS companies, it's challenging to keep up with the never ending requests for customizations. You want your development team to focus on building the core business instead of building and maintaining custom features for every customer use case. Workers for Platforms gives your customers the ability to build services and customizations (powered by Workers) while you retain full control over how their code is executed and billed. The **dynamic dispatch namespaces** feature makes this possible.

By creating a dispatch namespace and using the `dispatch_namespaces` binding in a regular fetch handler, you have a “dispatch Worker”:

```javascript
export default {
  async fetch(request, env) {
    // "dispatcher" is a binding defined in wrangler.toml
    // "customer-worker-1" is a script previously uploaded to the dispatch namespace
    const worker = env.dispatcher.get("customer-worker-1");
    return await worker.fetch(request);
  }
}
```

This is the perfect way for a platform to create boilerplate functions, handle routing to “user Workers”, and sanitize responses. You can manage thousands of Workers with a single Cloudflare Workers account!

## In this example

A customer of the platform can upload Workers scripts with a form, and the platform will upload it to a dispatch namespace. An eyeball can request a script by url, and the platform will dynamically fetch and run the script and return the response to the eyeball. For simplicity, this project is a single Worker that does everything: serve HTML, dispatch Workers, etc. In a real application, it would be ideal to split this Worker into several.

Scripts uploaded to the dispatch namespace are tagged using Script Tags. The dispatch namespace API supports filtering scripts by Script Tag which enables useful CRUD workflows. This platform adds `customer_id` as a script tag, making it possible to do script access control and query customers' scripts.

Customers of the platform are stored in [Workers D1](https://blog.cloudflare.com/introducing-d1/) (sqlite database) with tokens to authenticate specific API interactions. This is not a specific Workers for Platforms feature, but it shows how easy it is to build out functionality for platform management. Beyond authentication, notice how extra data does not need to be stored or managed for the Workers for Platforms workflow!

Customer scripts can also be configured with [custom limits](https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/platform/custom-limits/#custom-limits) and an [Outbound Worker](https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/reference/outbound-workers/#outbound-workers) to control execution. These details are also stored in D1.

Lastly, the default template for a customer worker looks like this:
```javascript
import { platformThing } from "./platform_module.mjs";
export default {
  async fetch(request, env, ctx) {
    return new Response("Hello! " + platformThing);
  }
};
```

Notice how this script imports a module it doesn't define. The platform defines it! If you check `src/resource.ts`, you can see that we inject a module to the bundle when a customer uploads their script:
```javascript
const platformModuleContent = 'const platformThing = "This module is provided by the platform"; export { platformThing };';
formData.append('platform_module', new File([platformModuleContent], 'platform_module.mjs', { type: 'application/javascript+module' }));
```
Since the platform has total control over how scripts are uploaded, it can provide or limit any functionality it needs. 

This project depends on:

- [G4brym/workers-qb](https://github.com/G4brym/workers-qb) for interacting with D1.
- [honojs/hono](https://github.com/honojs/hono) for request routing.

## Getting started

Your Cloudflare account needs access to Workers for Platforms and D1.

1. Install the package and dependencies:

   ```
   npm install
   ```

2. Create a D1 database and copy the ID into `wrangler.toml`. Make sure you update the `database_id` in wrangler.toml for your D1 binding afterwards:

   ```
   npx wrangler d1 create workers-for-platforms-example-project
   ```

3. Edit the `[vars]` in `wrangler.toml` and set the `DISPATCH_NAMESPACE_API_TOKEN` secret (instructions in `wrangler.toml`).
   For local development, you also have to create a `.dev.vars` file with the same environment variables:

   ```sh
   DISPATCH_NAMESPACE_ACCOUNT_ID = "replace_me"
   DISPATCH_NAMESPACE_API_TOKEN = "replace_me"
   ```

   > To create an API Token, go to Workers dashboard -> click "API Tokens" on right sidebar. Then either:
   > 1. Click "API Tokens" on the right sidebar.
   > 2. Click "Create Token". Make sure you give this token at least "Account : Workers Scripts : Edit". This token is used with `Bearer`.

4. Create a namespace. Replace `$(ACCOUNT)`, `$(API_TOKEN)`, and `$(NAMESPACE)`:
   ```
   npx wrangler dispatch-namespace create workers-for-platforms-example-project
   ```

5. Run the Worker in dev mode:
   ```
   npx wrangler dev --remote # local dev not currently supported
   ```
   Or deploy to production:
   ```
   npx wrangler deploy
   ```
   > Dev mode will still use the configured dispatch namespace. Take care you're not accidentally modifying production!

Once the Worker is live, visit [localhost:8787](http://localhost:8787/) in a browser and click the `Initialize` link. Have fun!

For dev testing, here's a snippet to use in a NodeJS environment (like Chrome Dev Tools) to exercise the API:

```javascript
await (await fetch("http://localhost:8787/script/my-customer-script", {
  "headers": {
    "X-Customer-Token": "d4e5f6"
  },
  "method": "PUT",
  "body": "...my-script-content..."
})).text();
```

Or using curl:

```
curl -X PUT http://localhost:8787/script/my-customer-script -H 'X-Customer-Token: d4e5f6' -d '...my-script-content...'
```

## Troubleshooting

- Use `npx wrangler tail` to capture logs.
- Try a re-publish and wait a minute.

## Example project roadmap

- Showcase a Trace Worker and Workers Logpush to collect trace events for both the platform Worker and dispatched customer Workers.
