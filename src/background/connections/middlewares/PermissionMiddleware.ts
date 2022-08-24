import { AccountsService } from '@src/background/services/accounts/AccountsService';
import { PermissionsService } from '@src/background/services/permissions/PermissionsService';
import { COREX_DOMAINS } from '../models';
import { Middleware } from './models';

const RESTRICTED_METHODS = Object.freeze([] as string[]);

/**
 * All unrestricted methods recognized by the PermissionController.
 * Unrestricted methods are ignored by the permission system, but every
 * JSON-RPC request seen by the permission system must correspond to a
 * restricted or unrestricted method, or the request will be rejected with a
 * "method not found" error.
 */
export const UNRESTRICTED_METHODS = Object.freeze([
  'eth_accounts',
  'eth_requestAccounts',
  'eth_blockNumber',
  'eth_call',
  'eth_chainId',
  'eth_coinbase',
  'eth_decrypt',
  'eth_estimateGas',
  'eth_feeHistory',
  'eth_gasPrice',
  'eth_getBalance',
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
  'eth_sendTransaction',
  'eth_sign',
  'eth_signTypedData',
  'eth_signTypedData_v1',
  'eth_signTypedData_v3',
  'eth_signTypedData_v4',
  'eth_submitHashrate',
  'eth_submitWork',
  'eth_syncing',
  'eth_uninstallFilter',
  'metamask_getProviderState',
  'metamask_sendDomainMetadata',
  'metamask_watchAsset',
  'net_listening',
  'net_peerCount',
  'net_version',
  'personal_ecRecover',
  'personal_sign',
  'wallet_switchEthereumChain',
  'wallet_addEthereumChain',
  'wallet_watchAsset',
  'web3_clientVersion',
  'web3_sha3',
  'avalanche_getIsDefaultExtensionState',
  'avalanche_selectWallet',
]);

const COREX_METHODS = Object.freeze([
  'avalanche_getContacts',
  'avalanche_getAccounts',
  'avalanche_bridgeAsset',
  'avalanche_getBridgeState',
  'avalanche_selectAccount',
]);

export function PermissionMiddleware(
  permissionService: PermissionsService,
  accountsService: AccountsService
): Middleware {
  return async (context, next, error) => {
    // check if domain has permission
    const permissions = await permissionService.getPermissions();
    const accounts = await accountsService.getAccounts();
    const activeAccountAddress = accounts.find((a) => a.active)?.addressC;

    if (
      activeAccountAddress &&
      context.domainMetadata?.domain &&
      permissions[context.domainMetadata.domain]?.accounts[activeAccountAddress]
    ) {
      // toggle authenticated since domain was previously approved
      context.authenticated = true;
    }

    if (RESTRICTED_METHODS.includes(context.request.data.method)) {
      if (context.authenticated === false) {
        error(new Error('No permission to access requested method.'));
      } else {
        next();
      }
      return;
    }

    if (COREX_METHODS.includes(context.request.data.method)) {
      const domain = context.domainMetadata?.domain
        ? context.domainMetadata.domain
        : '';

      if (context.authenticated === true && COREX_DOMAINS.includes(domain)) {
        next();
      } else {
        error(new Error('No permission to access requested method.'));
      }
      return;
    }
    if (!UNRESTRICTED_METHODS.includes(context.request.data.method)) {
      error(new Error('Unrecognized method'));
      return;
    }
    next();
  };
}
