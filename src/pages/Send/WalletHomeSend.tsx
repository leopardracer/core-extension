import { TokenSearch, VerticalFlex } from '@avalabs/react-components';
import { AVAX_TOKEN, TokenWithBalance } from '@avalabs/wallet-react-components';
import { networkUpdatedEventListener } from '@src/background/services/network/events/networkUpdatedEventListener';
import { useConnectionContext } from '@src/contexts/ConnectionProvider';
import { useSetTokenInParams } from '@src/hooks/useSetTokenInParams';
import { useTokenFromParams } from '@src/hooks/useTokenFromParams';
import { useTokensWithBalances } from '@src/hooks/useTokensWithBalances';
import { useEffect } from 'react';
import { filter, map } from 'rxjs';
import { SendFlow } from './SendFlow';

export function WalletHomeSend() {
  const { events } = useConnectionContext();
  const setTokenInParams = useSetTokenInParams();
  const tokensWBalances = useTokensWithBalances();
  const selectedToken = useTokenFromParams();

  const onSelect = (token: TokenWithBalance) => {
    token.isAvax
      ? setTokenInParams(AVAX_TOKEN.symbol)
      : setTokenInParams(token.symbol);
  };

  useEffect(() => {
    if (!events) {
      return;
    }
    /**
     * We need to listen for network to update and when it does reset the token
     * selected back to avax since the previous token may not be on the network
     * but AVAX always is guaranteed
     */
    const eventsSub = events()
      .pipe(
        filter(networkUpdatedEventListener),
        map((evt) => evt.value)
      )
      .subscribe(() => {
        setTokenInParams(AVAX_TOKEN.symbol);
      });

    return () => {
      eventsSub.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <VerticalFlex padding="16px 0 0 0" height="496px" grow="1">
      <TokenSearch
        onSelect={(item) => onSelect(item as TokenWithBalance)}
        items={tokensWBalances}
        value={selectedToken}
        placeholder="Search"
      />
      <SendFlow />
    </VerticalFlex>
  );
}
