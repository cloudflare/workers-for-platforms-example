// Copyright (c) 2022 Cloudflare, Inc.
// Licensed under the APACHE LICENSE, VERSION 2.0 license found in the LICENSE file or at http://www.apache.org/licenses/LICENSE-2.0

import { Context, MiddlewareHandler } from 'hono';

import { D1QB } from 'workers-qb';

import { GetCustomerFromToken } from './db';
import { Env } from './env';
import { Customer } from './types';

const CUSTOMER_AUTH_HEADER_KEY = 'X-Customer-Token';

export const withDb: MiddlewareHandler<{
  Bindings: Env
  Variables: { db: D1QB }
}> = async (c, next) => {
  c.set("db", new D1QB(c.env.DB));
  await next();
};

export const withCustomer: MiddlewareHandler<{
  Bindings: Env
  Variables: {
    db: D1QB
    customer: Customer
  }
}> = async (c, next) => {
  const token = c.req.header(CUSTOMER_AUTH_HEADER_KEY);
  if (!token) {
    return c.text(`${CUSTOMER_AUTH_HEADER_KEY} header is not set`, 403);
  }
  try {
    const customer = await GetCustomerFromToken(c.var.db, token);
    c.set("customer", customer);
    await next();
  } catch (e) {
    return c.text(`Unauthorized ${CUSTOMER_AUTH_HEADER_KEY}`, 403);
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function handleDispatchError(c: Context, e: any): Response {
  console.log(e instanceof Error);
  if (e instanceof Error && e.message.startsWith('Worker not found')) {
    return c.text('Script does not exist', 404);
  }
  /*
   * This is a notable error that should be logged.
   */
  console.log(JSON.stringify(e, Object.getOwnPropertyNames(e)));
  return c.text('Could not connect to script', 500);
}
