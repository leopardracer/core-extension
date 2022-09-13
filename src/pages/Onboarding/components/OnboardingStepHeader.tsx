import {
  CaretIcon,
  CloseIcon,
  HorizontalFlex,
  IconDirection,
  TextButton,
  Typography,
} from '@avalabs/react-components';
import styled, { useTheme } from 'styled-components';

interface OnboardingStepHeaderProps {
  testId?: string;
  title?: string;
  onBack?: () => void;
  onClose?: () => void;
}

const Title = styled(Typography)`
  flex-grow: 1;
  line-height: 22px;
  font-size: 20px;
  font-weight: 700;
  text-align: center;
`;

export function OnboardingStepHeader({
  testId,
  title,
  onBack,
  onClose,
}: OnboardingStepHeaderProps) {
  const theme = useTheme();
  return (
    <HorizontalFlex width="100%" justify="space-between" align="center">
      {onBack && (
        <TextButton
          data-testid={`${testId}-back-button`}
          width="24px"
          padding="2px 0"
          onClick={onBack}
        >
          <CaretIcon
            direction={IconDirection.LEFT}
            height="18px"
            color={theme.colors.icon1}
          />
        </TextButton>
      )}
      {title && (
        <Title as="h1" data-testid={`${testId}-header`}>
          {title}
        </Title>
      )}
      {onClose && (
        <TextButton
          data-testid={`${testId}-close-button`}
          width="24px"
          padding="2px 0"
          onClick={onClose}
        >
          <CloseIcon height="18px" color={theme.colors.icon1} />
        </TextButton>
      )}
    </HorizontalFlex>
  );
}
