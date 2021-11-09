import React, {useEffect, useState} from "react";
import {useParams} from "react-router-dom";

import {
  Button,
  Card,
  CardActions,
  CardContent,
  CircularProgress,
  Collapse,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  Icon,
  IconButton,
  InputAdornment,
  InputLabel,
  Link,
  makeStyles,
  MenuItem,
  Select,
  Switch, TextField,
  Typography,
} from "@material-ui/core";
import {KeyboardDatePicker, MuiPickersUtilsProvider,} from '@material-ui/pickers';
import {blue} from '@material-ui/core/colors';
import DateFnsUtils from '@date-io/date-fns';
import {useTheme} from '@material-ui/core/styles';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import CssBaseline from "@material-ui/core/CssBaseline";
import {SelectValidator, TextValidator, ValidatorForm} from 'react-material-ui-form-validator';
import {DataGrid, GridToolbarContainer, GridToolbarExport,} from '@material-ui/data-grid';
import LockupData from "../components/LockupData";

import * as nearApi from "near-api-js";
import {createLedgerU2FClient} from '../utils/ledger.js'
import {encode, decode} from 'bs58';

import getConfig from "../config";
import {accountToLockup, dateToNs, numberFormatted, truncate} from '../utils/funcs'
import {Decimal} from 'decimal.js';
import {useGlobalMutation, useGlobalState} from '../utils/container'
import {Alert, AlertTitle} from "@material-ui/lab";
import CloseIcon from '@material-ui/icons/Close';
import ReactJson from 'react-json-view'
import useRouter from "../utils/use-router";
import queryString from "query-string";


const lockupGas = "110000000000000";
const nearConfig = getConfig(process.env.NODE_ENV || 'development')
const provider = new nearApi.providers.JsonRpcProvider(nearConfig.nodeUrl);
const connection = new nearApi.Connection(nearConfig.networkId, provider, {});

async function accountExists(accountId) {
  try {
    await new nearApi.Account(connection, accountId).state();
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
}


const ViewLockups = () => {
  const stateCtx = useGlobalState();
  const mutationCtx = useGlobalMutation();
  const [showLockupData, setShowLockupData] = useState(false);
  const [lockup, setLockup] = useState(null);

  const useStyles = makeStyles((theme) => ({
    listRoot: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: theme.palette.background.paper,
    },
    card: {
      width: '100%',
    },
    cardHeader: {
      padding: theme.spacing(1, 2),
    },
    list: {
      width: 200,
      height: 230,
      backgroundColor: theme.palette.background.paper,
      overflow: 'auto',
    },

  }));
  const classes = useStyles();


  const handleLockupClick = (value) => {
    setLockup(value);
    setShowLockupData(true);
  }

  const onClose = () => {
    setShowLockupData(false);
  }

  const columns = [
      {field: 'id', headerName: 'id', width: 30, hide: true},
      {
        field: 'owner',
        headerName: 'Owner',
        width: 220,
        disableClickEventBubbling: true,
        renderCell: (params) => (
          <Link
            component="button"
            variant="body2"
            onClick={() => handleLockupClick(params.value)}
          >
            {truncate(params.value, 25)}
          </Link>
        )
      },
      {field: 'dateCreated', headerName: 'Created', width: 110, disableClickEventBubbling: true},
    ]
  ;

  const rows = [];
  stateCtx.config.createdLockups.map((item, key) => {
      const field = {
        id: key,
        owner: item.owner,
        dateCreated: `${('0' + (new Date(item.timestamp)).getDate()).slice(-2) + '/'
        + ('0' + ((new Date(item.timestamp)).getMonth() + 1)).slice(-2) + '/'
        + (new Date(item.timestamp)).getFullYear()}`,
      }
      rows.push(field);
    }
  )

  function ExportToolbar() {
    return (
      <GridToolbarContainer>
        <GridToolbarExport/>
      </GridToolbarContainer>
    );
  }


  return (
    <>
      <Card className={classes.card} variant="outlined" style={{padding: 10}}>
        <Typography align="center" variant="h5" style={{marginTop: 10}}>
          Recently created
        </Typography>
        <div style={{height: 400, width: '100%'}}>
          <DataGrid rows={rows} columns={columns}
                    components={{
                      Toolbar: ExportToolbar,
                    }}
                    pageSize={5}
                    checkboxSelection
                    disableSelectionOnClick
          />
        </div>
      </Card>
      {showLockupData ? <LockupData lockup={lockup} onClose={onClose}/> : null}
    </>
  )
}

