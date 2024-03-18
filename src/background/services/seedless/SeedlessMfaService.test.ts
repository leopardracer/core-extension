import { CubeSigner, SignerSession } from '@cubist-labs/cubesigner-sdk';

import { SecretsService } from '../secrets/SecretsService';

import { SeedlessMfaService } from './SeedlessMfaService';
import { MfaRequestData, MfaRequestType, SeedlessEvents } from './models';

jest.mock('@cubist-labs/cubesigner-sdk');

const tabId = 852;

describe('src/background/services/seedless/SeedlessMfaService.ts', () => {
  const secretsService = jest.mocked<SecretsService>({} as any);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('.requestMfa()', () => {
    let service: SeedlessMfaService;

    beforeEach(async () => {
      service = new SeedlessMfaService(secretsService);
    });

    describe('when extension is locked', () => {
      beforeEach(() => {
        service.onLock();
      });

      it('does not pass the MFA requests to the UI', () => {
        const eventListener = jest.fn();
        service.addListener(SeedlessEvents.MfaRequest, eventListener);

        const request: MfaRequestData = {
          mfaId: 'abcd-1234',
          type: MfaRequestType.Totp,
          tabId,
        };
        service.requestMfa(request);

        expect(eventListener).not.toHaveBeenCalled();
      });
    });

    describe('when extension is unlocked', () => {
      beforeEach(() => {
        service.onUnlock();
      });

      it('pushes the requests through the event emitter', () => {
        const eventListener = jest.fn();
        service.addListener(SeedlessEvents.MfaRequest, eventListener);

        const mfaId = 'abcd-1234';
        const request: MfaRequestData = {
          mfaId,
          type: MfaRequestType.Totp,
          tabId,
        };

        // Send request
        service.requestMfa(request);

        expect(eventListener).toBeCalledTimes(1);
        expect(eventListener).toBeCalledWith({
          ...request,
          options: undefined,
        });
      });

      it('only handles responses with matching mfaId', (done) => {
        const eventListener = jest.fn();
        service.addListener(SeedlessEvents.MfaRequest, eventListener);

        const mfaId = 'abcd-1234';
        const request: MfaRequestData = {
          mfaId,
          type: MfaRequestType.Totp,
          tabId,
        };

        // Send request
        const promise = service.requestMfa(request);

        // Mock response for a different request
        service.submitMfaResponse({
          mfaId: mfaId + '123',
          code: 'abcdef',
        });

        // Mock response for our request
        service.submitMfaResponse({
          mfaId,
          code: '123456',
        });

        promise.then((result) => {
          expect(result).toEqual('123456');
          done();
        });
      });
    });

    it('emits failure events', () => {
      const eventListener = jest.fn();
      service.addListener(SeedlessEvents.MfaFailure, eventListener);

      service.emitMfaError('1234', 1337);

      expect(eventListener).toHaveBeenCalledWith({
        mfaId: '1234',
        tabId: 1337,
      });
    });
  });

  describe('.getRecoveryMethods()', () => {
    let session: SignerSession;
    let service: SeedlessMfaService;

    beforeEach(() => {
      service = new SeedlessMfaService(secretsService);

      session = {
        user: jest.fn(),
      } as any;

      jest.mocked(CubeSigner.loadSignerSession).mockResolvedValueOnce(session);
    });

    it('fetches information about configured mfa methods', async () => {
      jest.mocked(session.user).mockResolvedValueOnce({
        mfa: [{ type: 'totp' }],
      } as any);

      expect(await service.getRecoveryMethods()).toEqual([{ type: 'totp' }]);
    });
  });

  describe('.initAuthenticatorChange()', () => {
    let session: jest.Mocked<SignerSession>;
    let service: SeedlessMfaService;

    beforeEach(() => {
      service = new SeedlessMfaService(secretsService);

      session = {
        resetTotpStart: jest.fn(),
        user: jest.fn().mockResolvedValue({ mfa: [{ type: 'totp' }] }),
      } as any;
    });

    describe('for non-seedless wallets', () => {
      beforeEach(() => {
        jest
          .mocked(CubeSigner.loadSignerSession)
          .mockRejectedValueOnce(new Error('Invalid session data'));
      });

      it('fails', async () => {
        await expect(service.initAuthenticatorChange()).rejects.toThrow(
          'Invalid session data'
        );
      });
    });

    it('initiates TOTP reset', async () => {
      jest.mocked(CubeSigner.loadSignerSession).mockResolvedValueOnce(session);

      try {
        await service.initAuthenticatorChange();
      } catch {
        expect(session.resetTotpStart).toHaveBeenCalledWith('Core');
      }
    });

    it('performs MFA verification and returns the TOTP challenge', async () => {
      const totpChallenge = {
        requiresMfa() {
          return true;
        },
        mfaId() {
          return 'mfaId';
        },
        approveTotp: jest.fn().mockResolvedValueOnce({
          data() {
            return {
              totpId: 'totpId',
              totpUrl: 'totpUrl',
            };
          },
        }),
      } as any;

      session.resetTotpStart.mockResolvedValue(totpChallenge);
      jest.mocked(CubeSigner.loadSignerSession).mockResolvedValue(session);
      jest.spyOn(service, 'requestMfa').mockResolvedValue('123456' as any);

      const result = await service.initAuthenticatorChange();
      expect(totpChallenge.approveTotp).toHaveBeenCalledWith(session, '123456');
      expect(result).toEqual({
        totpId: 'totpId',
        totpUrl: 'totpUrl',
      });
    });
  });

  describe('.completeAuthenticatorChange()', () => {
    let session: jest.Mocked<SignerSession>;
    let service: SeedlessMfaService;

    beforeEach(() => {
      service = new SeedlessMfaService(secretsService);

      session = {
        resetTotpComplete: jest.fn(),
        user: jest.fn().mockResolvedValue({ mfa: [{ type: 'totp' }] }),
      } as any;
    });

    describe('for non-seedless wallets', () => {
      beforeEach(() => {
        jest
          .mocked(CubeSigner.loadSignerSession)
          .mockRejectedValueOnce(new Error('Invalid session data'));
      });

      it('fails', async () => {
        await expect(
          service.completeAuthenticatorChange('totpId', '123456')
        ).rejects.toThrow('Invalid session data');
      });
    });

    it('completes the TOTP reset', async () => {
      jest.mocked(CubeSigner.loadSignerSession).mockResolvedValue(session);

      await service.completeAuthenticatorChange('totpId', '123456');

      expect(session.resetTotpComplete).toHaveBeenCalledWith(
        'totpId',
        '123456'
      );
    });

    it('emits the updated recovery methods', async () => {
      jest.mocked(CubeSigner.loadSignerSession).mockResolvedValue(session);

      const mfaMethods = [
        { type: 'totp' },
        { type: 'fido', id: 'id', name: 'name' },
      ];
      session.user.mockResolvedValue({
        mfa: mfaMethods,
      } as any);

      const listener = jest.fn();

      service.addListener(SeedlessEvents.MfaMethodsUpdated, listener);
      await service.completeAuthenticatorChange('totpId', '123456');

      expect(listener).toHaveBeenCalledWith(mfaMethods);
    });
  });
});
