// Copyright (c) 2022 Cloudflare, Inc.
// Licensed under the APACHE LICENSE, VERSION 2.0 license found in the LICENSE file or at http://www.apache.org/licenses/LICENSE-2.0

import { D1QB } from 'workers-qb';

import { GetCustomerFromToken } from './db';
import { Env } from './env';
import { HtmlPage } from './render';
import { IRequest } from './types';

const CUSTOMER_AUTH_HEADER_KEY = 'X-Customer-Token';

/*
 * This middleware adds the workers-qb DB accessor to the request.
 */
export function WithDB(request: IRequest, env: Env) {
  request.db = new D1QB(env.DB);
}

/*
 * This middleware authenticates there is a valid user token.
 * If it is, add the customer data to the request.
 * WARNING -- This is an example and should not be used for production!
 */
export async function WithCustomer(request: IRequest) {
  const token = request.headers.get(CUSTOMER_AUTH_HEADER_KEY);
  if (!token) {
    return ApiResponse(`${CUSTOMER_AUTH_HEADER_KEY} header is not set`, 403);
  }
  try {
    const customer = await GetCustomerFromToken(request.db, token);
    request.customer = customer;
  } catch (e) {
    return ApiResponse(`Unauthorized ${CUSTOMER_AUTH_HEADER_KEY}`, 403);
  }
}

export function ApiResponse(data: string, status = 200): Response {
  return new Response(data, { status: status });
}

export function JsonResponse(data: object | object[], status = 200): Response {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: { 'content-type': 'application/json' },
  });
}

export function HtmlResponse(body: string): Response {
  return new Response(HtmlPage(body), {
    headers: { 'content-type': 'text/html;charset=UTF-8' },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function handleDispatchError(e: any): Response {
  console.log(e instanceof Error);
  if (e instanceof Error && e.message.startsWith('Worker not found')) {
    return ApiResponse('Script does not exist', 404);
  }
  /*
   * This is a notable error that should be logged.
   */
  console.log(JSON.stringify(e, Object.getOwnPropertyNames(e)));
  return ApiResponse('Could not connect to script', 500);
}
