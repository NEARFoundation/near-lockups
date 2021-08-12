import React from "react";

export const yoktoNear = 1000000000000000000000000;
import sha256 from 'js-sha256';
import BN from 'bn.js';
import NumberFormat from "react-number-format";
import * as nearApi from "near-api-js";
import getConfig from "../config";
import {encode, decode} from 'bs58';


const nearConfig = getConfig(process.env.NODE_ENV || 'development')
const provider = new nearApi.providers.JsonRpcProvider(nearConfig.nodeUrl);
const connection = new nearApi.Connection(nearConfig.networkId, provider, {});


export const numberFormatted = (props) => {
  const {inputRef, onChange, ...other} = props;

  return (
    <NumberFormat
      {...other}
      getInputRef={inputRef}
      onValueChange={values => {
        onChange({
          target: {
            name: props.name,
            value: values.value
          }
        });
      }}
      thousandSeparator
    />
  );
}

export const truncate = (str, n) => {
  return (str.length > n) ? str.substr(0, n - 1) + '...' : str;
}


export const accountToLockup = (masterAccountId, accountId) => {
  return `${sha256(Buffer.from(accountId)).toString('hex').slice(0, 40)}.${masterAccountId}`;
}


export const timestampToReadable = (timestamp) => {
  let seconds = Number(timestamp / 1e9);
  let y = Math.floor(seconds / 31536000);
  let m = Math.floor((seconds % 31536000) / 2628000);
  let d = Math.floor((seconds % 2628000) / (3600 * 24));

  let yDisplay = y > 0 ? y + (y === 1 ? " year, " : " years, ") : "";
  let mDisplay = m > 0 ? m + (m === 1 ? " month, " : " months, ") : "";
  let dDisplay = d > 0 ? d + (d === 1 ? " day, " : " days, ") : "";
  return (yDisplay + mDisplay + dDisplay).replace(/,\s*$/, "");

}

export const convertDuration = (duration) => {
  let utcSeconds = duration / 1e9;
  let epoch = new Date(0);
  epoch.setUTCSeconds(utcSeconds);
  return epoch;
}

export const yoktoToNear = (amount) => {
  return nearApi.utils.format.formatNearAmount(amount, 2);
}


function readOption(reader, f) {
  let x = reader.readU8();
  if (x === 1) {
    return f();
  }
  return null;
}


async function viewLockupState(connection, contractId) {
  const result = await connection.provider.sendJsonRpc("query", {
    request_type: "view_state",
    finality: "final",
    account_id: contractId,
    prefix_base64: "U1RBVEU=",
  });
  let value = Buffer.from(result.values[0].value, 'base64');
  let reader = new nearApi.utils.serialize.BinaryReader(value);
  let owner = reader.readString();
  let lockupAmount = reader.readU128().toString();
  let terminationWithdrawnTokens = reader.readU128().toString();
  let lockupDuration = reader.readU64().toString();
  let releaseDuration = readOption(reader, () => reader.readU64().toString(), "0");
  let lockupTimestamp = readOption(reader, () => reader.readU64().toString(), "0");
  let tiType = reader.readU8();
  let transferInformation;
  if (tiType === 0) {
    transferInformation = {
      transfers_timestamp: reader.readU64()
    };
  } else {
    transferInformation = {
      transfer_poll_account_id: reader.readString()
    };
  }
  let vestingType = reader.readU8();
  let vestingInformation;
  switch (vestingType) {
    case 1:
      vestingInformation = {vestingHash: reader.readArray(() => reader.readU8())};
      break;
    case 2:
      let start = reader.readU64();
      let cliff = reader.readU64();
      let end = reader.readU64();
      vestingInformation = {start, cliff, end};
      break;
    case 3:
      let unvestedAmount = reader.readU128();
      let terminationStatus = reader.readU8();
      vestingInformation = {unvestedAmount, terminationStatus};
      break;
    default:
      vestingInformation = null;
      break;
  }

  return {
    owner,
    lockupAmount: new BN(lockupAmount),
    terminationWithdrawnTokens: new BN(terminationWithdrawnTokens),
    lockupDuration: new BN(lockupDuration),
    releaseDuration: new BN(releaseDuration),
    lockupTimestamp: new BN(lockupTimestamp),
    transferInformation,
    vestingInformation,
  }
}

