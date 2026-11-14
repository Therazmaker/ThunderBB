import { query } from './_generated/server';

/** Todas las carpetas en plano; el cliente arma el árbol. */
export const list = query({
  args: {},
  handler: async (ctx) => ctx.db.query('folders').collect(),
});
