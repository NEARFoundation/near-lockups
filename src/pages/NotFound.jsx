import React from "react";
import CssBaseline from "@material-ui/core/CssBaseline";
import Navbar from "../components/Navbar";
import {Container, makeStyles} from "@material-ui/core";
import Footer from "../components/Footer";
import {blue} from "@material-ui/core/colors";


const NotFound = () => {

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

  return (

    <div>
      <div className={classes.root}>
        <CssBaseline/>
        <Navbar/>
        <Container component="main" className={classes.main}>
          <div align="center">404, Page Not Found</div>
        </Container>
        <Footer/>
      </div>
    </div>
  );
};

export default NotFound;
