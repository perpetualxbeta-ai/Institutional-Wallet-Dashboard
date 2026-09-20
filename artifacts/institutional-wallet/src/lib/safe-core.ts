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

/**
 * Sepolia testnet wiring.
 *
 * This address is user-supplied and has not been independently verified as a
 * deployed Safe on Sepolia. `Safe.init` below will throw if it isn't one
 * (wrong network, not a Safe proxy, or not yet deployed) — that failure is
 * surfaced to the caller rather than silently falling back to mock data, so
 * verify the address on https://sepolia.etherscan.io before relying on it.
 */
export const SEPOLIA_CHAIN_ID = 11155111n;
export const SEPOLIA_CHAIN_ID_HEX = '0xaa36a7';
export const SEPOLIA_SAFE_ADDRESS = '0x62D961331016C24CBFF9daD3A06fE16E68C569B9';
export const SEPOLIA_PUBLIC_RPC = 'https://ethereum-sepolia-rpc.publicnode.com';

export type LiveSafeSnapshot = {
  safeAddress: string;
  chainId: bigint;
  owners: string[];
  threshold: number;
  balanceWei: bigint;
  nonce: number;
  isDeployed: boolean;
};

/**
 * Read-only Safe{Core} connection against Sepolia.
 *
 * Pass an EIP-1193 provider (e.g. `window.ethereum`) to read through the
 * connected wallet's RPC, or omit it to fall back to a public Sepolia RPC —
 * either way this only reads on-chain state, it never signs or sends.
 */
export async function readSepoliaSafe(
  provider?: unknown,
): Promise<LiveSafeSnapshot> {
  const protocolKit = await Safe.init({
    provider: (provider ?? SEPOLIA_PUBLIC_RPC) as SafeConfig['provider'],
    safeAddress: SEPOLIA_SAFE_ADDRESS,
  });

  const isDeployed = await protocolKit.isSafeDeployed();
  if (!isDeployed) {
    throw new Error(
      `${SEPOLIA_SAFE_ADDRESS} has no Safe contract deployed on Sepolia (chain ${SEPOLIA_CHAIN_ID}). Double-check the address and network.`,
    );
  }

  const [owners, threshold, balanceWei, nonce] = await Promise.all([
    protocolKit.getOwners(),
    protocolKit.getThreshold(),
    protocolKit.getBalance(),
    protocolKit.getNonce(),
  ]);

  return {
    safeAddress: SEPOLIA_SAFE_ADDRESS,
    chainId: SEPOLIA_CHAIN_ID,
    owners,
    threshold,
    balanceWei,
    nonce,
    isDeployed,
  };
}

export type LivePendingTransaction = {
  safeTxHash: string;
  to: string;
  valueWei: bigint;
  nonce: number;
  submissionDate: string;
  confirmations: number;
  confirmationsRequired: number;
  confirmedBy: string[];
  isExecuted: boolean;
};

/**
 * Live pending-transaction queue from the Safe Transaction Service.
 *
 * Safe's hosted transaction service (api.safe.global) has required an API
 * key for every chain since 2024. Get a free one at
 * https://developer.safe.global and either pass it in or set
 * `VITE_SAFE_API_KEY` — without it this throws rather than silently
 * returning an empty or fabricated queue.
 */
export async function readSepoliaSafeQueue(
  apiKey?: string,
): Promise<LivePendingTransaction[]> {
  const key = apiKey ?? (import.meta.env.VITE_SAFE_API_KEY as string | undefined);
  if (!key) {
    throw new Error(
      'No Safe Transaction Service API key configured. Get a free one at https://developer.safe.global and set VITE_SAFE_API_KEY.',
    );
  }

  const apiKit = new SafeApiKit({ chainId: SEPOLIA_CHAIN_ID, apiKey: key });
  const page = await apiKit.getPendingTransactions(SEPOLIA_SAFE_ADDRESS);

  return page.results.map((tx) => ({
    safeTxHash: tx.safeTxHash,
    to: tx.to,
    valueWei: BigInt(tx.value || '0'),
    nonce: Number(tx.nonce),
    submissionDate: tx.submissionDate,
    confirmations: tx.confirmations?.length ?? 0,
    confirmationsRequired: tx.confirmationsRequired,
    confirmedBy: tx.confirmations?.map((confirmation) => confirmation.owner) ?? [],
    isExecuted: tx.isExecuted,
  }));
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

 //fix safe-core ts and wire up Sepolia connection
