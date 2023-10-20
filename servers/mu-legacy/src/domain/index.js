import config from '../config.js'

import createLogger from './lib/logger.js'

import pouchDbClient from './clients/pouchdb.js'

import cuClient from './clients/cu.js'
import sequencerClient from './clients/sequencer.js'

import { initMsgsWith, processMsgWith, crankMsgsWith, processSpawnWith } from './lib/main.js'

const logger = createLogger('@permaweb/ao/servers/mu')

const dbInstance = pouchDbClient.pouchDb('ao-cache')

const SEQUENCER_URL = config.sequencerUrl

export const initMsgs = initMsgsWith({
  selectNode: cuClient.selectNode,
  findLatestCacheTx: pouchDbClient.findLatestTxWith({ pouchDb: dbInstance }),
  cacheTx: pouchDbClient.saveTxWith({ pouchDb: dbInstance, logger }),
  findSequencerTx: sequencerClient.findTxWith({ SEQUENCER_URL }),
  writeSequencerTx: sequencerClient.writeInteractionWith({ SEQUENCER_URL }),
  fetchResult: cuClient.result,
  saveMsg: pouchDbClient.saveMsgWith({ pouchDb: dbInstance, logger }),
  saveSpawn: pouchDbClient.saveSpawnWith({ pouchDb: dbInstance, logger }),
  findLatestMsgs: pouchDbClient.findLatestMsgsWith({ pouchDb: dbInstance, logger }),
  findLatestSpawns: pouchDbClient.findLatestSpawnsWith({ pouchDb: dbInstance, logger }),
  logger
})

const processMsg = processMsgWith({
  selectNode: cuClient.selectNode,
  findLatestCacheTx: pouchDbClient.findLatestTxWith({ pouchDb: dbInstance }),
  cacheTx: pouchDbClient.saveTxWith({ pouchDb: dbInstance, logger }),
  findSequencerTx: sequencerClient.findTxWith({ SEQUENCER_URL }),
  writeSequencerTx: sequencerClient.writeInteractionWith({ SEQUENCER_URL }),
  buildAndSign: sequencerClient.buildAndSignWith(),
  fetchResult: cuClient.result,
  saveMsg: pouchDbClient.saveMsgWith({ pouchDb: dbInstance, logger }),
  saveSpawn: pouchDbClient.saveSpawnWith({ pouchDb: dbInstance, logger }),
  updateMsg: pouchDbClient.updateMsgWith({ pouchDb: dbInstance, logger }),
  findLatestMsgs: pouchDbClient.findLatestMsgsWith({ pouchDb: dbInstance, logger }),
  findLatestSpawns: pouchDbClient.findLatestSpawnsWith({ pouchDb: dbInstance, logger }),
  logger
})

const processSpawn = processSpawnWith({
  logger,
  writeContractTx: sequencerClient.writeContractTxWith({ SEQUENCER_URL })
})

export const crankMsgs = crankMsgsWith({
  processMsg,
  processSpawn,
  logger
})