import {useTheme} from "@material-ui/core/styles";
import useMediaQuery from "@material-ui/core/useMediaQuery";
import React, {useEffect, useState} from "react";
import {Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle} from "@material-ui/core";
import {accountToLockup, epochToHumanReadable, timestampToReadable, viewLookup} from "../utils/funcs";
import * as nearApi from "near-api-js";
import PropTypes from "prop-types";
import getConfig from "../config";
import {ValidatorForm} from "react-material-ui-form-validator";

const nearConfig = getConfig(process.env.NODE_ENV || 'development')

function addDays(date, days) {
  const copy = new Date(Number(date))
  copy.setDate(date.getDate() + days)
  return copy
}

export default function LockupData(props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const {lockup, onClose} = props;
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(null);


  useEffect(() => {
    viewLookup(lockup).then((r) => {
      setView(r);
      setOpen(true);
    }).catch((e) => {
      console.log(e);
    })
  }, [lockup]);


  return (
    <>
      {open && view ?
        <Dialog
          onClose={onClose}
          fullScreen={fullScreen}
          open={open}
          aria-labelledby="lockup-data"
        >
          <DialogTitle style={{wordBreak: "break-word"}} id="lockup-data">
            {view.owner}
          </DialogTitle>
          <DialogContent>
            <DialogContentText className="black-text">
              <div
                style={{wordBreak: "break-word"}}>lockup: <b>{accountToLockup(nearConfig.lockupAccount, view.owner)}</b>
              </div>
              <div>initial lockup amount: <b>Ⓝ {view.ititilalLockupAmount}</b></div>
              <div>current amount: <b>Ⓝ {view.lockupAmount}</b></div>
              <div>lockup duration (cliff): <b>{view.lockupDurationReadable}</b></div>
              <div>release duration: <b>{view.releaseDuration}</b></div>
              <div>release
                start: <b>{addDays(new Date(view.lockupStart),view.lockupDuration).toDateString()}</b>
              </div>
              <div>time left: <b>{view.timeLeft}</b></div>
              <div>unlocked amount: <b>Ⓝ {view.unlockedAmount}</b></div>
              <div>
                vesting schedule: {view.vestingInformation ?
                <>
                  <ul>
                    <li style={{wordBreak: "break-word"}}>{view.vestingInformation}</li>
                  </ul>
                </>
                : "no"
              }
              </div>

            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} autoFocus>
              Close
            </Button>
          </DialogActions>
        </Dialog>
        : null}
    </>
  )
}

LockupData.propTypes = {
  lockup: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};
