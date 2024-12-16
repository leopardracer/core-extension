import { useMemo } from 'react';

import { useCurrenciesContext } from '@src/contexts/CurrenciesProvider';
import { useSettingsContext } from '@src/contexts/SettingsProvider';
import { getCurrencyFormatter } from '@src/contexts/utils/getCurrencyFormatter';

type CurrencyConverter = (value: number) => string;

export const useConvertedCurrencyFormatter = (
  sourceCurrency = 'USD',
): CurrencyConverter => {
  const { convert, hasExchangeRate } = useCurrenciesContext();
  const { currency: targetCurrency, currencyFormatter } = useSettingsContext();
  const fallbackFormatter = useMemo(
    () => getCurrencyFormatter(sourceCurrency),
    [sourceCurrency],
  );
  const canConvert = useMemo(
    () => hasExchangeRate(sourceCurrency, targetCurrency),
    [sourceCurrency, targetCurrency, hasExchangeRate],
  );
  const needsConversion = canConvert && targetCurrency !== sourceCurrency;

  return useMemo(() => {
    if (!needsConversion) {
      return fallbackFormatter;
    }

    return (value: number) => {
      const converted = convert({
        amount: value,
        from: sourceCurrency,
        to: targetCurrency,
      }) as number;

      return currencyFormatter(converted);
    };
  }, [
    convert,
    currencyFormatter,
    fallbackFormatter,
    needsConversion,
    sourceCurrency,
    targetCurrency,
  ]);
};