export const dateToNs = (dateObj) => {
  if (!(dateObj instanceof Date) && typeof dateObj !== 'number') {
    throw new Error(`Must be Date or number, got ${typeof dateObj}: ${dateObj}`);
  }
  if (dateObj instanceof Date) {
    dateObj = dateObj.getTime();
  }
  // Time from getTime is in millis, we need nanos - multiple by 1M.
  return (dateObj * 1000000).toString();
}

export const epochToHumanReadable = (epoch) => {
  let epochDate = new Date(epoch / 1000000);
  return epochDate.toUTCString();
}


export function computeVestingHash(authToken, public_key, vesting_start, vesting_end, vesting_cliff) {
  const vestingSchedule = {
    vesting_start: dateToNs(vesting_start),
    vesting_end: dateToNs(vesting_end),
    vesting_cliff: dateToNs(vesting_cliff)
  };
  const salt = Buffer.from(sha256(Buffer.from(authToken + public_key)), 'hex');
  let writer = new nearApi.utils.serialize.BinaryWriter();
  writer.write_u64(vestingSchedule.vesting_start);
  writer.write_u64(vestingSchedule.vesting_cliff);
  writer.write_u64(vestingSchedule.vesting_end);
  writer.write_u32(salt.length);
  writer.write_buffer(salt);
  const bytes = writer.toArray();
  const vestingHash = Buffer.from(sha256(bytes), 'hex').toString('base64');
  console.log('Vesting hash: ', vestingHash, authToken + public_key, vesting_start, vesting_end, vesting_cliff, salt.toString('base64'), vestingSchedule);
  return vestingHash;
}

function prepareAccountId(data) {
  if (data.toLowerCase().endsWith("." + nearConfig.masterAccount)) {
    return data.replace('@', '').replace('https://wallet.near.org/send-money/', '').toLowerCase();
  }
  if (data.length === 64 && !data.startsWith('ed25519:')) {
    return data;
  }
  let publicKey;
  if (data.startsWith('NEAR')) {
    publicKey = decode(data.slice(4)).slice(0, -4);
  } else {
    publicKey = decode(data.replace('ed25519:', ''));
  }

  return publicKey.toString('hex');
}


async function lookupLockup(near, accountId) {
    const lockupAccountId = accountToLockup(nearConfig.lockupAccount, accountId);
    console.log(lockupAccountId);
    try {
        const lockupAccount = await near.account(lockupAccountId);
        const lockupAccountBalance = await lockupAccount.viewFunction(lockupAccountId, 'get_balance', {});
        const lockupState = await viewLockupState(near.connection, lockupAccountId);
        // More details: https://github.com/near/core-contracts/pull/136
        lockupState.hasBrokenTimestamp = [
            '3kVY9qcVRoW3B5498SMX6R3rtSLiCdmBzKs7zcnzDJ7Q',
            'DiC9bKCqUHqoYqUXovAnqugiuntHWnM3cAc7KrgaHTu'
        ].includes((await lockupAccount.state()).code_hash);
        return { lockupAccountId, lockupAccountBalance, lockupState };
    } catch (error) {
        console.warn(error);
        return { lockupAccountId: `${lockupAccountId} doesn't exist`, lockupAmount: 0 };
    }
}

const options = {
  nodeUrl: nearConfig.nodeUrl,
  networkId: nearConfig.networkId,
  deps: {}
};


function getStartLockupTimestamp(lockupState) {
  const phase2Time = new BN("1602614338293769340");
  let lockupTimestamp = BN.max(
    phase2Time.add(lockupState.lockupDuration),
    lockupState.lockupTimestamp
  );
  return lockupState.hasBrokenTimestamp ? phase2Time : lockupTimestamp;
}

const saturatingSub = (a, b) => {
  let res = a.sub(b);
  return res.gte(new BN(0)) ? res : new BN(0);
};

