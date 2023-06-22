// Copyright (c) 2022 Cloudflare, Inc.
// Licensed under the APACHE LICENSE, VERSION 2.0 license found in the LICENSE file or at http://www.apache.org/licenses/LICENSE-2.0

import { D1QB, FetchTypes } from 'workers-qb';
import { Customer, CustomerToken, ResourceRecord, DispatchLimits, OutboundWorker } from './types';
import { ResultOne } from 'workers-qb/dist/types/interfaces';

export async function Initialize(db: D1QB) {
  const tables: { name: string; schema: string }[] = [
    {
      name: 'customers',
      schema: 'id TEXT PRIMARY KEY, name TEXT NOT NULL, plan_type TEXT NOT NULL',
    },
    {
      name: 'customer_tokens',
      schema: 'token TEXT PRIMARY KEY, customer_id TEXT NOT NULL',
    },
    {
      name: 'dispatch_limits',
      schema: 'script_id TEXT PRIMARY KEY, cpuMs INTEGER, memory INTEGER',
    },
    {
      name: 'outbound_workers',
      schema: 'script_id TEXT PRIMARY KEY, outbound_script_id TEXT NOT NULL',
    },
  ];

  for (const table of tables) {
    await db.dropTable({
      tableName: table.name,
      ifExists: true,
    });
  }
  for (const table of tables) {
    await db.createTable({
      tableName: table.name,
      schema: table.schema,
      ifNotExists: true,
    });
  }

  await AddCustomer(db, {
    id: '559968cd-b048-4bbc-ba21-d12625fcee45',
    name: 'Customer 1',
    plan_type: 'basic',
  });

  await AddCustomer(db, {
    id: '2612b586-4799-42ff-8c44-d4841e1e70ed',
    name: 'Customer 2',
    plan_type: 'advanced',
  });

  await AddCustomerToken(db, {
    token: 'a1b2c3',
    customer_id: '559968cd-b048-4bbc-ba21-d12625fcee45',
  });

  await AddCustomerToken(db, {
    token: 'd4e5f6',
    customer_id: '2612b586-4799-42ff-8c44-d4841e1e70ed',
  });
}

export async function AddCustomer(db: D1QB, customer: Customer) {
  return db.insert({
    tableName: 'customers',
    data: customer as unknown as Record<string, string>,
  });
}

export async function AddCustomerToken(db: D1QB, token: CustomerToken) {
  return db.insert({
    tableName: 'customer_tokens',
    data: token as unknown as Record<string, string>,
  });
}

export async function FetchTable(db: D1QB, table: string): Promise<ResourceRecord[] | undefined> {
  return (
    await db.fetchAll({
      tableName: table,
      fields: '*',
    })
  ).results;
}

export async function GetCustomerFromToken(db: D1QB, token: string): Promise<Customer> {
  return (await db.execute({
    query: `
      SELECT
        customers.id,
        customers.name,
        customers.plan_type
      FROM
        customer_tokens
      JOIN customers ON
        customers.id = customer_tokens.customer_id
      WHERE
        customer_tokens.token IS ?
    `,
    arguments: [token],
    fetchType: FetchTypes.ONE,
  })) as Customer;
}

export async function AddDispatchLimits(db: D1QB, dispatchLimits: DispatchLimits) {
  return db.insert({
    tableName: 'dispatch_limits',
    data: dispatchLimits as unknown as Record<string, string>,
  });
}

export async function GetDispatchLimitFromScript(db: D1QB, scriptName: string): Promise<ResultOne> {
  return await db.fetchOne({
    tableName: 'dispatch_limits',
    fields: '*',
    where: {
      conditions: 'dispatch_limits.script_id IS ?',
      params: [scriptName],
    },
  });
}

export async function AddOutboundWorker(db: D1QB, outboundWorker: OutboundWorker) {
  return db.insert({
    tableName: 'outbound_workers',
    data: outboundWorker as unknown as Record<string, string>,
  });
}

export async function GetOutboundWorkerFromScript(db: D1QB, scriptName: string): Promise<ResultOne> {
  return await db.fetchOne({
    tableName: 'outbound_workers',
    fields: '*',
    where: {
      conditions: 'outbound_workers.script_id IS ?',
      params: [scriptName],
    },
  });
}
