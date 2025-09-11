// Copyright (c) 2022 Cloudflare, Inc.
// Licensed under the APACHE LICENSE, VERSION 2.0 license found in the LICENSE file or at http://www.apache.org/licenses/LICENSE-2.0

import { Hono } from 'hono';

import { AddDispatchLimits, AddOutboundWorker, FetchTable, GetDispatchLimitFromScript, GetOutboundWorkerFromScript, Initialize } from './db';
import type { Env } from './env';
import {
  GetScriptsByTags,
  DeleteScriptInDispatchNamespace,
  GetScriptsInDispatchNamespace,
  PutScriptInDispatchNamespace,
  PutTagsOnScript,
  GetTagsOnScript,
} from './resource';
import { handleDispatchError, withCustomer, withDb } from './router';
import { renderPage, BuildTable, UploadPage } from './render';
import { DispatchLimits, OutboundWorker, WorkerArgs } from './types';

const app = new Hono<{ Bindings: Env }>();

app.get('/favicon.cio', () => {
  return new Response();
});

/*
 * Dumps the state of the app
 */
app.get('/', withDb, async (c) => {
  let body = `
    <hr class="solid"><br/>
    <div>
      <form style="display: inline" action="/init"><input type="submit" value="Initialize" /></form>
      <small> - Resets db and dispatch namespace to initial state</small>
    </div>
    <h2>DB Tables</h2>`;

  /*
    * DB data
    */
  try {
    body += [
      BuildTable('customers', await FetchTable(c.var.db, 'customers')),
      BuildTable('customer_tokens', await FetchTable(c.var.db, 'customer_tokens')),
    ].join('');
  } catch (e) {
    body += '<div>No DB data. Do you need to <a href="/init">initialize</a>?</div>';
  }

  /*
    * Dispatch Namespace data
    */
  try {
    const scripts = await GetScriptsInDispatchNamespace(c.env);
    body += '</br><h2>Dispatch Namespace</h2>';
    body += BuildTable(c.env.DISPATCH_NAMESPACE_NAME, scripts);
  } catch (e) {
    console.log(JSON.stringify(e, Object.getOwnPropertyNames(e)));
    body += `<div>Dispatch namespace "${c.env.DISPATCH_NAMESPACE_NAME}" was not found.</div>`;
  }

  return c.html(renderPage(body));
});

/*
 * Initialize example data
 */
app.get('/init', withDb, async (c) => {
  const scripts = await GetScriptsInDispatchNamespace(c.env);
  await Promise.all(scripts.map(async (script) => DeleteScriptInDispatchNamespace(c.env, script.id)));
  await Initialize(c.var.db);
  return Response.redirect(c.req.url.replace('/init', ''));
});


/*
 * Where a customer can upload a script
 */ 
app.get('/upload', (c) => {
  return c.html(renderPage(UploadPage));
});

/*
 * Gets scripts for a customer
 */ 
app.get('/script', withDb, withCustomer, async (c) => {
  const scripts = await GetScriptsByTags(c.env, [{ tag: c.var.customer.id, allow: true }]);
  return c.json(scripts);
});

/*
 * Gets scripts for a customer
 */ 
app.get('/dispatch/:name', withDb, async (c) => {
  try {
    // TODO: doesn't work with wrangler local yet

    /*
      * look up the worker within our namespace binding.
      * Also look up any custom config tied to this script + outbound workers on this script
      * to attach to the GET call.
      *
      * this is a lazy operation. if the worker does not exist in our namespace,
      * no error will be returned until we actually try to `.fetch()` against it.
      */
    const scriptName = c.req.param('name');
    const dispatchLimits = (await GetDispatchLimitFromScript(c.var.db, scriptName)).results as unknown as DispatchLimits;
    const outboundWorker = (await GetOutboundWorkerFromScript(c.var.db, scriptName)).results as unknown as OutboundWorker;
    const workerArgs: WorkerArgs = {};
    const worker = c.env.dispatcher.get(scriptName, workerArgs, { limits: dispatchLimits, outbound: outboundWorker?.outbound_script_id });
    /*
      * call `.fetch()` on the retrieved worker to invoke it with the request.
      *
      * either `await` or `.catch()` must be used here to return a different
      * response for the 'worker not found' exception.
      */
    return await worker.fetch(c.req.raw);
  } catch (e: unknown) {
    return handleDispatchError(c, e);
  }
});

/*
 *  Uploads a customer script 
 */
app.put('/script/:name', withDb, withCustomer, async (c) => {
  const scriptName = c.req.param('name');

  /*
    * It would be ideal to lock this block of code based on scriptName to avoid race conditions.
    * Maybe with a Durable Object?
    * https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
    */

  /*
    * Check if script name exists and is owned by customer.
    * If exists and not owned, deny request.
    * If exists and owned, the request is good and means the script is being updated.
    * If not exists, it's the customer's to claim.
    */
  try {
    const tags = await GetTagsOnScript(c.env, scriptName);
    if (tags.length > 0 && !tags.includes(c.var.customer.id)) {
      return c.text('Script name already reserved', 409);
    }
  } catch (e) {
    return c.text('Could not complete request', 500);
  }

  /*
    * Get script content and limits from request.
    */
  let scriptContent: string;
  let limits: DispatchLimits;
  let outbound: OutboundWorker;
  try {
    const data: {
      script: string;
      dispatch_config: {
        limits?: { cpuMs: number; memory: number };
        outbound: string;
      };
    } = (await c.req.json()) as {
      script: string;
      dispatch_config: {
        limits?: { cpuMs: number; memory: number };
        outbound: string;
      };
    };

    scriptContent = data.script;
    limits = { script_id: scriptName, ...data.dispatch_config.limits };
    outbound = { script_id: scriptName, outbound_script_id: data.dispatch_config.outbound };
  } catch (e) {
    return c.text('Expected json: { script: string, dispatch_config: { limits?: { cpuMs: number, memory: number }, outbound: string }}', 400);
  }

  /*
    * Upload the script to the dispatch namespace.
    * On error, forward the response from the dispatch namespace API
    * since it gives necessary feedback to the customer.
    */
  const scriptResponse = await PutScriptInDispatchNamespace(c.env, scriptName, scriptContent);
  if (!scriptResponse.ok) {
    return c.json(await scriptResponse.json(), 400)
  }

  /*
    * Persist the dispatch limits (if any) in d1 with the scriptName as primary key
    */
  if (limits.cpuMs || limits.memory) await AddDispatchLimits(c.var.db, limits);

  /*
    * Persist the outbound worker in d1 with scriptName as primary key
    * In practice you will need to add more params with the outbound worker, refer
    * to our documentation here: https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/platform/outbound-workers/
    */
  if (outbound?.outbound_script_id !== '') {
    await AddOutboundWorker(c.var.db, outbound);
  }

  /*
    * Add customer_id and plan_type as script tags.
    * If that errors, something is wrong so log it!
    * Could add logic to delete script if that's immediately problematic.
    */
  const tagsResponse = await PutTagsOnScript(c.env, scriptName, [c.var.customer.id, c.var.customer.plan_type]);
  if (!tagsResponse.ok) {
    console.log(tagsResponse.url, tagsResponse.status, await tagsResponse.text());
  }

  return c.text('Success', 201);
});

export default app;