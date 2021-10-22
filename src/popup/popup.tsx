import React, { useMemo, useState } from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';
import Header from '@src/components/common/header/Header';
import {
  HorizontalFlex,
  LoadingIcon,
  VerticalFlex,
  DialogContextProvider,
} from '@avalabs/react-components';

const AddToken = React.lazy(() => {
  return import('../pages/AddToken/AddToken');
});

const SignMessage = React.lazy(() => {
  return import('../pages/SignMessage/SignMessage');
});

const PermissionsPage = React.lazy(() => {
  return import('../pages/Permissions/Permissions');
});

const SignTransactionPage = React.lazy(() => {
  return import('../pages/SignTransaction/SignTransactionFlow');
});

const SettingsPage = React.lazy(() => {
  return import('../pages/Settings/SettingsPage');
});

const TokenFlowPage = React.lazy(() => {
  return import('../pages/Wallet/TokenFlow.minimode');
});

import { WalletContextProvider } from '@src/contexts/WalletProvider';
import { NetworkContextProvider } from '@src/contexts/NetworkProvider';
import { ConnectionContextProvider } from '@src/contexts/ConnectionProvider';
import { OnboardingContextProvider } from '@src/contexts/OnboardingProvider';
import { SettingsContextProvider } from '@src/contexts/SettingsProvider';
import { HomeFlow } from '@src/pages/Home/HomeFlow';
import {
  ContextContainer,
  useIsSpecificContextContainer,
} from '@src/hooks/useIsSpecificContextContainer';

export function Popup() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isConfirm = useIsSpecificContextContainer(ContextContainer.CONFIRM);
  const isMiniMode = useIsSpecificContextContainer(ContextContainer.POPUP);
  const appWidth = useMemo(() => (isMiniMode ? '100%' : '1280px'), []);

  return (
    <DialogContextProvider>
      <ConnectionContextProvider>
        <OnboardingContextProvider>
          <NetworkContextProvider>
            <WalletContextProvider>
              <SettingsContextProvider>
                <VerticalFlex
                  style={isMiniMode ? { height: '500px', width: '500px' } : {}}
                  maxHeight={drawerOpen ? '100%' : 'auto'}
                  overflow={drawerOpen ? 'hidden' : 'auto'}
                  align="center"
                >
                  <VerticalFlex width="100%">
                    {!isConfirm ? (
                      <Header
                        onDrawerStateChanged={setDrawerOpen}
                        width={appWidth}
                      />
                    ) : (
                      ''
                    )}
                  </VerticalFlex>

                  <HorizontalFlex
                    flex={1}
                    justify={'center'}
                    margin={isMiniMode ? '' : '16px 0'}
                    maxWidth={isMiniMode ? '100%' : '90%'}
                    width={appWidth}
                  >
                    <Switch>
                      <Route path="/token/add">
                        <React.Suspense fallback={<LoadingIcon />}>
                          <AddToken />
                        </React.Suspense>
                      </Route>

                      <Route path="/home">
                        <HomeFlow />
                      </Route>

                      <Route path="/sign/transaction">
                        <React.Suspense fallback={<LoadingIcon />}>
                          <SignTransactionPage />
                        </React.Suspense>
                      </Route>

                      <Route path="/sign">
                        <React.Suspense fallback={<LoadingIcon />}>
                          <SignMessage />
                        </React.Suspense>
                      </Route>

                      <Route path="/permissions">
                        <React.Suspense fallback={<LoadingIcon />}>
                          <PermissionsPage />
                        </React.Suspense>
                      </Route>

                      <Route path="/settings">
                        <React.Suspense fallback={<LoadingIcon />}>
                          <SettingsPage />
                        </React.Suspense>
                      </Route>

                      {isMiniMode ? (
                        <Route path="/token">
                          <React.Suspense fallback={<LoadingIcon />}>
                            <TokenFlowPage />
                          </React.Suspense>
                        </Route>
                      ) : (
                        ''
                      )}

                      <Route path="/">
                        <Redirect to="/home" />
                      </Route>
                    </Switch>
                  </HorizontalFlex>
                </VerticalFlex>
              </SettingsContextProvider>
            </WalletContextProvider>
          </NetworkContextProvider>
        </OnboardingContextProvider>
      </ConnectionContextProvider>
    </DialogContextProvider>
  );
}

export default Popup;