// https://github.com/near/core-contracts/blob/master/lockup/src/getters.rs#L64
async function getLockedTokenAmount(lockupState) {
  const phase2Time = new BN("1602614338293769340");
  let now = new BN((new Date().getTime() * 1000000).toString());
  if (now.lte(phase2Time)) {
    return saturatingSub(
      lockupState.lockupAmount,
      lockupState.terminationWithdrawnTokens
    );
  }

  let lockupTimestamp = BN.max(
    phase2Time.add(lockupState.lockupDuration),
    lockupState.lockupTimestamp
  );
  let blockTimestamp = now;
  if (blockTimestamp.lt(lockupTimestamp)) {
    return saturatingSub(
      lockupState.lockupAmount,
      lockupState.terminationWithdrawnTokens
    );
  }

  let unreleasedAmount;
  if (lockupState.releaseDuration) {
    let startTimestamp = getStartLockupTimestamp(lockupState);
    let endTimestamp = startTimestamp.add(lockupState.releaseDuration);
    if (endTimestamp.lt(blockTimestamp)) {
      unreleasedAmount = new BN(0);
    } else {
      let timeLeft = endTimestamp.sub(blockTimestamp);
      unreleasedAmount = lockupState.lockupAmount
        .mul(timeLeft)
        .div(lockupState.releaseDuration);
    }
  } else {
    unreleasedAmount = new BN(0);
  }

  let unvestedAmount;
  if (lockupState.vestingInformation) {
    if (lockupState.vestingInformation.unvestedAmount) {
      // was terminated
      unvestedAmount = lockupState.vestingInformation.unvestedAmount;
    } else if (lockupState.vestingInformation.start) {
      // we have schedule
      if (blockTimestamp.lt(lockupState.vestingInformation.cliff)) {
        unvestedAmount = lockupState.lockupAmount;
      } else if (blockTimestamp.gte(lockupState.vestingInformation.end)) {
        unvestedAmount = new BN(0);
      } else {
        let timeLeft = lockupState.vestingInformation.end.sub(blockTimestamp);
        let totalTime = lockupState.vestingInformation.end.sub(
          lockupState.vestingInformation.start
        );
        unvestedAmount = lockupState.lockupAmount.mul(timeLeft).div(totalTime);
      }
    }
  }
  if (unvestedAmount === undefined) {
    unvestedAmount = new BN(0);
  }

  return BN.max(
    saturatingSub(unreleasedAmount, lockupState.terminationWithdrawnTokens),
    unvestedAmount
  );
}

export async function viewLookupNew(inputAccountId) {

  const near = await nearApi.connect(options);
  let accountId = prepareAccountId(inputAccountId);

  let lockupAccountId = '', lockupAccountBalance = 0, ownerAccountBalance = 0, lockupReleaseStartTimestamp = new BN(0),
    lockupState = {}, lockedAmount = 0;
  try {
    let account = await near.account(accountId);
    let state = await account.state();
    ownerAccountBalance = state.amount;
    ({lockupAccountId, lockupAccountBalance, lockupState} = await lookupLockup(near, accountId));
    if (lockupState) {
      lockupReleaseStartTimestamp = getStartLockupTimestamp(lockupState);
      lockedAmount = await getLockedTokenAmount(lockupState);
      lockupState.releaseDuration = lockupState.releaseDuration.div(new BN("1000000000"))
        .divn(60)
        .divn(60)
        .divn(24)
        .toString(10);
      //lockupState.vestingInformation = formatVestingInfo(lockupState.vestingInformation);
    }
  } catch (error) {
    console.error(error);
  }
  console.log(lockupState);

  let result = {}

  result.lockupAmount = lockupState.lockupAmount;
  result.owner = lockupState.owner;
  result.vestingInformation = lockupState.vestingInformation;
  result.releaseDuration = lockupState.releaseDuration;
  result.ownerAccountBalance = nearApi.utils.format.formatNearAmount(ownerAccountBalance, 2);
  result.lockedAmount = nearApi.utils.format.formatNearAmount(lockedAmount.toString(), 2);
  result.liquidAmount = nearApi.utils.format.formatNearAmount(new BN(lockupAccountBalance).sub(new BN(lockedAmount)).toString(), 2);
  result.totalAmount = nearApi.utils.format.formatNearAmount(new BN(ownerAccountBalance).add(new BN(lockupAccountBalance)).toString(), 2);
  result.lockupReleaseStartDate = new Date(lockupReleaseStartTimestamp.divn(1000000).toNumber());
  return result;
}
