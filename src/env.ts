// Copyright (c) 2022 Cloudflare, Inc.
// Licensed under the APACHE LICENSE, VERSION 2.0 license found in the LICENSE file or at http://www.apache.org/licenses/LICENSE-2.0

import { WorkerArgs } from './types';

/*
 * Dispatch Namespace name -- needs to be same value as defined in wrangler.toml
 */
export const DISPATCH_NAMESPACE_NAME = 'workers-for-platforms-example-project';

/*
 * Available bindings -- defined in wrangler.toml
 */
export interface Env {
  dispatcher: Dispatcher;
  DB: object;
  DISPATCH_NAMESPACE_ACCOUNT_ID: string;
  DISPATCH_NAMESPACE_AUTH_EMAIL: string;
  DISPATCH_NAMESPACE_AUTH_KEY: string;
}

interface Dispatcher {
  /*
   * GET call on dispatcher
   * scriptName: name of the script
   * init: a request to init
   * getOptions: to set custom limits on the dispatch worker
   */
  get: (
    scriptName: string,
    args?: WorkerArgs,
    getOptions?: {
      limits?: { cpuMs?: number; memory?: number };
      outbound?: string;
    },
  ) => Worker;
}

interface Worker {
  fetch: (request: Request) => Promise<Response>;
}
