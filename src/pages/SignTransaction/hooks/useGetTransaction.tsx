import { useCallback, useMemo, useEffect, useState } from 'react';
import { Transaction } from '@src/background/services/transactions/models';
import { useConnectionContext } from '@src/contexts/ConnectionProvider';
import { filter, map, Subscription, take } from 'rxjs';
import { ExtensionRequest } from '@src/background/connections/extensionConnection/models';
import { transactionFinalizedUpdateListener } from '@src/background/services/transactions/events/transactionFinalizedUpdateListener';
import { calculateGasAndFees } from '@src/utils/calculateGasAndFees';
import Web3 from 'web3';
import ERC20 from '@openzeppelin/contracts/build/contracts/ERC20.json';
import { Limit, SpendLimit } from '../CustomSpendLimit';
import { GasFeeModifier } from '@src/components/common/CustomFeesK2';
import {
  bigToLocaleString,
  bnToBig,
  bnToLocaleString,
  hexToBN,
} from '@avalabs/utils-sdk';
import { useNetworkFeeContext } from '@src/contexts/NetworkFeeProvider';
import { useNativeTokenPrice } from '@src/hooks/useTokenPrice';
import { useNetworkContext } from '@src/contexts/NetworkProvider';
import { UpdateTransactionHandler } from '@src/background/services/transactions/handlers/updateTransaction';
import { GetTransactionHandler } from '@src/background/services/transactions/handlers/getTransaction';
import { BigNumber, constants } from 'ethers';
import { NetworkFee } from '@src/background/services/networkFee/models';
import { Network } from '@avalabs/chains-sdk';
import { useFeatureFlagContext } from '@src/contexts/FeatureFlagsProvider';
import { FeatureGates } from '@avalabs/posthog-sdk';
import { useDialog } from '@src/contexts/DialogContextProvider';
import { BN } from 'bn.js';

export const UNLIMITED_SPEND_LIMIT_LABEL = 'Unlimited';

