import Safe, { type SafeConfig } from '@safe-global/protocol-kit';
import SafeApiKit from '@safe-global/api-kit';

export type SafeSdkSession = {
  protocolKit: Safe;
  apiKit: SafeApiKit;
  mode: 'connected';
};

export type SafeSdkConnectionConfig = SafeConfig & {
  chainId: bigint;
  txServiceUrl?: string;
  apiKey?: string;
};

/**
 * Real Safe{Core} SDK boundary.
 *
 * The dashboard intentionally does not call this during the mock-first build:
 * there is no provider, signer, or credential in the browser yet. When wallet
 * connectivity is enabled, this is the only adapter the UI needs to call.
 */
export async function connectSafeCore(
  config: SafeSdkConnectionConfig,
): Promise<SafeSdkSession> {
  const { chainId, txServiceUrl, apiKey, ...protocolConfig } = config;
  const protocolKit = await Safe.init(protocolConfig);
  const apiKit = new SafeApiKit({ chainId, txServiceUrl, apiKey });

  return { protocolKit, apiKit, mode: 'connected' };
}

export const mockSafeCore = {
  mode: 'mock' as const,
  protocolKit: 'Protocol Kit ready for a provider',
  apiKit: 'API Kit ready for a transaction service',
  safeAddress: '0x4B2E0000000000000000000000000000000091fC',
  chainId: 1n,
  threshold: 2,
  owners: 3,
};