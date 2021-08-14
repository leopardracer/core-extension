import { JsonRpcRequest, engine } from './jsonRpcEngine';
import { openExtensionNewWindow } from '@src/utils/extensionUtils';
import { formatAndLog, LoggerColors } from '../utils/logging';
import {
  CONNECT_METHOD,
  JSONRPCRequestWithDomain,
} from '../permissionsController';
import {
  messageService,
  permissionsService,
  personalSigRecovery,
  transactionService,
} from '../services';
import { MessageType } from '../services/messages/models';
import { txToCustomEvmTx } from '../services/transactions/utils/txToCustomEvmTx';
import { TxStatus } from '../services/transactions/models';
import { wallet } from '@src/background/services';
import { map, filter, mergeMap, firstValueFrom } from 'rxjs';
import { getAccountsFromWallet } from '../services/wallet/utils/getAccountsFromWallet';

/**
 * These are requests that are simply passthrough to the backend, they dont require
 * authentication or any special handling. We should be supporting all or most of
 *
 * @link https://eth.wiki/json-rpc/API#json-rpc-methods
 *
 * This list is currently a subset of the metamaks list and needs to be groomed, just
 * including this for now so we have something substantial
 */
const unauthenticatedRoutes = new Set([
  'eth_getAssetBalance',
  'eth_blockNumber',
  'eth_call',
  'eth_chainId',
  'eth_coinbase',
  'eth_decrypt',
  'eth_estimateGas',
  'eth_gasPrice',
  // 'eth_getBalance',
  'eth_getBlockByHash',
  'eth_getBlockByNumber',
  'eth_getBlockTransactionCountByHash',
  'eth_getBlockTransactionCountByNumber',
  'eth_getCode',
  'eth_getEncryptionPublicKey',
  'eth_getFilterChanges',
  'eth_getFilterLogs',
  'eth_getLogs',
  'eth_getProof',
  'eth_getStorageAt',
  'eth_getTransactionByBlockHashAndIndex',
  'eth_getTransactionByBlockNumberAndIndex',
  'eth_getTransactionByHash',
  'eth_getTransactionCount',
  'eth_getTransactionReceipt',
  'eth_getUncleByBlockHashAndIndex',
  'eth_getUncleByBlockNumberAndIndex',
  'eth_getUncleCountByBlockHash',
  'eth_getUncleCountByBlockNumber',
  'eth_getWork',
  'eth_hashrate',
  'eth_mining',
  'eth_newBlockFilter',
  'eth_newFilter',
  'eth_newPendingTransactionFilter',
  'eth_protocolVersion',
  'eth_sendRawTransaction',
  'eth_submitHashrate',
  'eth_submitWork',
  'eth_syncing',
  'eth_signTransaction',
  'eth_uninstallFilter',
  'net_version',
]);

async function signMessage(data: JsonRpcRequest<any>, type: MessageType) {
  const { listenForUpdates } = messageService.saveMessage(data, type);
  const window = await openExtensionNewWindow(`sign?id=${data.id}`);
  const result = await listenForUpdates(
    window.removed.pipe(map(() => 'Window closed before signed'))
  );

  return { ...data, result };
}

