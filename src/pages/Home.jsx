import React from "react";
import CssBaseline from "@material-ui/core/CssBaseline";
import Navbar from "../components/Navbar";
import {
  Button,
  Card, CardActions,
  CardContent, CircularProgress,
  Container, Divider,
  FormControl,
  Grid, Icon,
  InputAdornment,
  InputLabel, makeStyles, MenuItem, Select,
  Typography
} from "@material-ui/core";
import CreateNewFolderOutlinedIcon from '@material-ui/icons/CreateNewFolderOutlined';
import Footer from "../components/Footer";
import {ValidatorForm} from "react-material-ui-form-validator";
import { Link } from 'react-router-dom';

const Home = () => {

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
  }));
  const classes = useStyles();

  return (
    <div className={classes.root}>
      <CssBaseline/>
      <Navbar/>
      <Container component="main" className={classes.main} maxWidth="xl">
        <Grid container
              direction="column"
              justify="center"
              alignItems="center"
              spacing={5}
        >
          <Grid item xs={12}>
            <Button
              variant="contained"
                            component={ Link }

              color="primary"
              size="large"
              className={classes.button}
              startIcon={<CreateNewFolderOutlinedIcon/>}
              to="/new"
            >
              Create new lockup
            </Button>
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              color="primary"
              component={ Link }
              size="large"
              className={classes.button}
              startIcon={<CreateNewFolderOutlinedIcon/>}
              to="/view"
            >
              View existing lockup
            </Button>
          </Grid>
        </Grid>
      </Container>
      <Footer/>
    </div>


  );
};

export default Home;
