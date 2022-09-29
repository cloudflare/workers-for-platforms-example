// Copyright (c) 2022 Cloudflare, Inc.
// Licensed under the APACHE LICENSE, VERSION 2.0 license found in the LICENSE file or at http://www.apache.org/licenses/LICENSE-2.0

import { DISPATCH_NAMESPACE_NAME, Env } from './env';
import { ApiScript, ApiScriptWithTags } from './types';

const BaseURI = (env: Env) => `https://api.cloudflare.com/client/v4/accounts/${env.DISPATCH_NAMESPACE_ACCOUNT_ID}/workers`;
const ScriptsURI = (env: Env) => `${BaseURI(env)}/dispatch/namespaces/${DISPATCH_NAMESPACE_NAME}/scripts`;
const MakeHeaders = (env: Env) => ({
  'X-Auth-Email': env.DISPATCH_NAMESPACE_AUTH_EMAIL,
  'X-Auth-Key': env.DISPATCH_NAMESPACE_AUTH_KEY,
});

export async function GetScriptsInDispatchNamespace(env: Env): Promise<ApiScript[]> {
  const data = (await (
    await fetch(ScriptsURI(env), {
      method: 'GET',
      headers: MakeHeaders(env),
    })
  ).json()) as { result: ApiScript[] };
  return Promise.all(
    data.result.map(
      async (result): Promise<ApiScriptWithTags> => ({
        id: result.id,
        modified_on: result.modified_on,
        created_on: result.created_on,
        // TODO: Script tags will be available in "/dispatch/namespaces/<NAMESPACE_NAME>/scripts" endpoint.
        //       For now, have to do extra api call and make this map async.
        script_tags: (await GetTagsOnScript(env, result.id as string)).join(', '),
      }),
    ),
  );
}

export async function GetScriptsByTags(env: Env, tags: { tag: string; allow: boolean }[]): Promise<ApiScript[]> {
  const uriTags = tags.map((tag) => `${tag.tag}:${tag.allow ? 'yes' : 'no'}`).join(',');
  const data = (await (
    await fetch(`${ScriptsURI(env)}?tags=${uriTags}`, {
      method: 'GET',
      headers: MakeHeaders(env),
    })
  ).json()) as { result: ApiScript[] };
  return data.result;
}

export async function GetTagsOnScript(env: Env, scriptName: string): Promise<string[]> {
  const response = await fetch(`${ScriptsURI(env)}/${scriptName}/tags`, {
    method: 'GET',
    headers: MakeHeaders(env),
  });
  /*
   * Script not found (404) is ok since it means it has not been uploaded yet
   */
  if (response.status !== 404 && !response.ok) {
    console.log(response.url, response.status, await response.text());
    throw new Error();
  }
  const data = (await response.json()) as { result: string[] | null };
  return data.result ?? [];
}

export async function PutScriptInDispatchNamespace(env: Env, scriptName: string, scriptContent: string): Promise<Response> {
  const scriptFileName = `${scriptName}.mjs`;
  const metadata = {
    'main_module': scriptFileName  
  };
  const formData = new FormData();
  formData.append('script', new File([scriptContent], scriptFileName, { type: 'application/javascript+module'}));
  const helloModuleContent = 'const hello = "Hello World!"; export { hello };';
  formData.append('hello_module', new File([helloModuleContent], 'hello_module.mjs', { type: 'application/javascript+module'}));
  formData.append('metadata', new File([JSON.stringify(metadata)], 'metadata.json', { type: 'application/json'}));
  return await fetch(`${ScriptsURI(env)}/${scriptName}`, {
    method: 'PUT',
    body: formData,
    headers: {
      ...MakeHeaders(env)
    },
  });
}

export async function DeleteScriptInDispatchNamespace(env: Env, scriptName: string): Promise<Response> {
  return await fetch(`${ScriptsURI(env)}/${scriptName}`, {
    method: 'DELETE',
    headers: MakeHeaders(env),
  });
}

export async function PutTagsOnScript(env: Env, scriptName: string, tags: string[]): Promise<Response> {
  return await fetch(`${ScriptsURI(env)}/${scriptName}/tags`, {
    method: 'PUT',
    body: JSON.stringify(tags),
    headers: {
      'Content-Type': 'application/json',
      ...MakeHeaders(env),
    },
  });
}
