import { SEPOLIA_CHAIN_ID_HEX } from '@/lib/safe-core';

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

export function getInjectedProvider(): Eip1193Provider | undefined {
  return typeof window !== 'undefined' ? window.ethereum : undefined;
}

/**
 * Requests account access from an injected wallet (MetaMask, etc.) and makes
 * sure it's pointed at Sepolia, adding the network to the wallet if it
 * doesn't know it yet. Throws if no injected wallet is present.
 */
export async function connectInjectedWallet(): Promise<{
  provider: Eip1193Provider;
  account: string;
}> {
  const provider = getInjectedProvider();
  if (!provider) {
    throw new Error('No injected wallet found. Install MetaMask or another browser wallet extension.');
  }

  const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
  const account = accounts[0];
  if (!account) {
    throw new Error('Wallet connection was rejected or returned no account.');
  }

  await ensureSepolia(provider);

  return { provider, account };
}

async function ensureSepolia(provider: Eip1193Provider): Promise<void> {
  const currentChainId = (await provider.request({ method: 'eth_chainId' })) as string;
  if (currentChainId?.toLowerCase() === SEPOLIA_CHAIN_ID_HEX) return;

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
    });
  } catch (switchError) {
    const code = (switchError as { code?: number })?.code;
    // 4902 = the wallet doesn't have this chain registered yet.
    if (code === 4902) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: SEPOLIA_CHAIN_ID_HEX,
            chainName: 'Sepolia',
            nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
            blockExplorerUrls: ['https://sepolia.etherscan.io'],
          },
        ],
      });
    } else {
      throw switchError;
    }
  }
}
