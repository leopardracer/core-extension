import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Typography,
  Button,
  LoadingDots,
  Stack,
  Box,
  useTheme,
  GlobeIcon,
} from '@avalabs/k2-components';
import { useAccountsContext } from '@src/contexts/AccountsProvider';
import { Account } from '@src/background/services/accounts/models';
import { TokenIcon } from '@src/components/common/TokenIcon';
import { usePermissionContext } from '@src/contexts/PermissionsProvider';
import { useApproveAction } from '@src/hooks/useApproveAction';
import { SiteAvatar } from '@src/components/common/SiteAvatar';
import { ActionStatus } from '@src/background/services/actions/models';
import { useGetRequestId } from '@src/hooks/useGetRequestId';
import { useTranslation } from 'react-i18next';
import {
  ContextContainer,
  useIsSpecificContextContainer,
} from '@src/hooks/useIsSpecificContextContainer';
import { AccountsDropdown } from './components/AccountsDropdown';

export function PermissionsPage() {
  const { t } = useTranslation();
  const requestId = useGetRequestId();
  const { permissions, isDomainConnectedToAccount } = usePermissionContext();
  const theme = useTheme();
  const {
    accounts: { active: activeAccount },
    allAccounts,
  } = useAccountsContext();
  const [selectedAccount, setSelectedAccount] = useState<Account>();
  const isConfirmContainer = useIsSpecificContextContainer(
    ContextContainer.CONFIRM
  );

  const {
    action: request,
    cancelHandler,
    updateAction,
  } = useApproveAction(requestId);
  const isSubmitting = request?.status === ActionStatus.SUBMITTING;

  const isEthRequestAccounts = request?.method === 'eth_requestAccounts';
  const isWalletRequestPermissions =
    request?.method === 'wallet_requestPermissions';

  const onApproveClicked = useCallback(async () => {
    if (!selectedAccount) {
      return;
    }

    updateAction({
      status: ActionStatus.SUBMITTING,
      id: requestId,
      result: selectedAccount.id,
    });
  }, [selectedAccount, updateAction, requestId]);

  const isAccountPermissionGranted = useMemo(
    () =>
      request &&
      activeAccount &&
      isDomainConnectedToAccount(
        request.displayData.domainUrl,
        activeAccount.addressC
      ) &&
      isConfirmContainer,
    [request, activeAccount, isDomainConnectedToAccount, isConfirmContainer]
  );

  // If the domain already has permissions for the active account, close the popup
  useEffect(() => {
    if (isAccountPermissionGranted && isEthRequestAccounts) {
      if (activeAccount?.id) {
        // make sure we return a response even if the site was already approved
        updateAction({
          status: ActionStatus.SUBMITTING,
          id: requestId,
          result: activeAccount.id,
        });
      } else {
        window.close();
      }
    }
  }, [
    activeAccount?.id,
    isAccountPermissionGranted,
    isEthRequestAccounts,
    requestId,
    updateAction,
  ]);

  // Must also wait for isAccountPermissionGranted since `onApproveClicked` is async
  if (
    !permissions ||
    !request ||
    (isAccountPermissionGranted && !isWalletRequestPermissions)
  ) {
    return <LoadingDots size={20} />;
  }

  return (
    <Stack
      sx={{
        width: '100%',
        px: 2,
        color: theme.palette.text.primary,
        justifyContent: 'space-between',
      }}
    >
      <Stack sx={{ gap: 3, py: 1.5 }}>
        <Box sx={{ width: '100%' }}>
          <Typography variant="h4">{t('Connect Core to Dapp')}</Typography>
        </Box>
        <Stack sx={{ gap: 2.5, alignItems: 'center' }}>
          <SiteAvatar sx={{ m: 0 }}>
            <TokenIcon
              height="48px"
              width="48px"
              src={request.displayData.domainIcon}
            >
              <GlobeIcon size={48} color={theme.palette.text.secondary} />
            </TokenIcon>
          </SiteAvatar>
          <Stack textAlign="center" gap={0.5}>
            <Typography variant="h5">
              {request.displayData.domainName}
            </Typography>
            <Typography
              sx={{ fontSize: 12, color: theme.palette.text.secondary }}
            >
              {request.displayData.domainUrl}
            </Typography>
          </Stack>
        </Stack>
        <AccountsDropdown
          accounts={allAccounts}
          activeAccount={activeAccount}
          onSelectedAccountChanged={(acc) => setSelectedAccount(acc)}
        />
      </Stack>
      <Stack
        sx={{
          width: '100%',
          justifyContent: 'space-between',
          textAlign: 'center',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            mb: 2,
            color: theme.palette.text.secondary,
          }}
          paragraph
        >
          {t('Only connect to sites that you trust.')}
        </Typography>
        <Stack
          sx={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            width: '100%',
            gap: 1,
          }}
        >
          <Button
            color="secondary"
            data-testid="connect-reject-btn"
            onClick={() => {
              cancelHandler();
              window.close();
            }}
            fullWidth
            size="large"
            disabled={isSubmitting}
          >
            {t('Reject')}
          </Button>
          <Button
            data-testid="connect-approve-btn"
            onClick={() => onApproveClicked()}
            fullWidth
            size="large"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            {isSubmitting ? '' : t('Approve')}
          </Button>
        </Stack>
      </Stack>
    </Stack>
  );
}
