import React, { useState } from 'react';
import {
  VerticalFlex,
  Input,
  PrimaryButton,
  Typography,
  HorizontalSeparator,
  HorizontalFlex,
  SecondaryButton,
} from '@avalabs/react-components';
import { useOnboardState } from '@src/store/onboard/useOnboardState';
import { OnboardStepPhase } from '@src/store/onboard/onboardStore';
import { onboardingService } from '@src/background/services';
import { OnboardingPhase } from '@src/background/services/onboarding/models';

function verifyPasswordsMatch(pass1?: string, pass2?: string) {
  return !!(pass1 && pass2 && pass1 === pass2);
}

const PASSWORD_ERROR = 'Passwords do not match';

export const CreatePassword = (props: any) => {
  const [canSubmit, setCanSubmit] = useState(false);
  const [passwordVal, setPasswordVal] = useState('');
  const [confirmPasswordVal, setConfirmPasswordVal] = useState('');
  const [error, setError] = useState('');

  const { goToNextOnboardingStep, goBackToPreviousOnboardingStep } =
    useOnboardState(OnboardingPhase.PASSWORD);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const passwordsMatch = verifyPasswordsMatch(value, confirmPasswordVal);
    setPasswordVal(value);
    !passwordsMatch && setError(PASSWORD_ERROR);
    setCanSubmit(passwordsMatch);
  };

  const handlePasswordConfirmChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { value } = e.target;
    const passwordsMatch = verifyPasswordsMatch(passwordVal, value);
    setConfirmPasswordVal(value);
    passwordsMatch && setError(PASSWORD_ERROR);
    setCanSubmit(passwordsMatch);
  };

  return (
    <VerticalFlex align={'center'} width={'100%'}>
      <Typography>Create a Password</Typography>
      <HorizontalSeparator />
      <br />
      <br />
      <Typography size={14}>You will use this to unlock your wallet</Typography>
      <br />
      <Input
        onChange={handlePasswordChange}
        placeholder="Password"
        type="password"
        style={{ maxWidth: '300px' }}
      />
      <br />
      <Input
        onChange={handlePasswordConfirmChange}
        placeholder="Confirm Password"
        type="password"
        style={{ maxWidth: '300px' }}
      />
      <br />

      <HorizontalFlex style={{ minHeight: '30px' }}>
        {error && passwordVal && confirmPasswordVal && (
          <Typography size={14}>{error}</Typography>
        )}
      </HorizontalFlex>
      <HorizontalFlex>
        <SecondaryButton
          onClick={() => {
            goBackToPreviousOnboardingStep && goBackToPreviousOnboardingStep();
          }}
        >
          Back
        </SecondaryButton>
        <PrimaryButton
          disabled={!canSubmit}
          onClick={() => {
            onboardingService.setPassword(passwordVal);
            goToNextOnboardingStep && goToNextOnboardingStep();
          }}
        >
          Save
        </PrimaryButton>
      </HorizontalFlex>
    </VerticalFlex>
  );
};
