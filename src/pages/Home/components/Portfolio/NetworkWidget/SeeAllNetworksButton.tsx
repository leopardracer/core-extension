import { useHistory } from 'react-router-dom';
import { NetworkCard } from './common/NetworkCard';
import { useTranslation } from 'react-i18next';
import { Stack, Typography } from '@avalabs/k2-components';

interface SeeAllNetworksButtonProps {
  isFullWidth: boolean;
}

export function SeeAllNetworksButton({
  isFullWidth,
}: SeeAllNetworksButtonProps) {
  const { t } = useTranslation();
  const history = useHistory();

  return isFullWidth ? (
    <NetworkCard
      data-testid="see-all-networks-button"
      sx={{
        width: '100%',
        textAlign: 'center',
      }}
      onClick={(e) => {
        e.stopPropagation();
        history.push('/networks?activeTab=NETWORKS');
      }}
    >
      {t('See all networks')}
    </NetworkCard>
  ) : (
    <NetworkCard
      data-testid="see-all-networks-button"
      sx={{
        width: '164px',
        display: 'inline-block',
        mb: 2,
        p: 2,
      }}
      onClick={() => history.push('/networks?activeTab=NETWORKS')}
    >
      <Stack
        justifyContent="center"
        alignItems="center"
        sx={{ height: '100%' }}
      >
        <Typography variant="body2" fontWeight="fontWeightSemibold">
          {t('See all networks')}
        </Typography>
      </Stack>
    </NetworkCard>
  );
}