/*
const LedgerAccess = (props) => {
  const stateCtx = useGlobalState();
  const mutationCtx = useGlobalMutation();

  const {handleDisableLedgerSign} = props;
  const useStyles = makeStyles((theme) => ({
    listRoot: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: theme.palette.background.paper,
    },
    card: {
      width: '100%',
    },
    cardHeader: {
      padding: theme.spacing(1, 2),
    },
    formControl: {
      margin: theme.spacing(1),
      minWidth: 140,
    },

  }));
  const classes = useStyles();


  const [ledgerAccountValidator, setLedgerAccountValidator] = useState(false);
  const [ledgerPath, setLedgerPath] = useState(stateCtx.config.ledgerKeys && stateCtx.config.ledgerKeys.path ? stateCtx.config.ledgerKeys.path : "44'/397'/0'/0'/1'");
  const [ledgerAccount, setLedgerAccount] = useState(stateCtx.config.ledgerKeys && stateCtx.config.ledgerKeys.account ? stateCtx.config.ledgerKeys.account : "");
  const [ledgerError, setLedgerError] = useState(false);
  const [ledgerErrorCode, setLedgerErrorCode] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(true);
  const [disableConnectButton, setDisableConnectButton] = useState(false);


  async function addPath(path) {
    const client = await createLedgerU2FClient();
    try {
      let publicKey = await client.getPublicKey(path);
      setDialogOpen(false);
      return encode(Buffer.from(publicKey));
    } catch (error) {
      console.log(error);
      setDialogOpen(true);
      setLedgerErrorCode(error)
      client.transport.close();
      return false;
    }
  }

  const handleDialogOpen = () => {
    setDialogOpen(false);
  }

  const handleChange = (event) => {
    if (event.target.name === "ledgerPath") {
      setLedgerPath(event.target.value)
    }
    if (event.target.name === "ledgerAccount") {
      setLedgerAccount(event.target.value)
    }

  }


  const handleSubmit = () => {
    addPath(ledgerPath).then((r) => {
      if (r === false) {
        setLedgerError(true);
        return false;
      }
      new nearApi.Account(connection, ledgerAccount).getAccessKeys().then((k) => {
        console.log(k);
        let match = true;

        let result = k.filter(obj => {
          return obj.public_key === 'ed25519:' + r
        })
        console.log(result);


        if (result.length !== 0) {
          mutationCtx.updateConfig({
            ledgerKeys: {
              key: r,
              path: ledgerPath,
              account: ledgerAccount
            },
          })
          setDisableConnectButton(true);
          handleDisableLedgerSign(false)
        } else {
          setLedgerErrorCode('no matching keys found for this account');
          setDialogOpen(true)
          setLedgerError(true)
        }

      }).catch((e) => {
        console.log(e)
      })

    }).catch((error) => {
      console.log(error)
    })

  }


  const ledgerAccountValidatorListener = (result) => {
    setLedgerAccountValidator(result)
  }


  return (
    <>
      <ValidatorForm
        onSubmit={handleSubmit}
        onError={errors => console.log(errors)}
      >
        <Card className={classes.card} variant="outlined">
          <Typography align="center" variant="h5" style={{marginTop: 10}}>
            Use multisig
          </Typography>
          <Divider light/>
          <CardContent>
            <Grid container spacing={1}>
              <Grid item xs={12}>
                <TextValidator
                  className={classes.card}
                  id="ledgerAccount"
                  label="Enter funding account"
                  value={ledgerAccount}
                  variant="outlined"
                  onChange={handleChange}
                  name="ledgerAccount"
                  validators={['required']}
                  validatorListener={ledgerAccountValidatorListener}
                  errorMessages={['this field is required']}
                />
              </Grid>
              <Grid item xs={12}>
                <SelectValidator
                  variant="outlined"
                  className={classes.card}
                  id="ledgerPath"
                  name="ledgerPath"
                  label="Ledger Path"
                  value={ledgerPath}
                  onChange={handleChange}
                  SelectProps={{
                    native: false
                  }}
                >
                  <MenuItem selected value={ledgerPath}>44'/397'/0'/0'/1'</MenuItem>
                  <MenuItem value={"44'/397'/0'/0'/2'"}>44'/397'/0'/0'/2'</MenuItem>
                  <MenuItem value={"44'/397'/0'/0'/3'"}>44'/397'/0'/0'/3'</MenuItem>
                  <MenuItem value={"44'/397'/0'/0'/4'"}>44'/397'/0'/0'/4'</MenuItem>
                  <MenuItem value={"44'/397'/0'/0'/5'"}>44'/397'/0'/0'/5'</MenuItem>
                  <MenuItem value={"44'/397'/0'/0'/6'"}>44'/397'/0'/0'/6'</MenuItem>
                  <MenuItem value={"44'/397'/0'/0'/7'"}>44'/397'/0'/0'/7'</MenuItem>
                  <MenuItem value={"44'/397'/0'/0'/8'"}>44'/397'/0'/0'/8'</MenuItem>
                </SelectValidator>
              </Grid>
            </Grid>
            <Grid container justify="flex-end" spacing={2} style={{marginTop: 20}}>
              <Button
                variant="contained"
                color="primary"
                type="submit"
                disabled={disableConnectButton}
              >Connect Ledger</Button>
            </Grid>
          </CardContent>
        </Card>
      </ValidatorForm>
      {ledgerError ?
        <Dialog
          onClose={handleDialogOpen}
          open={dialogOpen}
          aria-labelledby="lockup-data"
        >
          <DialogTitle style={{wordBreak: "break-word"}} id="lockup-data">
            <span style={{color: 'red'}}>Attention</span>
          </DialogTitle>
          <DialogContent>
            {!ledgerErrorCode ?
              <DialogContentText className="black-text">
                Please connect the Ledger device, enter pin, open NEAR app, and repeat again.
              </DialogContentText> : null}

            {ledgerErrorCode.toString().includes('The device is already open') ?
              <DialogContentText className="black-text">
                The device is already open
              </DialogContentText> : null}

            {ledgerErrorCode.toString().includes('navigator.hid is not supported') ?
              <DialogContentText className="red-text">
                <b>Navigator.hid is not supported, please use another browser</b>
              </DialogContentText> : null}

            {ledgerErrorCode.toString().includes('no matching keys found for this account') ?
              <DialogContentText className="red-text">
                <b>No matching keys found for this account, please select another account</b>
              </DialogContentText> : null}

            {ledgerErrorCode.toString().includes('UNKNOWN_ERROR') ?
              <DialogContentText className="red-text" align="center">
                Unknown error occurred, please re-connect the Ledger device, enter the pin, open NEAR app, and repeat
                again.
                <br/><br/>
                <Divider/>
                <br/>
                {ledgerErrorCode.toString()}
              </DialogContentText> : null}


          </DialogContent>
          <DialogActions>
            <Button onClick={handleDialogOpen} autoFocus>
              Close
            </Button>
          </DialogActions>
        </Dialog>
        : null}
    </>
  )
}
*/

