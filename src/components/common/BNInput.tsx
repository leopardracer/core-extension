import React, { useEffect, useState } from 'react';
import BN from 'bn.js';
import Big from 'big.js';
import {
  Stack,
  TextField,
  InputAdornment,
  Button,
  styled,
  CircularProgress,
} from '@avalabs/k2-components';
import { bnToLocaleString, numberToBN } from '@avalabs/utils-sdk';

Big.PE = 99;
Big.NE = -18;

export interface BNInputProps {
  value?: BN;
  denomination: number;
  onChange?(val: { bn: BN; amount: string }): void;
  placeholder?: string;
  min?: BN;
  max?: BN;
  isValueLoading?: boolean;
  error?: boolean;
}

const InputNumber = styled(TextField)`
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  width: 180px;
  padding: 0;
`;

function splitBN(val: string) {
  return val.includes('.') ? val.split('.') : [val, null];
}

export function BNInput({
  value,
  denomination,
  onChange,
  min = new BN(0),
  max,
  isValueLoading,
  error,
  ...props
}: BNInputProps) {
  const [valStr, setValStr] = useState('');
  useEffect(() => {
    if (value) {
      const valueAsBig = new Big(value.toString()).div(
        Math.pow(10, denomination)
      );
      /**
       * When deleting zeros after decimal, all zeros delete without this check.
       * This also preserves zeros in the input ui.
       */

      if (
        (!valStr || !valueAsBig.eq(valStr)) &&
        valueAsBig.toString() !== '0'
      ) {
        setValStr(valueAsBig.toString());
      }
    }
  }, [denomination, valStr, value]);

  const onValueChanged = (value: string) => {
    /**
     * Split the input and make sure the right side never exceeds
     * the denomination length
     */
    const [, endValue] = splitBN(value);

    if (!endValue || endValue.length <= denomination) {
      const valueToBn = numberToBN(value || 0, denomination);

      if (valueToBn.lt(min)) {
        return;
      }
      const oldValueToBn = numberToBN(valStr || 0, denomination);
      if (!valueToBn.eq(oldValueToBn)) {
        onChange?.({
          // used to removing leading & trailing zeros
          amount: value ? bnToLocaleString(valueToBn, denomination) : '0',
          bn: valueToBn,
        });
      }
      setValStr(value);
    }
  };

  const setMax = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!max) {
      return;
    }

    const big = new Big(max.toString()).div(Math.pow(10, denomination));
    onValueChanged(big.toString());
  };

  return (
    <Stack sx={{ position: 'relative' }}>
      <InputNumber
        light
        value={valStr}
        onChange={(e) => onValueChanged(e.target.value)}
        type="number"
        onKeyDown={(e) => {
          if (
            e.code === 'KeyE' ||
            e.key === '-' ||
            e.key === '+' ||
            e.key === 'ArrowUp' ||
            e.key === 'ArrowDown'
          ) {
            e.preventDefault();
          }
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
        error={error}
        placeholder="0.0"
        InputProps={{
          endAdornment:
            max && !isValueLoading ? (
              <InputAdornment position="end">
                <Button
                  variant="text"
                  size="small"
                  onClick={setMax}
                  sx={{ p: 0, justifyContent: 'flex-end' }}
                >
                  Max
                </Button>
              </InputAdornment>
            ) : (
              <CircularProgress size={16} sx={{ height: 'auto !important' }} />
            ),
          inputMode: 'text',
          sx: {
            py: 1,
            px: 2,
          },
        }}
        {...props}
      />
    </Stack>
  );
}
