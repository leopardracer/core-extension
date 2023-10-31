import { FeatureGates, DISABLED_FLAG_VALUES } from '../models';
import { getFeatureFlags } from './getFeatureFlags';

describe('src/background/services/featureFlags/utils/getFeatureFlags', () => {
  let realFetch;

  beforeEach(() => {
    jest.resetAllMocks();
    realFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        featureFlags: { [FeatureGates.BRIDGE]: false },
        featureFlagPayloads: { [FeatureGates.DEFI]: '>=1.60.0' },
      }),
    });
  });

  afterEach(() => {
    global.fetch = realFetch;
  });

  it('throws if no token is provided', async () => {
    await expect(getFeatureFlags()).rejects.toThrow(new Error('Invalid token'));
    await expect(getFeatureFlags('')).rejects.toThrow(
      new Error('Invalid token')
    );
  });

  it('throws if no posthogURL is provided', async () => {
    await expect(getFeatureFlags('token', undefined)).rejects.toThrow(
      new Error('Invalid Posthog URL')
    );

    await expect(getFeatureFlags('token', undefined, '')).rejects.toThrow(
      new Error('Invalid Posthog URL')
    );
  });

  it('properly calls posthog api', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1234);

    getFeatureFlags('token', 'userID', 'https://example.com');

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      'https://example.com/decide/?ip=0&_=1234&v=3&ver=1.20.0',
      {
        body: 'data=eyJ0b2tlbiI6InRva2VuIiwiZGlzdGluY3RfaWQiOiJ1c2VySUQiLCJncm91cHMiOnt9fQ%3D%3D',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        method: 'POST',
      }
    );
  });

  it('does not omit disabled flags', async () => {
    const { flags } = await getFeatureFlags(
      'token',
      'userID',
      'https://example.com'
    );

    expect(flags).toEqual({
      ...DISABLED_FLAG_VALUES,
      [FeatureGates.BRIDGE]: false,
    });
  });

  it('returns the feature flag payloads', async () => {
    const { flagPayloads } = await getFeatureFlags(
      'token',
      'userID',
      'https://example.com'
    );

    expect(flagPayloads).toEqual(
      expect.objectContaining({
        [FeatureGates.DEFI]: '>=1.60.0',
      })
    );
  });
});
