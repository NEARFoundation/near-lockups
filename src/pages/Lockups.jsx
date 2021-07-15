import React, {useEffect, useState} from "react";
import {useParams} from "react-router-dom";

import {
  Button,
  Card,
  CardActions,
  CardContent,
  Container,
  Grid,
  makeStyles,
  InputAdornment,
  Typography,
  Icon,
  CircularProgress,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Divider,
  Link,
  FormControlLabel,
  Switch, Collapse, IconButton,
} from "@material-ui/core";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
} from '@material-ui/pickers';
import {blue} from '@material-ui/core/colors';
import DateFnsUtils from '@date-io/date-fns';
import {useTheme} from '@material-ui/core/styles';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import CssBaseline from "@material-ui/core/CssBaseline";
import {TextValidator, ValidatorForm, SelectValidator} from 'react-material-ui-form-validator';
import {DataGrid, GridToolbarContainer, GridToolbarExport,} from '@material-ui/data-grid';
import LockupData from "../components/LockupData";

import * as nearApi from "near-api-js";
import getConfig from "../config";
import {
  accountToLockup,
  numberFormatted,
  dateToNs,
  truncate,
  viewLookup, viewLookupOld, viewLookupNew, timestampToReadable
} from '../utils/funcs'
import {Decimal} from 'decimal.js';
import {useGlobalState, useGlobalMutation} from '../utils/container'
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
      <Card className={classes.card} variant="outlined">
        <Typography align="center" variant="h5" style={{marginTop: 10}}>
          Recently created
        </Typography>
        <Divider light/>
        <div style={{height: 400, width: '100%'}}>
          <DataGrid rows={rows} columns={columns}
                    components={{
                      Toolbar: ExportToolbar,
                    }}
                    pageSize={5}
                    checkboxSelection
          />
        </div>
        <CardContent>
          <Divider light/>
        </CardContent>
        <CardActions>
          <Grid container spacing={1}>
            <Grid item xs={12} md={7}>
              <Button
                fullWidth
                variant="contained"
                color="grey"
                type="submit"
              >Email Lockup owners</Button>
            </Grid>
          </Grid>
        </CardActions>
      </Card>
      {showLockupData ? <LockupData lockup={lockup} onClose={onClose}/> : null}
    </>
  )
}

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
          <Button color="primary">
            Email User Now
          </Button>
          : null}
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

    const stateCtx = useGlobalState();
    const mutationCtx = useGlobalMutation();
    const router = useRouter();
    const [showSpinner, setShowSpinner] = useState(false);
    const [vestingStartTimestampDate, setVestingStartTimestampDate] = useState(null);
    const [vestingCliffTimestampDate, setVestingCliffTimestampDate] = useState(null);
    const [vestingEndTimestampDate, setVestingEndTimestampDate] = useState(null);
    const [vestingSchedule, setVestingSchedule] = useState(0);
    const [hideVesting, setHideVesting] = useState(true);
    const [lockupStartDate, setLockupStartDate] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [checkedContractData, setCheckedContractData] = useState(false);

    const handleShowContractData = () => {
      setCheckedContractData((prev) => !prev);
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

    const handleSubmit = async () => {

      mutationCtx.updateConfig({
        sentTx: {
          lockup: accountToLockup(nearConfig.lockupAccount, state.ownerAccountId),
          owner: state.ownerAccountId
        },
      });

      try {
        setShowSpinner(true);
        const amount = nearApi.utils.format.parseNearAmount(state.amount);
        const releaseDuration = state.releaseDuration !== null ? new Decimal(state.releaseDuration).mul('2.628e+15').toFixed().toString() : null;
        const lockupTimestamp = lockupStartDate ? dateToNs(lockupStartDate) : null;

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


    const dryRun = () => {
      const amount = nearApi.utils.format.parseNearAmount(state.amount);
      const releaseDuration = state.releaseDuration ? new Decimal(state.releaseDuration).mul('2.628e+15').toFixed().toString() : null;
      const lockupTimestamp = lockupStartDate ? dateToNs(lockupStartDate) : null;


      const jsonData = {
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
      }


      return jsonData;
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
                              <li><b>Lockup Start Date</b> or lockup timestamp - the moment when tokens start linearly
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
                            label="Lockup Start Date"
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
                          <MenuItem value={24}>2 Years (24 months)</MenuItem>
                          <MenuItem value={36}>3 Years (36 months)</MenuItem>
                          <MenuItem value={48}>4 Years (48 months)</MenuItem>
                        </SelectValidator>
                      </Grid>

                    </Grid>
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
                            <MenuItem value={0}>None</MenuItem>
                            <MenuItem value={1}>Vesting Schedule</MenuItem>
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

                    <Grid container justify="flex-start" spacing={1} style={{marginTop: 20, marginLeft: 6}}>
                      <Grid item xs={12} md={12}>
                        <FormControlLabel
                          disabled={!accountValidator || !amountValidator || !lockupValidator}
                          control={<Switch checked={checkedContractData} onChange={handleShowContractData}/>}
                          label="Show Raw Contract Data"
                        />
                      </Grid>
                      {checkedContractData ?
                        <Grid xs={12} item>
                          <ReactJson collapsed={false} displayDataTypes={false} displayArrayKey={false} name={false}
                                     theme={stateCtx.config.darkMode === "light" ? "bright:inverted" : "tomorrow"}
                                     src={dryRun()}/>
                        </Grid>
                        : null}
                    </Grid>
                    <Grid container justify="flex-end" spacing={2} style={{marginTop: 20}}>
                      <Button
                        variant="contained"
                        color="primary" type="submit"
                        endIcon={<Icon>send</Icon>}
                        disabled={!window.walletConnection.isSignedIn()}
                      >SIGN</Button>
                      {showSpinner && <CircularProgress size={48} className={classes.buttonProgress}/>}
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
