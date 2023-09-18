import { fromPromise, of } from "hyper-async";
import { __, applySpec, assoc, path, pick, pipe, prop, reduce } from "ramda";
import { z } from "zod";

const transactionSchema = z.object({
  owner: z.object({
    address: z.string(),
  }),
  tags: z.array(z.object({
    name: z.string(),
    value: z.string(),
  })),
});

/**
 * The result that is produced from this step
 * and added to ctx.
 *
 * This is used to parse the output to ensure the correct shape
 * is always added to context
 */
const srcSchema = z.object({
  owner: z.string(),
  src: z.any().refine((val) => !!val, {
    message: "contract source must be defined",
  }),
}).passthrough();

/**
 * @callback LoadTransactionMeta
 * @param {string} id - the id of the transaction
 * @returns {Async<z.infer<typeof transactionSchema>>}
 *
 * @callback LoadTransaction
 * @param {string} id - the id of the transaction
 * @returns {Async<Response>}
 *
 * @typedef Env
 * @property {LoadTransactionMeta} loadTransactionMeta
 * @property {LoadTransaction} loadTransactionData
 */

/**
 * @callback LoadSourceBuffer
 * @param {string} srcId
 * @returns {Async<ArrayBuffer>}
 *
 * @param {Env} env
 * @returns {LoadSourceBuffer}
 */
function getSourceBufferWith({ loadTransactionData }) {
  return (srcId) => {
    return loadTransactionData(srcId)
      .chain(fromPromise((res) => res.arrayBuffer()));
  };
}

/**
 * @callback LoadContractMeta
 * @param {string} id - the id of the contract whose src is being loaded
 * @returns {Async<string>}
 *
 * @param {Env} env
 * @returns {LoadContractMeta}
 */
function getContractMetaWith({ loadTransactionMeta, logger }) {
  return (id) => {
    return loadTransactionMeta(id)
      .map(transactionSchema.parse)
      .map(pick(["owner", "tags"]))
      .map(applySpec({
        srcId: pipe(
          prop("tags"),
          reduce((a, t) => assoc(t.name, t.value, a), {}),
          prop("Contract-Src"),
          z.string().min(
            1,
            { message: "Contract-Src tag was not present on the transaction" },
          ).parse,
          logger.tap("Found Contract-Src id: %s"),
        ),
        owner: path(["owner", "address"]),
      }));
  };
}

/**
 * @typedef Args
 * @property {string} id - the id of the contract
 *
 * @typedef Result
 * @property {string} id - the id of the contract
 * @property {ArrayBuffer} src - an array buffer that contains the Contract Wasm Src
 *
 * @callback LoadSource
 * @param {Args} args
 * @returns {Async<Result>}
 *
 * @param {Env} env
 * @returns {LoadSource}
 */
export function loadSourceWith(env) {
  const logger = env.logger.child("loadSource");
  env = { ...env, logger };

  const getContractMeta = getContractMetaWith(env);
  const getSourceBuffer = getSourceBufferWith(env);

  return (ctx) => {
    return of(ctx.id)
      .chain(getContractMeta)
      .chain(({ owner, srcId }) =>
        getSourceBuffer(srcId).map((src) => ({ ...ctx, src, owner }))
      )
      .map(srcSchema.parse)
      .map(logger.tap('Added "src" and "owner" to ctx'));
  };
}