const CallbackDialog = () => {
  const stateCtx = useGlobalState();
  const mutationCtx = useGlobalMutation();

  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [lockup, setLockup] = useState(null);

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));


  useEffect(() => {
    accountExists(stateCtx.config.sentTx.lockup).then((a) => {
      setLockup(false);
      if (a) {
        accountExists(stateCtx.config.sentTx.lockup).then((r) => {
          setLockup(r);
        }).catch((e) => {
          console.log(e)
        })
      }
    }).catch((e2) => {
      console.log(e2)
    })
    return () => {
    }
  }, []);


  const uriString = queryString.parse(router.location.search);


  const handleCloseSuccess = () => {
    mutationCtx.updateConfig({
      createdLockups: [...stateCtx.config.createdLockups, {owner: stateCtx.config.sentTx.owner, timestamp: new Date()}],
      sentTx: null,
    })
    router.history.push('/');
    setOpen(false);
  };

  const handleCloseFail = () => {
    mutationCtx.updateConfig({
      sentTx: null,
    })
    router.history.push('/');
    setOpen(false);
  };

  console.log(router.location)

  return (

    <Dialog
      fullScreen={fullScreen}
      open={lockup !== null && open}
      aria-labelledby="sign-result"
    >
      <DialogTitle style={!lockup ? {color: 'red'} : {color: "green"}} id="sign-result">
        {!lockup ? "Error - " : "Success"}
        {uriString && uriString["errorCode"] ? uriString["errorCode"] : null}
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          {lockup ?
            <>
              <b>{stateCtx.config.sentTx.lockup}</b> with owner <a target="_blank"
                                                                   href={nearConfig.walletUrl + "/profile/" + stateCtx.config.sentTx.owner}>{stateCtx.config.sentTx.owner}</a> has
              been created.
              <Divider style={{marginTop: 10, marginBottom: 10}}/>
              {uriString && uriString["transactionHashes"] ?
                <div>
                  View <a target="_blank" rel="nofollow"
                          href={nearConfig.explorerUrl + "/transactions/" + uriString["transactionHashes"]}>transaction</a>
                  <pre>TX Hash: {uriString["transactionHashes"]}</pre>
                </div>
                : null}
            </>
            :
            <>
              <b>{stateCtx.config.sentTx.lockup}</b> with owner <a target="_blank"
                                                                   href={nearConfig.walletUrl + "/profile/" + stateCtx.config.sentTx.owner}>{stateCtx.config.sentTx.owner}</a> has
              {" "}<b><span style={{color: 'red'}}>not</span></b> been created, please try again.
              <Divider style={{marginTop: 10, marginBottom: 10}}/>
              {uriString && uriString["errorCode"] && uriString["errorMessage"] ? uriString["errorMessage"].replace(/%20/g, " ") : null}
            </>
          }
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        {lockup ?
          <Button onClick={handleCloseSuccess} color="primary" autoFocus>
            Save
          </Button>
          :
          <Button onClick={handleCloseFail} color="primary" autoFocus>
            Ok
          </Button>
        }
      </DialogActions>
    </Dialog>
  )

}