const web3CustomHandlers = {
  async eth_sendTransaction(data: JsonRpcRequest<any>) {
    const walletResult = await firstValueFrom(wallet);

    if (!walletResult) {
      return {
        ...data,
        error: 'wallet undefined',
      };
    }

    const { listenForTxPending } = transactionService.addTransaction(data);

    const window = await openExtensionNewWindow(
      `sign/transaction?id=${data.id}`
    );

    const pendingTx = await listenForTxPending(
      window.removed.pipe(map(() => 'Window closed before approved'))
    );

    return txToCustomEvmTx(pendingTx).then((params) => {
      if (!walletResult || !walletResult.sendCustomEvmTx) {
        throw new Error('wallet is undefined or sned tx method is malformed');
      }

      return walletResult
        .sendCustomEvmTx(
          params.gasPrice,
          params.gasLimit,
          params.data,
          params.to,
          params.value
        )
        .then((result) => {
          transactionService.updateTransactionStatus({
            status: TxStatus.SIGNED,
            id: data.id,
            result,
          });
          return { ...data, result };
        });
    });
  },

  async eth_getBalance(data: JsonRpcRequest<any>) {
    const walletResult = await firstValueFrom(wallet);

    if (!walletResult) {
      return {
        ...data,
        error: 'wallet undefined',
      };
    }

    return { ...data, result: walletResult.getAddressC() };
  },

  async eth_signTypedData(data: JsonRpcRequest<any>) {
    return await signMessage(data, MessageType.SIGN_TYPED_DATA);
  },

  async eth_signTypedData_v3(data: JsonRpcRequest<any>) {
    return await signMessage(data, MessageType.SIGN_TYPED_DATA_V3);
  },

  async eth_signTypedData_v4(data: JsonRpcRequest<any>) {
    return await signMessage(data, MessageType.SIGN_TYPED_DATA_V4);
  },

  async personal_sign(data: JsonRpcRequest<any>) {
    return await signMessage(data, MessageType.PERSONAL_SIGN);
  },

  // deprecated
  // async eth_sign(data: JsonRpcRequest<any>) {
  //   await store.transactionStore.saveUnapprovedMsg(data, 'eth_sign');
  //   openExtensionNewWindow(`sign?id=${data.id}`);

  //   const result = await storageListener
  //     .map(() => store.transactionStore.getUnnaprovedMsgById(data.id)?.result)
  //     .filter((result) => !!result)
  //     .promisify();

  //   return { ...data, result };
  // },

  async personal_ecRecover(data: JsonRpcRequest<any>) {
    const { params } = data;

    const msg = params[0];
    const signedResult = params[1];

    const result = await personalSigRecovery(msg, signedResult);

    return { ...data, result };
  },
  /**
   * This is called when the user requests to connect the via dapp. We need
   * to popup the permissions window, get permissions for the given domain
   * and then respond accordingly.
   *
   * @param data the rpc request
   * @returns
   */
  async [CONNECT_METHOD](data: JSONRPCRequestWithDomain) {
    const walletResult = await firstValueFrom(wallet);

    if (!walletResult) {
      return {
        ...data,
        error: 'wallet undefined',
      };
    }

    if (permissionsService.domainHasAccountsPermissions(data.domain)) {
      return {
        ...data,
        result: getAccountsFromWallet(walletResult),
      };
    }

    const window = await openExtensionNewWindow(
      `permissions`,
      `domain=${data.domain}`
    );
    /**
     * If the user updates permissions and then closes the window then the permissions are written and this
     * promise is resolved. If not and the window is closed before then the promise will also be resolved and
     * the consumer will be notified that the window closed prematurely
     */
    const hasPermissions = await firstValueFrom(
      permissionsService.listenForPermissionChanges().pipe(
        mergeMap(() => permissionsService.domainPermissionsExist(data.domain)),
        filter((hasPermissionsValues) => hasPermissionsValues),
        mergeMap(() =>
          permissionsService.domainHasAccountsPermissions(data.domain)
        )
        // merge()
      )
    );

    // window.removed.map(() => 'Window closed before permissions granted')

    return {
      ...data,
      result: hasPermissions ? getAccountsFromWallet(walletResult) : [],
    };
  },
  /**
   * This is called right away by dapps to see if its already connected
   *
   * @param data the rpc request
   * @returns an array of accounts the dapp has permissions for
   */
  async eth_accounts(data: JSONRPCRequestWithDomain) {
    const walletResult = await firstValueFrom(wallet);

    if (!walletResult) {
      return {
        ...data,
        error: 'wallet undefined',
      };
    }

    return {
      ...data,
      result: permissionsService.domainHasAccountsPermissions(data.domain)
        ? getAccountsFromWallet(walletResult)
        : [],
    };
  },
  async wallet_requestPermissions(data: JSONRPCRequestWithDomain) {
    const window = await openExtensionNewWindow(
      `permissions`,
      `domain=${data.domain}`
    );

    /**
     * At this point the user has previously given permissions and we are possibly editing them
     * and/or adding more permissions.
     */
    await firstValueFrom(
      window.removed.pipe(
        map(() => permissionsService.permissions[data.domain])
      )
    );

    return {
      ...data,
      result: permissionsService.getPermissionsConvertedToMetaMaskStructure(
        data.domain
      ),
    };
  },
  async wallet_getPermissions(data: JSONRPCRequestWithDomain) {
    return {
      ...data,
      result: permissionsService.getPermissionsConvertedToMetaMaskStructure(
        data.domain
      ),
    };
  },
};

export default {
  getHandlerForKey(data: JsonRpcRequest<any>) {
    const customHandler =
      web3CustomHandlers[data.method] &&
      ((data) => {
        return web3CustomHandlers[data.method](data).then((result) => {
          formatAndLog('Wallet Controller: (web 3 custom response)', result, {
            color: LoggerColors.success,
          });
          return result;
        });
      });

    return customHandler
      ? () => customHandler(data)
      : unauthenticatedRoutes.has(data.method) &&
          (() =>
            engine()
              .then((e) => e.handle(data))
              .then((result) => {
                formatAndLog(
                  'Wallet Controller: (web 3 response)',
                  { ...data, result },
                  {
                    color: LoggerColors.success,
                  }
                );
                return result;
              }));
  },
};
