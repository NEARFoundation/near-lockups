import {createClient} from 'near-ledger-js';
import TransportU2F from "@ledgerhq/hw-transport-webhid";

async function createLedgerU2FTransport() {
  let transport = await TransportU2F.create();
  transport.setScrambleKey("NEAR");
  return transport;
}

async function createLedgerU2FClient() {
  const transport = await createLedgerU2FTransport();
  return await createClient(transport);
}

export {createLedgerU2FClient};

