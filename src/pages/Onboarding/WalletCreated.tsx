import {
  HorizontalFlex,
  PinIcon,
  PuzzleIcon,
  Typography,
  VerticalFlex,
} from '@avalabs/react-components';
import { BetaLabel } from '@src/components/icons/BetaLabel';
import { BrandName } from '@src/components/icons/BrandName';
import { Logo } from '@src/components/icons/Logo';
import { useLedgerContext } from '@src/contexts/LedgerProvider';
import { useEffect } from 'react';
import styled, { useTheme } from 'styled-components';
import { t } from 'i18next';
import { Trans } from 'react-i18next';

const WalletCreatedCard = styled(HorizontalFlex)`
  width: 450px;
  border-radius: ${({ theme }) => theme.borderRadius};
  position: absolute;
  top: 40px;
  right: 40px;
  background: ${({ theme }) => theme.palette.white};
  padding: 16px;
  align-items: center;
`;

export function WalletCreated() {
  const theme = useTheme();
  const { closeTransport } = useLedgerContext();

  // we must close the transport otherwise the ledger will be used by the WalletCreated page and the extension
  // so the LedgerProvider will close both of tabs after we open the extension
  useEffect(() => {
    closeTransport();
  }, [closeTransport]);

  return (
    <VerticalFlex
      align="center"
      justify="center"
      width="100%"
      height="100%"
      position="relative"
    >
      <WalletCreatedCard>
        <Logo height={34} darkMode={false} />
        <VerticalFlex margin="0 0 0 16px" justify="center">
          <Typography
            color={theme.palette.green[700]}
            weight={700}
            size={18}
            height="22px"
            margin="0 0 4px 0"
          >
            {t('Wallet created!')}
          </Typography>
          <Typography
            color={theme.palette.grey[900]}
            weight={600}
            size={16}
            height="24px"
            margin="0 0 4px 0"
          >
            {t('Pin the Core extension')}
          </Typography>
          <Typography color={theme.palette.grey[900]} size={16} height="24px">
            <Trans
              i18nKey="Click <puzzleIcon /> and then <pinIcon /> for easy wallet access."
              components={{
                puzzleIcon: (
                  <PuzzleIcon color={theme.colors.bg1} height="18px" />
                ),
                pinIcon: <PinIcon color={theme.colors.bg1} height="18px" />,
              }}
            />
          </Typography>
        </VerticalFlex>
      </WalletCreatedCard>
      <VerticalFlex>
        <Logo height={150} />
        <BrandName height={58} margin="24px 0 0 0" />
        <HorizontalFlex justify="flex-end" width="100%" margin="10px 0 0 0">
          <BetaLabel />
        </HorizontalFlex>
      </VerticalFlex>
    </VerticalFlex>
  );
}