export function useGetTransaction(requestId: string) {
  // Target network of the transaction defined by the chainId param. May differ from the active one.
  const [network, setNetwork] = useState<Network | undefined>(undefined);
  const [networkFee, setNetworkFee] = useState<NetworkFee | null>(null);
  const { request, events } = useConnectionContext();
  const tokenPrice = useNativeTokenPrice(network);
  const { getNetworkFeeForNetwork } = useNetworkFeeContext();
  const { getNetwork, network: activeNetwork } = useNetworkContext();
  const { featureFlags } = useFeatureFlagContext();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [customGas, setCustomGas] = useState<{
    gasLimit?: number;
    maxFeePerGas: BigNumber;
    maxPriorityFeePerGas?: BigNumber;
  } | null>(null);
  const [hash, setHash] = useState<string>('');
  const [showCustomSpendLimit, setShowCustomSpendLimit] =
    useState<boolean>(false);
  const [showRawTransactionData, setShowRawTransactionData] = useState(false);
  const [displaySpendLimit, setDisplaySpendLimit] = useState<string>(
    UNLIMITED_SPEND_LIMIT_LABEL
  );
  const [limitFiatValue, setLimitFiatValue] = useState<string | null>(
    UNLIMITED_SPEND_LIMIT_LABEL
  );
  const [customSpendLimit, setCustomSpendLimit] = useState<SpendLimit>({
    limitType: Limit.DEFAULT,
  });
  const [selectedGasFee, setSelectedGasFee] = useState<GasFeeModifier>(
    GasFeeModifier.NORMAL
  );
  const { showDialog, clearDialog } = useDialog();
  const [hasTransactionError, setHasTransactionError] = useState(false);

  const updateTransaction = useCallback(
    (update) => {
      return request<UpdateTransactionHandler>({
        method: ExtensionRequest.TRANSACTIONS_UPDATE,
        params: [update],
      });
    },
    [request]
  );

  const setCustomFee = useCallback(
    (
      values: {
        customGasLimit?: number;
        maxFeePerGas: BigNumber;
        maxPriorityFeePerGas?: BigNumber;
        feeType: GasFeeModifier;
      },
      tx?: Transaction
    ) => {
      const currentTx = tx ?? transaction;

      setCustomGas((currentGas) => ({
        gasLimit: values.customGasLimit ?? currentGas?.gasLimit,
        maxFeePerGas: values.maxFeePerGas ?? currentGas?.maxFeePerGas,
        maxPriorityFeePerGas:
          values.maxPriorityFeePerGas ?? currentGas?.maxPriorityFeePerGas,
      }));
      setSelectedGasFee(values.feeType);

      const feeDisplayValues = calculateGasAndFees({
        maxFeePerGas: values.maxFeePerGas,
        gasLimit:
          values.customGasLimit ??
          customGas?.gasLimit ??
          currentTx?.displayValues.gasLimit,
        tokenPrice,
        tokenDecimals: network?.networkToken.decimals,
      });

      updateTransaction({
        id: currentTx?.id,
        params: {
          gas: feeDisplayValues.gasLimit.toString(),
          maxFeePerGas: feeDisplayValues.maxFeePerGas,
          maxPriorityFeePerGas: values.maxPriorityFeePerGas,
        },
      });
    },
    [
      network?.networkToken.decimals,
      tokenPrice,
      customGas?.gasLimit,
      transaction,
      updateTransaction,
    ]
  );

  const updateLimitFiatValue = useCallback(
    (spendLimit: SpendLimit) => {
      if (spendLimit.limitType === Limit.UNLIMITED) {
        setLimitFiatValue(UNLIMITED_SPEND_LIMIT_LABEL);
      } else {
        const price =
          transaction?.displayValues?.tokenToBeApproved?.price?.value;
        const amount =
          spendLimit.limitType === Limit.CUSTOM
            ? spendLimit.value?.bn ?? new BN(0)
            : hexToBN(transaction?.displayValues?.approveData?.limit);

        // If we don't know the price, let's not show anything.
        if (!price) {
          setLimitFiatValue(null);
        } else {
          const fiatValue = bnToBig(
            amount,
            transaction.displayValues.tokenToBeApproved.decimals
          ).mul(price);
          setLimitFiatValue(bigToLocaleString(fiatValue, 4));
        }
      }
    },
    [setLimitFiatValue, transaction]
  );

  const setSpendLimit = useCallback(
    (customSpendData: SpendLimit) => {
      const srcToken: string =
        transaction?.displayValues.tokenToBeApproved.address;
      const spenderAddress: string =
        transaction?.displayValues.approveData.spender;
      let limitAmount = '';

      if (customSpendData.limitType === Limit.UNLIMITED) {
        setCustomSpendLimit({
          ...customSpendData,
          value: undefined,
        });
        limitAmount = constants.MaxUint256.toHexString();
        setDisplaySpendLimit(UNLIMITED_SPEND_LIMIT_LABEL);
      } else {
        setCustomSpendLimit(customSpendData);
        setDisplaySpendLimit(
          customSpendData.limitType === Limit.CUSTOM
            ? customSpendData.value?.amount || '0'
            : bnToLocaleString(
                hexToBN(transaction?.displayValues.approveData.limit),
                transaction?.displayValues.tokenToBeApproved.decimals
              )
        );
        limitAmount =
          customSpendData.limitType === Limit.CUSTOM
            ? customSpendData.value?.bn.toString()
            : transaction?.displayValues?.approveData?.limit;
      }
      updateLimitFiatValue(customSpendData);

      // create hex string for approval amount
      const web3 = new Web3();
      const contract = new web3.eth.Contract(ERC20.abi as any, srcToken);

      const hashedCustomSpend =
        limitAmount &&
        contract.methods.approve(spenderAddress, limitAmount).encodeABI();

      updateTransaction({
        id: transaction?.id,
        params: { data: hashedCustomSpend },
      });
    },
    [transaction, updateTransaction, updateLimitFiatValue]
  );

  useEffect(() => {
    request<GetTransactionHandler>({
      method: ExtensionRequest.TRANSACTIONS_GET,
      params: [requestId],
    }).then((tx) => {
      setTransaction(tx || null);
    });
    const subscriptions = new Subscription();

    subscriptions.add(
      events?.()
        .pipe(
          filter(transactionFinalizedUpdateListener),
          map(({ value }) => value),
          filter((tx) => tx.id === Number(requestId)),
          take(1)
        )
        .subscribe({
          next(tx) {
            setHash(tx?.txHash || '');
          },
        })
    );

    return () => {
      subscriptions.unsubscribe();
    };
    // only call this once, we need to get the transaction and subscriptions only once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (transaction?.displayValues?.approveData?.limit) {
      if (
        constants.MaxUint256.eq(transaction.displayValues.approveData.limit)
      ) {
        setDisplaySpendLimit(UNLIMITED_SPEND_LIMIT_LABEL);
        setLimitFiatValue(UNLIMITED_SPEND_LIMIT_LABEL);
      } else {
        const limit = hexToBN(transaction.displayValues.approveData.limit);

        setDisplaySpendLimit(
          bnToLocaleString(
            limit,
            transaction.displayValues.tokenToBeApproved.decimals
          )
        );

        const price =
          transaction?.displayValues?.tokenToBeApproved?.price?.value;

        if (typeof price !== 'number') {
          setLimitFiatValue(null);
        } else {
          // If we know the token price, let's show the spend limit's USD value as well
          const fiatValue = bnToBig(
            limit,
            transaction.displayValues.tokenToBeApproved.decimals
          ).mul(price);
          setLimitFiatValue(bigToLocaleString(fiatValue, 4));
        }
      }
    }
  }, [transaction]);

  useEffect(() => {
    const updateNetworkAndFees = async () => {
      if (network?.chainId) {
        setNetworkFee(await getNetworkFeeForNetwork(network?.chainId));
      }
    };

    updateNetworkAndFees();
  }, [getNetworkFeeForNetwork, network?.chainId]);

  useEffect(() => {
    const chainId = parseInt(transaction?.chainId ?? '');

    if (!featureFlags[FeatureGates.SENDTRANSACTION_CHAIN_ID_SUPPORT]) {
      if (transaction && activeNetwork && chainId !== activeNetwork?.chainId) {
        setHasTransactionError(true);
      } else {
        setNetwork(activeNetwork);
      }
    } else {
      setNetwork(getNetwork(chainId));
    }
  }, [
    getNetwork,
    showDialog,
    clearDialog,
    featureFlags,
    activeNetwork,
    transaction,
    updateTransaction,
    setHasTransactionError,
  ]);

  return useMemo(() => {
    const feeDisplayValues =
      networkFee &&
      transaction?.displayValues.gasLimit &&
      calculateGasAndFees({
        maxFeePerGas: customGas?.maxFeePerGas ?? networkFee.low.maxFee,
        gasLimit: customGas?.gasLimit ?? transaction.displayValues.gasLimit,
        tokenPrice,
        tokenDecimals: network?.networkToken.decimals,
      });

    return {
      ...transaction?.displayValues,
      id: transaction?.id,
      ...(transaction?.txParams ? { txParams: transaction?.txParams } : {}),
      ...feeDisplayValues,
      updateTransaction,
      hash,
      setCustomFee,
      showCustomSpendLimit,
      setShowCustomSpendLimit,
      showRawTransactionData,
      setShowRawTransactionData,
      setSpendLimit,
      limitFiatValue,
      displaySpendLimit,
      customSpendLimit,
      selectedGasFee,
      network,
      networkFee,
      hasTransactionError,
      setHasTransactionError,
    };
  }, [
    networkFee,
    network,
    transaction,
    customGas,
    tokenPrice,
    updateTransaction,
    hash,
    setCustomFee,
    showCustomSpendLimit,
    showRawTransactionData,
    setSpendLimit,
    limitFiatValue,
    displaySpendLimit,
    customSpendLimit,
    selectedGasFee,
    hasTransactionError,
    setHasTransactionError,
  ]);
}
