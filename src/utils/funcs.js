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


export async function viewLockupState(connection, contractId) {
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
  let releaseDuration = readOption(reader, () => reader.readU64().toString());
  let lockupTimestamp = readOption(reader, () => reader.readU64().toString());
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
  let vestingInformation = null;
  if (vestingType === 1) {
    vestingInformation = {VestingHash: reader.readArray(() => reader.readU8())};
  } else if (vestingType === 2) {
    let vestingStart = reader.readU64().toString();
    let vestingCliff = reader.readU64().toString();
    let vestingEnd = reader.readU64().toString();
    vestingInformation = {vestingStart, vestingCliff, vestingEnd};
  } else if (vestingType === 3) {
    vestingInformation = 'TODO';
  }

  return {
    owner,
    lockupAmount,
    terminationWithdrawnTokens,
    lockupDuration,
    releaseDuration,
    lockupTimestamp,
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
  try {
    const lockupAccount = await near.account(lockupAccountId);
    const lockupAccountBalance = await lockupAccount.viewFunction(lockupAccountId, 'get_balance', {});
    const lockupState = await viewLockupState(near.connection, lockupAccountId);
    lockupState.hasBrokenTimestamp = (await lockupAccount.state()).code_hash === '3kVY9qcVRoW3B5498SMX6R3rtSLiCdmBzKs7zcnzDJ7Q';
    return {lockupAccountId, lockupAccountBalance, lockupState};
  } catch (error) {
    console.error(error);
    return {lockupAccountId: `${lockupAccountId} doesn't exist`, lockupAmount: 0};
  }
}


const options = {
  nodeUrl: nearConfig.nodeUrl,
  networkId: nearConfig.networkId,
  deps: {}
};

export async function viewLookupNew(inputAccountId) {
  const near = await nearApi.connect(options);
  let accountId = prepareAccountId(inputAccountId);

  let lockupAccountId = '', lockupAccountBalance = 0, ownerAccountBalance = 0, lockupReleaseStartTimestamp,
    lockupState = {}, lockedAmount = 0, timeLeft = 0;
  let phase2Timestamp = new BN("1602614338293769340");
  let phase2 = new Date(phase2Timestamp.divn(1000000).toNumber());
  try {
    let account = await near.account(accountId);
    let state = await account.state();

    ownerAccountBalance = state.amount;

    ({lockupAccountId, lockupAccountBalance, lockupState} = await lookupLockup(near, accountId));

    if (lockupAccountBalance !== 0) {
      lockupReleaseStartTimestamp = BN.max(
        phase2Timestamp.add(new BN(lockupState.lockupDuration)),
        new BN(lockupState.lockupTimestamp ? lockupState.lockupTimestamp : 0),
      );
      const duration = lockupState.releaseDuration ? new BN(lockupState.releaseDuration) : new BN(0);
      const now = new BN((new Date().getTime() * 1000000).toString());

      const endTimestamp = (lockupState.hasBrokenTimestamp ? phase2Timestamp : lockupReleaseStartTimestamp).add(duration);
      const timeLeft = endTimestamp.sub(now);
      const releaseComplete = timeLeft.lten(0);

      lockupState.releaseDuration = lockupState.releaseDuration ? duration
          .div(new BN("1000000000"))
          .divn(60)
          .divn(60)
          .divn(24)
          .toString(10)
        : null;

      if (lockupState.lockupDuration) {
        lockupState.lockupDuration = parseInt(lockupState.lockupDuration) / 1000000000 / 60 / 60 / 24;
      } else {
        lockupState.lockupDuration = null;
      }

      const vestingInformation = {...lockupState.vestingInformation};
      let unvestedAmount = new BN(0);

      if (lockupState.vestingInformation) {
        if (lockupState.vestingInformation.VestingHash) {
          lockupState.vestingInformation = `Hash: ${Buffer.from(lockupState.vestingInformation.VestingHash).toString('base64')}`;
        } else if (lockupState.vestingInformation.vestingStart) {
          let vestingStart = new Date(
            lockupState.vestingInformation.vestingStart
              .divn(1000000)
              .toNumber()
          );
          if (vestingStart > phase2) {
            const vestingCliff = new Date(
              lockupState.vestingInformation.vestingCliff
                .divn(1000000)
                .toNumber()
            );
            const vestingEnd = new Date(
              lockupState.vestingInformation.vestingEnd
                .divn(1000000)
                .toNumber()
            );
            lockupState.vestingInformation = `from ${vestingStart} until ${vestingEnd} with cliff at ${vestingCliff}`;
            if (now.lt(vestingInformation.vestingCliff)) {
              unvestedAmount = new BN(lockupState.lockupAmount);
            } else if (now.gte(vestingInformation.vestingEnd)) {
              unvestedAmount = new BN(0);
            } else {
              const vestingTimeLeft = vestingInformation.vestingEnd.sub(now);
              const vestingTotalTime = vestingInformation.vestingEnd.sub(vestingInformation.vestingStart);
              unvestedAmount = new BN(lockupState.lockupAmount).mul(vestingTimeLeft).div(vestingTotalTime);
            }
          } else {
            lockupState.vestingInformation = null;
          }
        }
      }

      if (lockupReleaseStartTimestamp.lte(new BN(now.toString()))) {
        if (releaseComplete) {
          lockedAmount = new BN(0);
        } else {
          if (lockupState.releaseDuration) {
            lockedAmount = (new BN(lockupState.lockupAmount)
                .mul(timeLeft)
                .div(duration)
            );
            lockedAmount = BN.max(
              lockedAmount.sub(new BN(lockupState.terminationWithdrawnTokens)),
              unvestedAmount,
            )
          } else {
            lockedAmount = new BN(lockupState.lockupAmount).sub(new BN(lockupState.terminationWithdrawnTokens));
          }
        }
      } else {
        lockedAmount = new BN(lockupState.lockupAmount).sub(new BN(lockupState.terminationWithdrawnTokens));
      }

      if (!lockupState.releaseDuration) {
        lockupState.releaseDuration = "0";
      }
    }
  } catch (error) {
    console.error(error);
    if (accountId.length < 64) {
      accountId = `${accountId} doesn't exist`;
    }
    ownerAccountBalance = 0;
    lockupAccountBalance = 0;
  }

  console.log(lockedAmount);

  lockupState.ownerAccountBalance = nearApi.utils.format.formatNearAmount(ownerAccountBalance, 2);
  lockupState.lockedAmount = nearApi.utils.format.formatNearAmount(lockedAmount.toString(), 2);
  lockupState.liquidAmount = nearApi.utils.format.formatNearAmount(new BN(lockupAccountBalance).sub(new BN(lockedAmount)).toString(), 2);
  lockupState.totalAmount = nearApi.utils.format.formatNearAmount(new BN(ownerAccountBalance).add(new BN(lockupAccountBalance)).toString(), 2);
  lockupState.lockupReleaseStartDate = new Date(lockupReleaseStartTimestamp.divn(1000000).toNumber());

  console.log(lockupState);
  return lockupState;
}

export function viewLookupOld(lockupAccountId, lockupAmount, lockupState) {
  let unlockedAmount = 0, lockedAmount = 0;
  let phase2Time = new BN("1602614338293769340");
  let phase2 = new Date(phase2Time / 1000000);

  if (lockupAmount !== 0) {
    const lockupTimestamp = BN.max(
      phase2Time.add(new BN(lockupState.lockupDuration)),
      new BN(lockupState.lockupTimestamp ? lockupState.lockupTimestamp : 0),
    );
    const duration = lockupState.releaseDuration ? new BN(lockupState.releaseDuration) : new BN(0);
    const now = new BN((new Date().getTime() * 1000000).toString());

    //const endTimestamp = phase2Time.add(duration);
    const endTimestamp = lockupTimestamp.add(duration);
    const timeLeft = endTimestamp.sub(now);
    const releaseComplete = timeLeft.lten(0);

    lockupState.releaseDuration = lockupState.releaseDuration ? timestampToReadable(duration) : null;
    lockupState.timeLeft = timestampToReadable(timeLeft)

    lockupState.lockupStart = phase2;

    if (lockupState.lockupTimestamp !== null) {
      let lockupTimestamp = new Date(parseInt(lockupState.lockupTimestamp) / 1000000);
      if (phase2 < lockupState.lockupTimestamp) {
        lockupState.lockupStart = lockupTimestamp;
      }
    }

    if (lockupState.lockupDuration) {
      lockupState.lockupDurationReadable = timestampToReadable(lockupState.lockupDuration);
      lockupState.lockupDuration = parseInt(lockupState.lockupDuration) / 1000000000 / 60 / 60 / 24;
    } else {
      lockupState.lockupDurationReadable = null;
      lockupState.lockupDuration = null;
    }

    if (lockupTimestamp.lte(new BN(now.toString()))) {
      if (releaseComplete) {
        lockedAmount = new BN(0);
      } else {
        if (lockupState.releaseDuration) {
          lockedAmount = (new BN(lockupState.lockupAmount)
              .mul(timeLeft)
              .div(duration)
          );
        } else {
          lockedAmount = new BN(lockupState.lockupAmount);
        }
      }
    } else {
      lockedAmount = new BN(lockupState.lockupAmount);
    }

    unlockedAmount = (new BN(lockupState.lockupAmount).sub(lockedAmount)).toString(10);
    lockupState.ititilalLockupAmount = lockupState.lockupAmount;
    lockupState.lockupAmount = lockupAmount;
    lockupState.unlockedAmount = unlockedAmount;
    lockupState.lockedAmount = lockedAmount.toString();

    if (!lockupState.releaseDuration) {
      lockupState.releaseDuration = "0";
    }
  }

  console.log(lockupState);
  return lockupState;
}

/*
export async function viewLookup(inputAccountId) {
  const near = await nearApi.connect(options);
  let accountId = prepareAccountId(inputAccountId);
  let lockupAccountId = '', lockupAmount = 0, totalAmount = 0, ownerAmount = 0, lockupState = null, unlockedAmount = 0,
    lockedAmount = 0;
  let phase2Time = new BN("1602614338293769340");
  let phase2 = new Date(phase2Time / 1000000);
  try {

    ({lockupAccountId, lockupAmount, lockupState} = await lookupLockup(near, accountId));

    if (lockupAmount !== 0) {
      const lockupTimestamp = BN.max(
        phase2Time.add(new BN(lockupState.lockupDuration)),
        new BN(lockupState.lockupTimestamp ? lockupState.lockupTimestamp : 0),
      );
      const duration = lockupState.releaseDuration ? new BN(lockupState.releaseDuration) : new BN(0);
      const now = new BN((new Date().getTime() * 1000000).toString());

      //const endTimestamp = phase2Time.add(duration);
      const endTimestamp = lockupTimestamp.add(duration);
      const timeLeft = endTimestamp.sub(now);
      const releaseComplete = timeLeft.lten(0);

      lockupState.releaseDuration = lockupState.releaseDuration ? timestampToReadable(duration) : null;
      lockupState.timeLeft = timestampToReadable(timeLeft)

      lockupState.lockupStart = phase2;

      if (lockupState.lockupTimestamp !== null) {
        let lockupTimestamp = new Date(parseInt(lockupState.lockupTimestamp) / 1000000);
        if (phase2 < lockupState.lockupTimestamp) {
          lockupState.lockupStart = lockupTimestamp;
        }
      }

      if (lockupState.lockupDuration) {
        lockupState.lockupDurationReadable = timestampToReadable(lockupState.lockupDuration);
        lockupState.lockupDuration = parseInt(lockupState.lockupDuration) / 1000000000 / 60 / 60 / 24;
      } else {
        lockupState.lockupDurationReadable = null;
        lockupState.lockupDuration = null;
      }

      const vestingInformation = {...lockupState.vestingInformation};
      let unvestedAmount = new BN(0);

      if (lockupState.vestingInformation) {
        if (lockupState.vestingInformation.VestingHash) {
          lockupState.vestingInformation = `Hash: ${Buffer.from(lockupState.vestingInformation.VestingHash).toString('base64')}`;
        } else if (lockupState.vestingInformation.vestingStart) {
          let vestingStart = epochToHumanReadable(lockupState.vestingInformation.vestingStart);

          if (new Date(vestingStart) > phase2) {
            const vestingCliff = epochToHumanReadable(lockupState.vestingInformation.vestingCliff);
            const vestingEnd = epochToHumanReadable(lockupState.vestingInformation.vestingEnd);

            lockupState.vestingInformation = `from ${vestingStart} until ${vestingEnd} with cliff at ${vestingCliff}`;
            if (now.lt(vestingInformation.vestingCliff)) {
              //unvestedAmount = new BN(lockupAmount);
              unvestedAmount = new BN(lockupState.lockupAmount);
            } else if (now.gte(vestingInformation.vestingEnd)) {
              unvestedAmount = new BN(0);
            } else {
              const vestingTimeLeft = vestingInformation.vestingEnd.sub(now);
              const vestingTotalTime = vestingInformation.vestingEnd.sub(vestingInformation.vestingStart);
              //unvestedAmount = new BN(lockupAmount).mul(vestingTimeLeft).div(vestingTotalTime);
              unvestedAmount = new BN(lockupState.lockupAmount).mul(vestingTimeLeft).div(vestingTotalTime);
            }
          } else {
            lockupState.vestingInformation = null;
          }
        }
      }


      if (lockupTimestamp.lte(new BN(now.toString()))) {
        if (releaseComplete) {
          lockedAmount = new BN(0);
        } else {
          if (lockupState.releaseDuration) {
            lockedAmount = (new BN(lockupState.lockupAmount)
                .mul(timeLeft)
                .div(duration)
            );
            lockedAmount = BN.max(
              lockedAmount.sub(new BN(lockupState.terminationWithdrawnTokens)),
              unvestedAmount,
            )
          } else {
            lockedAmount = new BN(lockupState.lockupAmount);
          }
        }
      } else {
        lockedAmount = new BN(lockupState.lockupAmount);
      }


      unlockedAmount = (new BN(lockupState.lockupAmount).sub(lockedAmount)).toString(10);
      lockupState.ititilalLockupAmount = nearApi.utils.format.formatNearAmount(lockupState.lockupAmount.toString(), 2);
      lockupState.lockupAmount = nearApi.utils.format.formatNearAmount(lockupAmount.toString(), 2);
      lockupState.unlockedAmount = nearApi.utils.format.formatNearAmount(unlockedAmount.toString(), 2);
      lockupState.unvestedAmount = nearApi.utils.format.formatNearAmount(unvestedAmount.toString(), 2);

      if (!lockupState.releaseDuration) {
        lockupState.releaseDuration = "0";
      }
    }
  } catch (error) {
    //console.error(error);
    if (accountId.length < 64) {
      accountId = `${accountId} doesn't exist`;
    }
  }
  console.log(lockupState);
  return lockupState;

}
*/





