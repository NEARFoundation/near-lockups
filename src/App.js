import React, {useEffect} from 'react';
import {Route, Switch} from 'react-router-dom';
import {BrowserRouterHook} from './utils/use-router';
import NotFound from "./pages/NotFound";
import Lockups from "./pages/Lockups";
import useMediaQuery from '@material-ui/core/useMediaQuery';
import {createMuiTheme, ThemeProvider} from '@material-ui/core/styles';
import CssBaseline from '@material-ui/core/CssBaseline';
import {useGlobalState, useGlobalMutation} from './utils/container'


const App = () => {
  const stateCtx = useGlobalState();
  const mutationCtx = useGlobalMutation();

  const theme = React.useMemo(
    () =>
      createMuiTheme({
        palette: {
          type: stateCtx.config.darkMode,
        },
      }),
    [stateCtx.config.darkMode],
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline/>
      <BrowserRouterHook>
        <Switch>
          <Route exact path="/" component={Lockups}/>
          <Route exact path="/view" component={Lockups}/>
          <Route path="*">
            <NotFound/>
          </Route>
        </Switch>
      </BrowserRouterHook>
    </ThemeProvider>
  )
}

export default App
