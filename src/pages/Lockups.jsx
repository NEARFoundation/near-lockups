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
  Switch,
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
} from '../utils/funcs'
import {Decimal} from 'decimal.js';
import {useGlobalState, useGlobalMutation} from '../utils/container'


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
    /*
    const l = accountToLockup(nearConfig.lockupAccount, value)
    console.log(l)
    viewLookup(l).then((r) => {
        setLockup(r);
        setShowLockupData(true)
      }
    ).catch((e) => {
      console.log(e)
    });

     */
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
  const [open, setOpen] = useState(true);
  const [lockup, setLockup] = useState(null);

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  /*
    useEffect(() => {
      accountExists(stateCtx.config.sentTx.lockup).then((a) => {
        setLockup(false);
        if (a) {
          viewLookup(stateCtx.config.sentTx.lockup).then((r) => {
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

    console.log(lockup);
  */

  const handleCloseSuccess = () => {
    mutationCtx.updateConfig({
      createdLockups: [...stateCtx.config.createdLockups, {owner: stateCtx.config.sentTx.owner, timestamp: new Date()}],
      sentTx: null,
    })
    setOpen(false);
  };

  const handleCloseFail = () => {
    mutationCtx.updateConfig({
      sentTx: null,
    })
    setOpen(false);
  };


  return (

    <Dialog
      fullScreen={fullScreen}
      open={lockup !== null && open}
      aria-labelledby="sign-result"
    >
      <DialogTitle style={!lockup ? {color: 'red'} : {color: "green"}} id="sign-result">
        {!lockup ? "Error!" : "Success"}
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          {lockup ?
            <>
              <b>{stateCtx.config.sentTx.lockup}</b> with owner <a target="_blank"
                                                                   href={nearConfig.walletUrl + "/profile/" + stateCtx.config.sentTx.owner}>{stateCtx.config.sentTx.owner}</a> has
              been created.
            </>
            :
            <>
              <b>{stateCtx.config.sentTx.lockup}</b> with owner <a target="_blank"
                                                                   href={nearConfig.walletUrl + "/profile/" + stateCtx.config.sentTx.owner}>{stateCtx.config.sentTx.owner}</a> has
              {" "}<b><span style={{color: 'red'}}>not</span></b> been created, please try again.
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
    }));
    const classes = useStyles();

    const stateCtx = useGlobalState();
    const mutationCtx = useGlobalMutation();
    const [showSpinner, setShowSpinner] = useState(false);
    const [vestingStartTimestampDate, setVestingStartTimestampDate] = useState(null);
    const [vestingCliffTimestampDate, setVestingCliffTimestampDate] = useState(null);
    const [vestingEndTimestampDate, setVestingEndTimestampDate] = useState(null);
    const [lockupTimestampDate, setLockupTimestampDate] = useState(null);
    const [cliffStartDate, setCliffStartDate] = useState(null);
    const [vestingSchedule, setVestingSchedule] = useState(0);
    const [hideVesting, setHideVesting] = useState(true);
    const [disableCliffTime, setDisableCliffTime] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [checkedContractData, setCheckedContractData] = React.useState(true);

    const handleShowContractData = () => {
      setCheckedContractData((prev) => !prev);
    };


    const [state, setState] = useState({
      ownerAccountId: '',
      lockupAccountId: '',
      amount: '',
      lockupDuration: "0",
      releaseDuration: null,
      cliffMonths: 0,
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
        /* convert months to nanoseconds*/
        //const lockup_duration = new Decimal(state.lockupDuration).mul('2.628e+15');
        const release_duration = state.releaseDuration ? new Decimal(state.releaseDuration).mul('2.628e+15') : null;

        await window.contract.create({
            owner_account_id: state.ownerAccountId,
            lockup_duration: "0",
            lockup_timestamp: lockupTimestampDate ? dateToNs(lockupTimestampDate) : null,
            vesting_schedule: hideVesting ? null : {
              VestingSchedule: {
                start_timestamp: vestingStartTimestampDate ? dateToNs(vestingStartTimestampDate) : null,
                cliff_timestamp: vestingCliffTimestampDate ? dateToNs(vestingCliffTimestampDate) : null,
                end_timestamp: vestingEndTimestampDate ? dateToNs(vestingEndTimestampDate) : null,
              }
            },
            release_duration: release_duration,
          },
          new Decimal(lockupGas).toString(), amount.toString(),
        )
        console.log(state.ownerAccountId, duration, amount.toString())
      } catch (e) {
        console.log(e);
        //setShowError(e);
      } finally {
        setShowSpinner(false);
      }

    }

    const checkLockup = (event) => {
      event.preventDefault()
      const lockup = accountToLockup(nearConfig.lockupAccount, event.target.value.toLowerCase())
      setState((prevState) => ({...prevState, lockupAccountId: lockup}))
    }

    const handleChange = (event) => {
      if (event.target.name === "ownerAccountId") {
        console.log(event);
        event.preventDefault()
        setState((prevState) => ({...prevState, ownerAccountId: event.target.value.toLowerCase()}))
        if (event.target.value.length > 4) {
          const lockup = accountToLockup(nearConfig.lockupAccount, event.target.value.toLowerCase())
          setState((prevState) => ({...prevState, lockupAccountId: lockup}))
        }
      }
      if (event.target.name === "cliffMonths") {
        setState((prevState) => ({...prevState, cliffMonths: event.target.value}))

        if (cliffStartDate !== null) {
          const o = new Date(cliffStartDate.toString());
          let d = new Date(o.setMonth(o.getMonth() + event.target.value));
          setLockupTimestampDate(d.toLocaleDateString().split(",")[0]);
          console.log(d)
        }


      }
      if (event.target.name === "amount") {
        setState((prevState) => ({...prevState, amount: event.target.value}))
      }
      if (event.target.name === "lockupDuration") {
        setState((prevState) => ({...prevState, lockupDuration: event.target.value}))
      }
      if (event.target.name === "releaseDuration") {
        setState((prevState) => ({...prevState, releaseDuration: event.target.value}))
      }
      if (event.target.name === "hashSalt") {
        setState((prevState) => ({...prevState, hashSalt: event.target.value}))
      }
    }

    const handleCliffStartChange = (value) => {
      setState((prevState) => ({...prevState, cliffMonths: 0}))
      if (value === null) {
        setDisableCliffTime(true);
        setLockupTimestampDate(null);

      } else {
        setDisableCliffTime(false);
        setLockupTimestampDate(value.toLocaleDateString().split(",")[0]);

      }
      setCliffStartDate(value);
    }

    const handleVestingSelectChange = (event) => {
      if (event.target.value === 0) {
        setHideVesting(true);
      } else {
        setHideVesting(false);
      }
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
                      id="outlined-basic"
                      label="Enter Owner Account *"
                      variant="outlined"
                      name="ownerAccountId"
                      onChange={handleChange}
                      onBlur={checkLockup}
                      value={state.ownerAccountId}
                      validators={['required', 'isValidAccount']}
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
                      errorMessages={['this field is required', 'lockup account already exists']}
                    />
                    <TextValidator
                      className={classes.card}
                      id="amountId"
                      label="Amount in NEAR (min 35) *"
                      value={state.amount}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">Ⓝ</InputAdornment>,
                        inputComponent: numberFormatted,
                      }}
                      variant="outlined"
                      onChange={handleChange}
                      name="amount"
                      validators={['required']}
                      errorMessages={['this field is required']}
                    />
                    <Grid container spacing={3}>
                      {/*
                      <Grid item xs={12} md={12}>
                        <TextValidator
                          className={classes.card}
                          id="lockupDurationId"
                          label="Lockup Duration in Months *"
                          variant="outlined"
                          name="lockupDuration"
                          onChange={handleChange}
                          value={state.lockupDuration}
                        />
                      </Grid>
                      */}
                      <Grid item xs={12} md={6}>
                        <MuiPickersUtilsProvider utils={DateFnsUtils}>
                          <KeyboardDatePicker
                            fullWidth
                            variant="inline"
                            inputVariant="outlined"
                            autoOk
                            id="cliffStartDateId"
                            label="Cliff Start Date"
                            format="MMM dd yyyy"
                            value={cliffStartDate}
                            InputAdornmentProps={{position: "start"}}
                            onChange={handleCliffStartChange}
                          />
                        </MuiPickersUtilsProvider>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <SelectValidator
                          disabled={disableCliffTime}
                          variant="outlined"
                          onChange={handleChange}
                          className={classes.card}
                          id="cliffMonthsId"
                          name="cliffMonths"
                          label="Cliff time *"
                          value={state.cliffMonths}
                          SelectProps={{
                            native: false
                          }}
                          validators={["required"]}
                          errorMessages={["required"]}
                        >
                          <MenuItem value={0}>
                            <em>None</em>
                          </MenuItem>
                          <MenuItem value={12}>1 Year (12 months)</MenuItem>
                          <MenuItem value={24}>2 Years (24 months)</MenuItem>
                          <MenuItem value={36}>3 Years (36 months)</MenuItem>
                          <MenuItem value={48}>4 Years (48 months)</MenuItem>
                        </SelectValidator>
                      </Grid>

                      <Grid item xs={12} md={12}>
                        <TextValidator
                          className={classes.card}
                          id="releaseDurationId"
                          label="Release Duration in Months"
                          variant="outlined"
                          name="releaseDuration"
                          onChange={handleChange}
                          value={state.releaseDuration}
                        />
                      </Grid>
                    </Grid>
                    <Grid item xs={12} md={12}>
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
                      <Grid container spacing={3}>
                        <Grid item xs={12} md={4}>
                          <MuiPickersUtilsProvider utils={DateFnsUtils}>
                            <KeyboardDatePicker
                              required={!hideVesting}
                              fullWidth
                              variant="inline"
                              inputVariant="outlined"
                              autoOk
                              id="vestingStartTimestampId"
                              label="Start Timestamp"
                              format="MMM dd yyyy"
                              value={vestingStartTimestampDate}
                              InputAdornmentProps={{position: "start"}}
                              onChange={setVestingStartTimestampDate()}
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
                              onChange={vestingEndTimestampDate}
                            />
                          </MuiPickersUtilsProvider>
                        </Grid>
                      </Grid>
                      : null
                    }
                    <Grid container justify="flex-start" spacing={1} style={{marginTop: 20, marginLeft: 6}}>
                      <Grid item xs={12} md={12}>
                        <FormControlLabel
                          control={<Switch checked={checkedContractData} onChange={handleShowContractData}/>}
                          label="Show Raw Contract Data"
                        />
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <TextField id="outlined-basic"
                                   variant="outlined"
                                   disabled
                                   value={lockupTimestampDate}
                                   helperText="Lockup Timestamp"
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField id="outlined-basic"
                                   variant="outlined"
                                   disabled
                                   helperText="Release Duration (from Lockup cliff)"
                                   value={state.releaseDuration}
                        />
                      </Grid>
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