const Lockups = () => {
    const stateCtx = useGlobalState();
    const mutationCtx = useGlobalMutation();

    const useStyles = makeStyles((theme) => ({
      root: {
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        '& .MuiTextField-root': {
          margin: theme.spacing(1),
        },
      },
      main: {
        marginTop: theme.spacing(12),
        marginBottom: theme.spacing(2),
      },
      card: {
        width: '100%',
      },
      input: {
        width: '100%',
      },
      buttonProgress: {
        color: blue[500],
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginTop: -12,
        marginLeft: -12,
      },
      formControl: {
        margin: theme.spacing(1),
        width: '100%',
      },
      alertRoot: {
        width: '100%',
        '& > * + *': {
          marginTop: theme.spacing(2),
        },
        marginLeft: 8,
        marginTop: 10,
        marginBottom: 10,
      },
    }));
    const classes = useStyles();

    const [showSpinner, setShowSpinner] = useState(false);
    const [vestingStartTimestampDate, setVestingStartTimestampDate] = useState(null);
    const [vestingCliffTimestampDate, setVestingCliffTimestampDate] = useState(null);
    const [vestingEndTimestampDate, setVestingEndTimestampDate] = useState(null);
    const [vestingSchedule, setVestingSchedule] = useState(0);
    const [hideVesting, setHideVesting] = useState(true);
    const [lockupStartDate, setLockupStartDate] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [checkedContractData, setCheckedContractData] = useState(false);
    const [checkedUseMultisig, setCheckedUseMultisig] = useState(stateCtx.config.useMultisig);


    const [ledgerAccountValidator, setLedgerAccountValidator] = useState(false);
    const [ledgerPath, setLedgerPath] = useState(stateCtx.config.ledgerKeys && stateCtx.config.ledgerKeys.path ? stateCtx.config.ledgerKeys.path : "44'/397'/0'/0'/1'");
    const [ledgerKey, setLedgerKey] = useState(stateCtx.config.ledgerKeys && stateCtx.config.ledgerKeys.key ? stateCtx.config.ledgerKeys.key : "");
    const [ledgerAccount, setLedgerAccount] = useState(stateCtx.config.ledgerKeys && stateCtx.config.ledgerKeys.account ? stateCtx.config.ledgerKeys.account : "");
    const [ledgerError, setLedgerError] = useState(false);
    const [ledgerErrorCode, setLedgerErrorCode] = useState("");
    const [dialogOpen, setDialogOpen] = useState(true);
    const [ledgerDialogOpen, setLedgerDialogOpen] = useState(false);
    const [ledgerDialogMessage, setLedgerDialogMessage] = useState("");
    const [disableLedgerButton, setDisableLedgerButton] = useState(false);
    const [ledgerSign, setLedgerSign] = useState(null);
    const [addFundingAccount, setAddFundingAccount] = useState(null);
    const [signWithWallet, setSignWithWallet] = useState(null);
    const [disableAddFundingAccount, setDisableAddFundingAccount] = useState(false);

    const handleDialogOpen = () => {
      setDialogOpen(false);
    }

    const handleLedgerDialogOpen = () => {
      setLedgerDialogOpen(false);
    }

    const handleLedgerChange = (event) => {
      setDisableLedgerButton(true)
      if (event.target.name === "ledgerPath") {
        setLedgerPath(event.target.value)
      }
      if (event.target.name === "ledgerAccount") {
        setLedgerAccount(event.target.value)
      }
    }

    const ledgerAccountValidatorListener = (result) => {
      setLedgerAccountValidator(result)
    }

    const handleShowContractData = () => {
      setCheckedContractData((prev) => !prev);
    };

    const handleShowUseMultisig = () => {
      setCheckedUseMultisig((prev) => !prev);
      mutationCtx.updateConfig({
        useMultisig: !stateCtx.config.useMultisig
      })
      setDisableAddFundingAccount(false)
    };


    const [state, setState] = useState({
      ownerAccountId: '',
      lockupAccountId: '',
      amount: '',
      lockupDuration: "0",
      releaseDuration: null,
    });


    let {meta, errorCode} = useParams();

    useEffect(() => {
      if (stateCtx.config.sentTx !== null) {
        setShowModal(true);
      }
      return () => {
      }
    }, []);


    useEffect(() => {
      ValidatorForm.addValidationRule('isValidAccount', async (value) => {
        if (value.length > 4) {
          return await accountExists(value);
        } else {
          return false;
        }
      });
      return () => {
        ValidatorForm.removeValidationRule('isValidAccount');
      }
    }, []);

    useEffect(() => {
      ValidatorForm.addValidationRule('isLockupAccountExist', async (value) => {
        const result = await accountExists(value);
        return !result;
      });
      return () => {
        ValidatorForm.removeValidationRule('isLockupAccountExist');
      }
    }, []);

    async function addPath(path, client) {
      try {
        let publicKey = await client.getPublicKey(path);
        setDialogOpen(false);
        return encode(Buffer.from(publicKey));
      } catch (error) {
        console.log(error);
        setDialogOpen(true);
        setLedgerErrorCode(error)
        client.transport.close();
        return false;
      }
    }

    const handleSubmit = async (e) => {
      e.preventDefault();
      const amount = nearApi.utils.format.parseNearAmount(state.amount);
      const releaseDuration = state.releaseDuration !== null ? new Decimal(state.releaseDuration).mul('2.628e+15').toFixed().toString() : null;
      const lockupTimestamp = lockupStartDate ? dateToNs(lockupStartDate) : null;

      if (ledgerSign) {
        const client = await createLedgerU2FClient();
        const args = {
          owner_account_id: state.ownerAccountId,
          lockup_duration: "0",
          lockup_timestamp: lockupTimestamp,
          release_duration: releaseDuration,
          vesting_schedule: hideVesting ? null : {
            VestingSchedule: {
              start_timestamp: vestingStartTimestampDate ? dateToNs(vestingStartTimestampDate) : null,
              cliff_timestamp: vestingCliffTimestampDate ? dateToNs(vestingCliffTimestampDate) : null,
              end_timestamp: vestingEndTimestampDate ? dateToNs(vestingEndTimestampDate) : null,
            }
          },
        };

        const publicKey = nearApi.utils.PublicKey.fromString(ledgerKey);
        const near = await nearApi.connect({
          nodeUrl: nearConfig.nodeUrl,
          networkId: nearConfig.networkId,
          deps: {},
          signer: {
            async getPublicKey() {
              return publicKey;
            },
            async signMessage(message) {
              const signature = await client.sign(message, ledgerPath);
              return {signature, publicKey};
            }
          },
        });
        let contract = await near.account(stateCtx.config.ledgerKeys.account);
        setDisableLedgerButton(true);
        setLedgerDialogOpen(true);
        setLedgerDialogMessage("Please confirm Ledger public key: " + publicKey);
        addPath(ledgerPath, client).then((r) => {
          if (r === false) {
            setLedgerError(true);
            setLedgerDialogOpen(false);
            setDisableLedgerButton(false);
            return false;
          }
          new nearApi.Account(connection, ledgerAccount).getAccessKeys().then((k) => {
            let result = k.filter(obj => {
              return obj.public_key === 'ed25519:' + r
            })
            console.log(result);

            if (result.length !== 0) {
              setLedgerKey(r);
              mutationCtx.updateConfig({
                ledgerKeys: {
                  key: r,
                  path: ledgerPath,
                  account: ledgerAccount
                },
              })
              setLedgerDialogMessage("Please confirm transaction on the Ledger device");
              contract.functionCall(ledgerAccount, 'add_request', {
                "request": {
                  "receiver_id": nearConfig.contractName,
                  "actions": [{
                    "type": "FunctionCall",
                    "method_name": "create",
                    "args": btoa(JSON.stringify(args ? args : {})),
                    "deposit": amount,
                    "gas": "280000000000000"
                  }]
                }
              }).then((r) => {
                console.log(r);
                setDisableLedgerButton(false);
                setLedgerDialogMessage(r.status ? "Lockup created, please notify key holders to confirm request #" + atob(r.status.SuccessValue) + " and transaction hash: " + r.transaction.hash : "");
                //setLedgerDialogOpen(false);
                client.transport.close();
              }).catch((e) => {
                console.log(e)
                setLedgerError(true);
                setLedgerErrorCode(e)
                setDialogOpen(true)
                setDisableLedgerButton(false);
                setLedgerDialogOpen(false);
                client.transport.close();
              })
            } else {
              setLedgerErrorCode('no matching keys found for this account');
              setDialogOpen(true)
              setLedgerError(true)
              client.transport.close();
            }

          }).catch((e) => {
            console.log(e)
          })

        }).catch((error) => {
          console.log(error)
        })

      }

      if (signWithWallet) {
        mutationCtx.updateConfig({
          sentTx: {
            lockup: accountToLockup(nearConfig.lockupAccount, state.ownerAccountId),
            owner: state.ownerAccountId
          },
        });

        try {
          setShowSpinner(true);

          await window.contract.create({
              owner_account_id: state.ownerAccountId,
              lockup_duration: "0",
              lockup_timestamp: lockupTimestamp,
              release_duration: releaseDuration,
              vesting_schedule: hideVesting ? null : {
                VestingSchedule: {
                  start_timestamp: vestingStartTimestampDate ? dateToNs(vestingStartTimestampDate) : null,
                  cliff_timestamp: vestingCliffTimestampDate ? dateToNs(vestingCliffTimestampDate) : null,
                  end_timestamp: vestingEndTimestampDate ? dateToNs(vestingEndTimestampDate) : null,
                }
              },
            },
            new Decimal(lockupGas).toString(), amount,
          )
        } catch (e) {
          console.log(e);
          //setShowError(e);
        } finally {
          setShowSpinner(false);
        }
      }

    }

    const handleAddLedger = async (e) => {
      e.preventDefault();

      if (addFundingAccount) {
        const client = await createLedgerU2FClient();
        setLedgerDialogMessage("Please approve Ledger public key");
        setLedgerDialogOpen(true);
        addPath(ledgerPath, client).then((r) => {
          if (r === false) {
            setLedgerError(true);
            setLedgerDialogOpen(false);
            setDisableLedgerButton(false);
            return false;
          }
          new nearApi.Account(connection, ledgerAccount).getAccessKeys().then((k) => {
            let result = k.filter(obj => {
              return obj.public_key === 'ed25519:' + r
            })
            if (result.length !== 0) {
              setLedgerKey(r);
              mutationCtx.updateConfig({
                ledgerKeys: {
                  key: r,
                  path: ledgerPath,
                  account: ledgerAccount
                },
              })
              setLedgerDialogOpen(false);
              setDisableAddFundingAccount(true);
              setDisableLedgerButton(false);
              location.reload();
            } else {
              setLedgerErrorCode('no matching keys found for this account');
              setDialogOpen(true)
              setLedgerDialogOpen(false);
              setLedgerError(true)
              client.transport.close();
            }
          }).catch((e) => {
            console.log(e)
          })
        }).catch((error) => {
          console.log(error)
        })

      }
    }

    const dryRun = () => {
      const amount = nearApi.utils.format.parseNearAmount(state.amount);
      const releaseDuration = state.releaseDuration ? new Decimal(state.releaseDuration).mul('2.628e+15').toFixed().toString() : null;
      const lockupTimestamp = lockupStartDate ? dateToNs(lockupStartDate) : null;


      return {
        args:
          {
            owner_account_id: state.ownerAccountId,
            lockup_duration: "0",
            lockup_timestamp: lockupTimestamp,
            release_duration: releaseDuration,
            vesting_schedule: hideVesting ? null : {
              VestingSchedule: {
                start_timestamp: vestingStartTimestampDate ? dateToNs(vestingStartTimestampDate) : null,
                cliff_timestamp: vestingCliffTimestampDate ? dateToNs(vestingCliffTimestampDate) : null,
                end_timestamp: vestingEndTimestampDate ? dateToNs(vestingEndTimestampDate) : null,
              }
            }
          },
        gas: new Decimal(lockupGas).toString(),
        deposit: amount
      };
    }

    const checkLockup = (event) => {
      event.preventDefault()
      const lockup = accountToLockup(nearConfig.lockupAccount, event.target.value.toLowerCase())
      setState((prevState) => ({...prevState, lockupAccountId: lockup}))
    }

    const handleChange = (event) => {
      if (event.target.name === "ownerAccountId") {
        event.preventDefault()
        setState((prevState) => ({...prevState, ownerAccountId: event.target.value.toLowerCase()}))
        if (event.target.value.length > 4) {
          const lockup = accountToLockup(nearConfig.lockupAccount, event.target.value.toLowerCase())
          setState((prevState) => ({...prevState, lockupAccountId: lockup}))
        }
        if (event.target.value === "") {
          setState((prevState) => ({...prevState, lockupAccountId: ""}))

        }
      }

      if (event.target.name === "releaseDuration") {
        setState((prevState) => ({...prevState, releaseDuration: event.target.value}))
      }

      if (event.target.name === "amount") {
        setState((prevState) => ({...prevState, amount: event.target.value}))
      }

    }


    const handleVestingSelectChange = (event) => {
      setHideVesting(event.target.value === 0);
      setVestingSchedule(event.target.value);
    };

    const [lockup, setLockup] = useState(null);
    const [showLockupData, setShowLockupData] = useState(false);

    const onClose = () => {
      setShowLockupData(false);
    }

    const handleSearchClick = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        setLockup(e.target.value);
        setShowLockupData(true);
      }
    };

    const [openAlert1, setOpenAlert1] = useState(true);
    const [openAlert2, setOpenAlert2] = useState(true);
    const [openAlert3, setOpenAlert3] = useState(true);
    const [accountValidator, setAccountValidator] = useState(false);
    const [lockupValidator, setLockupValidator] = useState(false);
    const [amountValidator, setAmountValidator] = useState(false);


    const ownerAccountValidatorListener = (result) => {
      setAccountValidator(result)
      setCheckedContractData(!checkedContractData ? false : result);
    }

    const lockupValidatorListener = (result) => {
      setLockupValidator(result)
      setCheckedContractData(!checkedContractData ? false : result);
    }

    const amountValidatorListener = (result) => {
      setAmountValidator(result)
      setCheckedContractData(!checkedContractData ? false : result);
    }

    const handleVestingSelectDates = (event) => {
      const vestingCliffDate = new Date(new Decimal(dateToNs(event)).plus(3.154e+16).div(1_000_000).toNumber());
      const vestingEndDate = new Date(new Decimal(dateToNs(event)).plus(1.261e+17).div(1_000_000).toNumber());
      setVestingStartTimestampDate(event)
      setVestingCliffTimestampDate(vestingCliffDate)
      setVestingEndTimestampDate(vestingEndDate)

    };

    return (
      <div className={classes.root}>
        <CssBaseline/>
        <Navbar handleSearchClick={handleSearchClick}/>
        <Container component="main" className={classes.main}>
          {showLockupData && lockup ? <LockupData lockup={lockup} onClose={onClose}/> : null}
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Alert
                severity="error"
                color="error"
              >
                <AlertTitle>Disclaimer</AlertTitle>
                Beta software. Test in prod. Not audited. Use at your own risk!
              </Alert>
            </Grid>
            <Grid item xs={12} md={8}>
              <Card className={classes.card} variant="outlined">
                <CardContent>
                  <Typography align="center" variant="h5" style={{marginTop: 10}}>
                    Creating a new lockup
                  </Typography>
                  <ValidatorForm
                    onSubmit={handleSubmit}
                    onError={errors => console.log(errors)}
                  >
                    <TextValidator
                      className={classes.card}
                      id="ownerAccountId"
                      label="Enter Owner Account *"
                      variant="outlined"
                      name="ownerAccountId"
                      onChange={handleChange}
                      onBlur={checkLockup}
                      value={state.ownerAccountId}
                      validators={['required', 'isValidAccount']}
                      validatorListener={ownerAccountValidatorListener}
                      errorMessages={['this field is required', 'account does not exists']}
                    />
                    <TextValidator
                      disabled
                      className={classes.card}
                      id="lockupAccountId"
                      size="small"
                      label="Lockup Account"
                      value={state.lockupAccountId}
                      variant="outlined"
                      name="lockupAccountId"
                      validators={['required', 'isLockupAccountExist']}
                      validatorListener={lockupValidatorListener}
                      errorMessages={['this field is required', 'lockup account already exists']}
                    />
                    <TextValidator
                      className={classes.card}
                      id="amountId"
                      label="Amount in NEAR (min 3.5) *"
                      value={state.amount}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">Ⓝ</InputAdornment>,
                        inputComponent: numberFormatted,
                      }}
                      variant="outlined"
                      onChange={handleChange}
                      name="amount"
                      validators={['required', 'minFloat:3.5', 'minStringLength:1']}
                      validatorListener={amountValidatorListener}
                      errorMessages={['this field is required', 'minimum NEAR 3.5', 'please enter the amount in NEAR']}
                    />
                    <Grid item xs={12} md={12}>
                      <div className={classes.alertRoot}>
                        <Collapse in={openAlert2}>
                          <Alert
                            severity="success"
                            color="info"
                            action={
                              <IconButton
                                aria-label="close"
                                color="inherit"
                                size="small"
                                onClick={() => {
                                  setOpenAlert2(false);
                                }}
                              >
                                <CloseIcon fontSize="inherit"/>
                              </IconButton>
                            }
                          >
                            <AlertTitle>Vesting Schedule</AlertTitle>
                            <b>Attention! Lockup with vesting CAN ONLY BE CANCELLED BY FOUNDATION</b>
                            <br/><br/>
                            The contract could have both lockup and vesting schedules. The current amount of non-liquid
                            tokens are calculated as the maximum between lockup and vesting logic. If at least one
                            mechanism said the tokens are locked, then they are still locked.
                          </Alert>
                        </Collapse>
                      </div>
                    </Grid>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={4}>
                        <FormControl variant="outlined" className={classes.formControl}>
                          <InputLabel id="vestingScheduleLabel">Vesting Schedule</InputLabel>
                          <Select
                            labelId="vestingScheduleLabel"
                            onChange={handleVestingSelectChange}
                            id="vestingScheduleId"
                            value={vestingSchedule}
                            label="Vesting Schedule"
                          >
                            <MenuItem value={0}>None - Linear Release</MenuItem>
                            <MenuItem value={1}>Vesting 1-year Cliff</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      {!hideVesting ?
                        <>
                          <Grid item xs={12} md={4}>
                            <MuiPickersUtilsProvider utils={DateFnsUtils}>
                              <KeyboardDatePicker
                                required={!hideVesting}
                                fullWidth
                                variant="inline"
                                inputVariant="outlined"
                                autoOk
                                id="vestingStartTimestampId"
                                label="Vesting Start Date"
                                format="MMM dd yyyy"
                                minDate="2020-10-13"
                                value={vestingStartTimestampDate}
                                InputAdornmentProps={{position: "start"}}
                                onChange={handleVestingSelectDates}
                              />
                            </MuiPickersUtilsProvider>
                          </Grid>


                          {/*
                        <Grid item xs={12} md={4}>
                          <MuiPickersUtilsProvider utils={DateFnsUtils}>
                            <KeyboardDatePicker
                              required={!hideVesting}
                              fullWidth
                              variant="inline"
                              inputVariant="outlined"
                              autoOk
                              id="vestingCliffTimestampId"
                              label="Cliff Timestamp"
                              format="MMM dd yyyy"
                              value={vestingCliffTimestampDate}
                              InputAdornmentProps={{position: "start"}}
                              onChange={setVestingCliffTimestampDate}
                            />
                          </MuiPickersUtilsProvider>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <MuiPickersUtilsProvider utils={DateFnsUtils}>
                            <KeyboardDatePicker
                              required={!hideVesting}
                              fullWidth
                              variant="inline"
                              inputVariant="outlined"
                              autoOk
                              id="vestingEndTimestampId"
                              label="End Timestamp"
                              format="MMM dd yyyy"
                              value={vestingEndTimestampDate}
                              InputAdornmentProps={{position: "start"}}
                              onChange={setVestingEndTimestampDate}
                            />
                          </MuiPickersUtilsProvider>
                        </Grid>
                        */}
                        </>
                        : null
                      }
                    </Grid>
                    <Grid container spacing={3}>
                      <Grid item xs={12}>
                        {vestingCliffTimestampDate && vestingEndTimestampDate ?
                          <div>
                            <div className={classes.alertRoot}>
                              <Collapse in={openAlert3}>
                                <Alert
                                  severity="info"
                                  color="info"
                                  action={
                                    <IconButton
                                      aria-label="close"
                                      color="inherit"
                                      size="small"
                                      onClick={() => {
                                        setOpenAlert3(false);
                                      }}
                                    >
                                      <CloseIcon fontSize="inherit"/>
                                    </IconButton>
                                  }
                                >
                                  25% of locked tokens will be unlocked
                                  on <b>{vestingCliffTimestampDate.toDateString()}</b> and remaining balance will be
                                  release linearly over the next 3 years, with all tokens unlocked
                                  on <b>{vestingEndTimestampDate.toDateString()}</b>
                                </Alert>
                              </Collapse>
                            </div>
                          </div>
                          : null}
                      </Grid>
                    </Grid>

                    {hideVesting ?
                      <Grid container spacing={3}>
                        <Grid item xs={12} md={12}>
                          <div className={classes.alertRoot}>
                            <Collapse in={openAlert1}>
                              <Alert
                                severity="success"
                                color="info"
                                action={
                                  <IconButton
                                    aria-label="close"
                                    color="inherit"
                                    size="small"
                                    onClick={() => {
                                      setOpenAlert1(false);
                                    }}
                                  >
                                    <CloseIcon fontSize="inherit"/>
                                  </IconButton>
                                }
                              >
                                <AlertTitle>Lockup Schedule</AlertTitle>
                                <b>Attention! Lockup with no vesting CANNOT BE CANCELLED</b>
                                <br/><br/>
                                <li><b>Unlock Start Date</b> or lockup timestamp - the moment when tokens start linearly
                                  unlocking.
                                </li>
                                <li><b>Release Duration</b> - The length of the unlocking schedule during which tokens are
                                  linearly unlocked.
                                </li>
                                Please view a detailed specification <a
                                href="https://github.com/near/core-contracts/tree/master/lockup" target="_blank"
                                rel="nofollow">here</a>
                              </Alert>
                            </Collapse>
                          </div>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <MuiPickersUtilsProvider utils={DateFnsUtils}>
                            <KeyboardDatePicker
                              fullWidth
                              variant="inline"
                              inputVariant="outlined"
                              autoOk
                              name="lockupStartDate"
                              id="lockupStartDateId"
                              label="Unlock Start Date"
                              format="MMM dd yyyy"
                              value={lockupStartDate}
                              InputAdornmentProps={{position: "start"}}
                              onChange={setLockupStartDate}
                            />
                          </MuiPickersUtilsProvider>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <SelectValidator
                            variant="outlined"
                            className={classes.card}
                            id="releaseDurationId"
                            name="releaseDuration"
                            label="Release Duration"
                            value={state.releaseDuration}
                            onChange={handleChange}
                            SelectProps={{
                              native: false
                            }}
                          >
                            <MenuItem value={null}><em>None</em></MenuItem>
                            <MenuItem value={3}>3 months</MenuItem>
                            <MenuItem value={6}>6 months</MenuItem>
                            <MenuItem value={12}>1 Year (12 months)</MenuItem>
                            <MenuItem value={18}>1.5 Year (18 months)</MenuItem>
                            <MenuItem value={24}>2 Years (24 months)</MenuItem>
                            <MenuItem value={36}>3 Years (36 months)</MenuItem>
                            <MenuItem value={48}>4 Years (48 months)</MenuItem>
                          </SelectValidator>
                        </Grid>

                      </Grid>
                      : null}

                    <Grid container justify="flex-start" spacing={1} style={{marginTop: 20, marginLeft: 6}}>
                      <Grid item xs={12} md={6}>
                        <FormControlLabel
                          disabled={!accountValidator || !amountValidator || !lockupValidator}
                          control={<Switch checked={checkedContractData} onChange={handleShowContractData}/>}
                          label="Show Raw Contract Data"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <FormControlLabel
                          control={<Switch checked={checkedUseMultisig} onChange={handleShowUseMultisig}/>}
                          label="Use Multisig"
                        />
                      </Grid>
                      {checkedContractData ?
                        <Grid xs={12} item>
                          <ReactJson collapsed={false} displayDataTypes={false} displayArrayKey={false} name={false}
                                     theme={stateCtx.config.darkMode === "light" ? "bright:inverted" : "tomorrow"}
                                     src={dryRun()}/>
                        </Grid>
                        : null}
                      <Grid container justify="flex-end" style={{marginRight: 6}}>
                        {checkedUseMultisig ?
                          <>
                            <Button
                              style={{marginRight: 10}}
                              variant="contained"
                              color="primary" type="submit"
                              disabled={disableLedgerButton || ledgerKey === ''}
                              onClick={() => {
                                setLedgerSign(true)
                              }}
                            >SIGN WITH LEDGER</Button>
                          </>
                          : null}
                        {!checkedUseMultisig ?
                          <Button
                            variant="contained"
                            color="primary" type="submit"
                            endIcon={<Icon>send</Icon>}
                            disabled={!window.walletConnection.isSignedIn()}
                            onClick={() => {
                              setSignWithWallet(true)
                            }}
                          >SIGN WITH WALLET</Button>
                          : null}
                        {showSpinner && <CircularProgress size={48} className={classes.buttonProgress}/>}
                      </Grid>
                    </Grid>
                    {checkedUseMultisig ?
                      <Grid style={{marginBottom: 10, marginTop: 10}}>
                        <Card className={classes.card} variant="outlined">
                          <Typography align="center" variant="h5" style={{marginTop: 10}}>
                            Use multisig
                          </Typography>
                          <Divider light/>
                          <CardContent>
                            <Grid container spacing={1}>
                              <Grid item xs={12}>
                                <TextValidator
                                  className={classes.card}
                                  id="ledgerAccount"
                                  label="Enter funding account"
                                  value={ledgerAccount}
                                  variant="outlined"
                                  onChange={handleLedgerChange}
                                  name="ledgerAccount"
                                  validators={['required']}
                                  validatorListener={ledgerAccountValidatorListener}
                                  errorMessages={['this field is required']}
                                />
                              </Grid>
                              <Grid item xs={12}>
                                <SelectValidator
                                  variant="outlined"
                                  className={classes.card}
                                  id="ledgerPath"
                                  name="ledgerPath"
                                  label="Ledger Path"
                                  value={ledgerPath}
                                  onChange={handleLedgerChange}
                                  SelectProps={{
                                    native: false
                                  }}
                                >
                                  <MenuItem selected value={"44'/397'/0'/0'/1'"}>44'/397'/0'/0'/1' - Default</MenuItem>
                                  <MenuItem value={"44'/397'/0'/0'/2'"}>44'/397'/0'/0'/2'</MenuItem>
                                  <MenuItem value={"44'/397'/0'/0'/3'"}>44'/397'/0'/0'/3'</MenuItem>
                                  <MenuItem value={"44'/397'/0'/0'/4'"}>44'/397'/0'/0'/4'</MenuItem>
                                  <MenuItem value={"44'/397'/0'/0'/5'"}>44'/397'/0'/0'/5'</MenuItem>
                                  <MenuItem value={"44'/397'/0'/0'/6'"}>44'/397'/0'/0'/6'</MenuItem>
                                  <MenuItem value={"44'/397'/0'/0'/7'"}>44'/397'/0'/0'/7'</MenuItem>
                                  <MenuItem value={"44'/397'/0'/0'/8'"}>44'/397'/0'/0'/8'</MenuItem>
                                </SelectValidator>
                              </Grid>
                              <Grid item xs={12}>
                                <TextField variant="outlined" label="Ledger Public Key" disabled={true} fullWidth
                                           value={ledgerKey}/>
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>
                        {ledgerError ?
                          <Dialog
                            onClose={handleDialogOpen}
                            open={dialogOpen}
                            aria-labelledby="lockup-data"
                          >
                            <DialogTitle style={{wordBreak: "break-word"}} id="lockup-data">
                              <span style={{color: 'red'}}>Attention</span>
                            </DialogTitle>
                            <DialogContent>
                              {!ledgerErrorCode ?
                                <DialogContentText className="black-text">
                                  Please connect the Ledger device, enter pin, open NEAR app, and repeat again.
                                </DialogContentText> : null}

                              {ledgerErrorCode.toString().includes('The device is already open') ?
                                <DialogContentText className="black-text">
                                  The device is already open
                                </DialogContentText> : null}

                              {ledgerErrorCode.toString().includes('navigator.hid is not supported') ?
                                <DialogContentText className="red-text">
                                  <b>Navigator.hid is not supported, please use another browser</b>
                                </DialogContentText> : null}

                              {ledgerErrorCode.toString().includes('no matching keys found for this account') ?
                                <DialogContentText className="red-text">
                                  <b>No matching keys found for this account, please select another account</b>
                                </DialogContentText> : null}

                              {ledgerErrorCode.toString().includes('UNKNOWN_ERROR') ?
                                <DialogContentText className="red-text" align="center">
                                  Unknown error occurred, please re-connect the Ledger device, enter the pin, open NEAR
                                  app,
                                  and repeat
                                  again.
                                  <br/><br/>
                                  <Divider/>
                                  <br/>
                                  {ledgerErrorCode.toString()}
                                </DialogContentText> : null}

                              <DialogContentText className="red-text" align="center">
                                <Divider/>
                                <br/>
                                {ledgerErrorCode.toString()}
                              </DialogContentText>


                            </DialogContent>
                            <DialogActions>
                              <Button onClick={handleDialogOpen} autoFocus>
                                Close
                              </Button>
                            </DialogActions>
                          </Dialog>
                          : null}
                        {ledgerDialogOpen ?
                          <Dialog
                            open={ledgerDialogOpen}
                            aria-labelledby="lockup-data"
                          >
                            <DialogTitle style={{wordBreak: "break-word"}} id="lockup-data">
                              <span style={{color: 'green'}}>Signing with Ledger</span>
                            </DialogTitle>
                            <DialogContent>
                              <DialogContentText className="red-text" align="center">
                                <Divider/>
                                <br/>
                                {ledgerDialogMessage.toString()}
                              </DialogContentText>
                            </DialogContent>
                            <DialogActions>
                              <Button onClick={handleLedgerDialogOpen} autoFocus>
                                Close
                              </Button>
                            </DialogActions>
                          </Dialog>
                          : null}
                      </Grid>
                      : null}
                  </ValidatorForm>
                  <ValidatorForm
                    onSubmit={handleAddLedger}
                    onError={errors => console.log(errors)}
                  >
                    <Grid container justify="flex-end" spacing={2} style={{marginTop: 20}}>
                      {checkedUseMultisig ?
                        <>
                          <Button
                            style={{marginRight: 10}}
                            variant="contained"
                            color="primary" type="submit"
                            disabled={disableAddFundingAccount}
                            onClick={() => {
                              setAddFundingAccount(true)
                            }}
                          >Add/Change Funding Account</Button>
                        </>
                        : null}
                    </Grid>
                  </ValidatorForm>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <ViewLockups/>
            </Grid>
          </Grid>
        </Container>
        {stateCtx.config.sentTx !== null && !showSpinner ?
          <CallbackDialog/>
          : null}
        <Footer/>
      </div>
    );
  }
;

export default Lockups;
