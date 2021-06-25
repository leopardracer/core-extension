import { makeAutoObservable, autorun, observable, configure } from 'mobx';
import { persistStore } from '@src/utils/mobx';
import store from 'store';
import {
  UnapprovedTransaction,
  UnapprovedMessage,
  txParams,
  MessageType,
} from './types';
import { JsonRpcRequest } from 'json-rpc-engine';
import { removeTypeDuplicates } from '@babel/types';
import { Signal } from 'micro-signals';
import { getStoreFromStorage } from '@src/background/utils/storage';

const getTransactionOrMessageId = (id: UnapprovedTransaction['id']) => {
  return `${id}`;
};

const transactionFinalizedEvent = new Signal();
const messageFinalizedEvent = new Signal();

class TransactionStore {
  addrX: string = '';

  transactions: { [key: string]: UnapprovedTransaction } = {};
  _messages: { [key: string]: UnapprovedMessage } = {};
  get messages() {
    const transactionStore = getStoreFromStorage('TransactionStore');
    const messages = transactionStore._messages;
    return messages;
  }
  set messages(mess: any) {
    this._messages = mess;
  }

  transactionFinalizedEvent = transactionFinalizedEvent;
  messageFinalizedEvent = messageFinalizedEvent;

  constructor() {
    makeAutoObservable(this);
    persistStore(this, ['transactions', '_messages'], 'TransactionStore');
  }

  getUnnapprovedTxById(
    id: UnapprovedTransaction['id']
  ): UnapprovedTransaction | undefined {
    return this.transactions[getTransactionOrMessageId(id)];
  }

  getUnnaprovedMsgById(
    id: UnapprovedMessage['id']
  ): UnapprovedMessage | undefined {
    return this.messages[getTransactionOrMessageId(id)];
  }

  removeUnapprovedTransaction(id: string | number) {
    const { [getTransactionOrMessageId(id)]: _removed, ...remaining } =
      this.transactions;
    this.transactions = remaining;
  }

  removeUnapprovedMessage(id: string | number) {
    const { [getTransactionOrMessageId(id)]: _removed, ...remaining } =
      this.messages;
    this.messages = remaining;
  }

  async saveUnapprovedTx(data: JsonRpcRequest<any>, from: string) {
    const { params } = data;
    let { to, value, gas, gasPrice }: txParams = params;
    const now = new Date().getTime();

    let sampleTx = {
      id: data.id,
      time: now,
      status: 'string',
      metamaskNetworkId: '1',
      chainId: '0xa869',
      txParams: {
        from: from,
        to: to,
        value: value,
        gas: gas,
        gasPrice: gasPrice,
      },
      type: 'standard',
      transactionCategory: 'transfer',
    };

    this.transactions = {
      ...this.transactions,
      [getTransactionOrMessageId(sampleTx.id)]: sampleTx,
    };
    return;
  }

  async saveUnapprovedMsg(
    data: JsonRpcRequest<any>,
    from: string,
    signType: MessageType
  ) {
    const { params } = data;

    const now = new Date().getTime();

    let msgData: UnapprovedMessage = {
      id: data.id,
      from,
      time: now,
      status: 'unsigned',
      msgParams: params[1],
      type: signType,
    };

    this.messages = {
      ...this.messages,
      [getTransactionOrMessageId(msgData.id)]: msgData,
    };
    return;
  }

  async updateUnapprovedMsg({ status, id, result }) {
    const messId = getTransactionOrMessageId(id);
    const message = this.messages[messId];
    this.messages = {
      ...this.messages,
      [messId]: {
        ...message,
        status,
        result,
      } as UnapprovedMessage,
    };
  }

  async updateUnapprovedTransaction({ status, id, result }) {
    const txId = getTransactionOrMessageId(id);
    const transaction = this.transactions[txId];
    this.transactions = {
      ...this.transactions,
      [txId]: {
        ...transaction,
        status,
        txHash: result,
      } as UnapprovedTransaction,
    };
  }
}

export default TransactionStore;
