# Workers for Platforms Example Project

- [Blog post](https://blog.cloudflare.com/workers-for-platforms/)
- [Docs](https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms)
- [Discord](https://discord.gg/Qgq5WNUy)

For SaaS companies, it's challenging to keep up with the never ending requests for customizations. You want your development team to focus on building the core business instead of building and maintaining custom features for every customer use case. Workers for Platforms gives your customers the ability to build services and customizations (powered by Workers) while you retain full control over how their code is executed and billed. The **dynamic dispatch namespaces** feature makes this possible.

By creating a dispatch namespace and using the `dispatch_namespaces` binding in a regular fetch handler, you have a “dispatch Worker”:

```
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request, env) {
  // "dispatcher" is a binding defined in wrangler.toml
  // "customer-worker-1" is a script previously uploaded to the dispatch namespace
  const worker = env.dispatcher.get("customer-worker-1");
  return await worker.fetch(request);
}
```

This is the perfect way for a platform to create boilerplate functions, handle routing to “user Workers”, and sanitize responses. You can manage thousands of Workers with a single Cloudflare Workers account!

## In this example

A customer of the platform can upload Workers scripts with a form, and the platform will upload it to a dispatch namespace. An eyeball can request a script by url, and the platform will dynamically fetch the script and return the response to the eyeball. For simplicity, this project is a single Worker that does everything: serve HTML, dispatch Workers, etc. In a real application, it would be ideal to split this Worker into several.

Scripts uploaded to the dispatch namespace are tagged using Script Tags. The dispatch namespace API supports filtering scripts by Script Tag which enables useful CRUD workflows. This platform adds `customer_id` as a script tag, making it possible to do script access control and query customers' scripts.

Customers of the platform are stored in [Workers D1](https://blog.cloudflare.com/introducing-d1/) (sqlite database) with tokens to authenticate specific API interactions. This is not a specific Workers for Platforms feature, but it shows how easy it is to build out functionality for platform management. Beyond authentication, notice how extra data does not need to be stored or managed for the Workers for Platforms workflow!

This project depends on:

- [G4brym/workers-qb](https://github.com/G4brym/workers-qb) for interacting with D1.
- [kwhitley/itty-router](https://github.com/kwhitley/itty-router) for request routing.

## Getting started

Your Cloudflare account needs access to Workers for Platforms. Please talk to your CSM to request access.

> As of 7 Sept 2022, you need to install wrangler@d1 to use the D1 binding: `npm install wrangler@d1`.

1. Install the package and dependencies:

   ```
   npm install
   ```

2. Create a D1 database and copy the ID into `wrangler.toml`:

   ```
   npx wrangler d1 create workers-for-platforms-example-project
   ```

3. Edit the `[vars]` in `wrangler.toml` and set the `DISPATCH_NAMESPACE_AUTH_KEY` secret (instructions in `wrangler.toml`).
   For local development, you also have to create a `.dev.vars` file with the same environment variables:

   ```
   DISPATCH_NAMESPACE_ACCOUNT_ID = "replace_me"
   DISPATCH_NAMESPACE_AUTH_EMAIL = "replace_me"
   DISPATCH_NAMESPACE_AUTH_KEY = "replace_me"
   ```

4. Create a namespace. Replace `$(ACCOUNT)`, `$(API_TOKEN)`, and `$(NAMESPACE)`:

   ```
   curl -X POST https://api.cloudflare.com/client/v4/accounts/$(ACCOUNT)/workers/dispatch/namespaces \
     -H 'Authorization: Bearer $(API_TOKEN)' \
     -H 'Content-Type: application/json' \
     -d '{"name": "$(NAMESPACE)"}'
   ```

   > You can use either `Authorization: Bearer <...>` or `X-Auth-Email` + `X-Auth-Key` headers for authentication.
   > Go to Workers dashboard -> click "API Tokens" on right sidebar. Then either:
   >
   > 1. Click "Create Token". This token is used with `Bearer`. OR:
   > 2. Click "View" next to "Global API Key". This token is the `X-Auth-Key`.

5. Run the Worker in dev local mode.
   ```
   npx wrangler dev --local
   ```
   Or publish:
   ```
   npx wrangler publish
   ```
   > As of 7 Sept 2022, dynamic dispatch does not work in wrangler dev mode. However, it will work when published. We will support this in the future.

Once the Worker is live, visit [localhost:8787](http://localhost:8787/) in a browser and click the `Initialize` link. Have fun!

If you change the name of the dispatch namespace in `wrangler.toml`, make sure to update it here, too:

```
// ./src/env.ts
export const DISPATCH_NAMESPACE_NAME = 'workers-for-platforms-example-project';
```

For dev testing, here's a snippet to use in a NodeJS environment (like Chrome Dev Tools) to exercise the API:

```
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
