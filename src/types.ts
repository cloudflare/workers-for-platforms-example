// Copyright (c) 2022 Cloudflare, Inc.
// Licensed under the APACHE LICENSE, VERSION 2.0 license found in the LICENSE file or at http://www.apache.org/licenses/LICENSE-2.0

export type ResourceValues = string | number | boolean | null;
export type ResourceRecord = Record<string, ResourceValues>;

/*
 * script_id: script that these limits are configured on.
 * cpuMs: optional limit on cpuMs.
 * memory: optional limit on memory.
 */
export interface DispatchLimits {
  script_id: string;
  cpuMs?: number;
  memory?: number;
}

/*
 * Interface to describe an OutboundWorker record in D1.
 * script_id: the id of the script that the outbound worker is being attached to.
 * outbound_script_id: the script we are attaching.
 */
export interface OutboundWorker {
  script_id: string;
  outbound_script_id: string;
}

export interface WorkerArgs {
  init?: RequestInit;
}

export interface Customer {
  id: string;
  name: string;
  plan_type: string;
}

export interface CustomerToken {
  customer_id: string;
  token: string;
}

export interface ApiScript extends ResourceRecord {
  id: string;
  modified_on: string;
  created_on: string;
}

export interface ApiScriptWithTags extends ApiScript {
  script_tags: string; // Just for rendering. Keep the state of script tags in dispatch namespace API
}
