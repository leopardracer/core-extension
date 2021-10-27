import React, { useState } from 'react';
import {
  VerticalFlex,
  HorizontalFlex,
  Typography,
  Card,
  LoadingIcon,
} from '@avalabs/react-components';
import { Tab, TabList, TabPanel, Tabs } from '@src/components/common/Tabs';
import { WalletHomeSend } from '../Wallet/WalletHomeSend';
import { WalletHomeRecentTxs } from '../Wallet/WalletHomeRecentTxs';
import { WalletPortfolio } from '../Wallet/WalletPortfolio';
import { useTokensWithBalances } from '@src/hooks/useTokensWithBalances';
import { useEffect } from 'react';
import { AccountSelector } from '@src/components/common/account/AccountSelector';
import { SettingsMenu } from '@src/components/settings/SettingsMenu';
import { Receive } from '../Receive/Receive';
import { SettingsMenuFlow } from '@src/components/settings/SettingsMenuFlow';

const TABS_BOTTOM_PADDING = 16;
const SIDEBAR_WIDTH = 391;

function HomeSideBar() {
  const tokensWithBalances = useTokensWithBalances();
  const [showSend, setShowSend] = useState<boolean>();

  useEffect(() => {
    setShowSend(!!tokensWithBalances.length);
  }, [tokensWithBalances]);

  if (showSend === undefined) {
    return <LoadingIcon />;
  }

  return (
    <VerticalFlex
      flex={1}
      margin={`${TABS_BOTTOM_PADDING}px 0 0 0`}
      width={`${SIDEBAR_WIDTH}px`}
      style={{ minWidth: `${SIDEBAR_WIDTH}px` }}
    >
      <Card margin="0 0 16px">
        <Tabs defaultIndex={showSend ? 0 : 1}>
          <TabList $border={false}>
            <Tab disabled={!showSend}>
              <Typography weight={600} color={'inherit'}>
                Send
              </Typography>
            </Tab>
            <Tab>
              <Typography weight={600} color={'inherit'}>
                Receive
              </Typography>
            </Tab>
          </TabList>

          <TabPanel>
            <WalletHomeSend />
          </TabPanel>
          <TabPanel>
            <Receive />
          </TabPanel>
        </Tabs>
      </Card>
      <WalletHomeRecentTxs />
    </VerticalFlex>
  );
}

export function Home() {
  return (
    <Tabs>
      <HorizontalFlex align={'center'} justify={'space-between'}>
        <TabList $border={false}>
          <Tab $highlight={false} margin="0 40px 0 0">
            <Typography weight={700} size={18} color={'inherit'}>
              Portfolio
            </Typography>
          </Tab>
          <Tab $highlight={false} margin="0 40px 0 0">
            <Typography weight={700} size={18} color={'inherit'}>
              Buy
            </Typography>
          </Tab>
          <Tab $highlight={false} margin="0 40px 0 0">
            <Typography weight={700} size={18} color={'inherit'}>
              Earn
            </Typography>
          </Tab>
          <Tab $highlight={false} margin="0 40px 0 0">
            <Typography weight={700} size={18} color={'inherit'}>
              Studio
            </Typography>
          </Tab>
        </TabList>
        <HorizontalFlex align={'center'}>
          <AccountSelector />
          <SettingsMenuFlow />
        </HorizontalFlex>
      </HorizontalFlex>
      <HorizontalFlex>
        <VerticalFlex flex={3} margin={`${TABS_BOTTOM_PADDING}px 16px 0 0`}>
          <TabPanel>
            <WalletPortfolio />
          </TabPanel>
          <TabPanel></TabPanel>
          <TabPanel></TabPanel>
          <TabPanel></TabPanel>
        </VerticalFlex>
        <HomeSideBar />
      </HorizontalFlex>
    </Tabs>
  );
}
