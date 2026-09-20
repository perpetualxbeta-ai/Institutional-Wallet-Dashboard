Sepolia wallet connect · PATCH
diff --git a/artifacts/institutional-wallet/package.json b/artifacts/institutional-wallet/package.json
index b335749..ca11d48 100644
--- a/artifacts/institutional-wallet/package.json
+++ b/artifacts/institutional-wallet/package.json
@@ -71,6 +71,7 @@
     "tw-animate-css": "^1.4.0",
     "vaul": "^1.1.2",
     "vite": "catalog:",
+    "vite-plugin-node-polyfills": "^0.28.0",
     "wouter": "^3.3.5",
     "zod": "catalog:"
   },
diff --git a/artifacts/institutional-wallet/src/App.tsx b/artifacts/institutional-wallet/src/App.tsx
index 5b77bfd..5f3b46e 100644
--- a/artifacts/institutional-wallet/src/App.tsx
+++ b/artifacts/institutional-wallet/src/App.tsx
@@ -31,7 +31,19 @@ import {
   X,
 } from 'lucide-react';
 import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
-import { mockSafeCore } from '@/lib/safe-core';
+import { mockSafeCore, readSepoliaSafe, SEPOLIA_SAFE_ADDRESS, type LiveSafeSnapshot } from '@/lib/safe-core';
+import { connectInjectedWallet } from '@/lib/wallet';
+
+function formatEth(wei: bigint): string {
+  const whole = wei / 1_000_000_000_000_000_000n;
+  const frac = wei % 1_000_000_000_000_000_000n;
+  const fracStr = frac.toString().padStart(18, '0').slice(0, 4);
+  return `${whole}.${fracStr}`;
+}
+
+function shortAddress(address: string): string {
+  return `${address.slice(0, 6)}…${address.slice(-4)}`;
+}
 
 const queryClient = new QueryClient();
 
@@ -92,6 +104,28 @@ function Home() {
   const [copiedAddress, setCopiedAddress] = useState(false);
   const [lastUpdated, setLastUpdated] = useState('just now');
 
+  const [liveSafe, setLiveSafe] = useState<LiveSafeSnapshot | null>(null);
+  const [liveAccount, setLiveAccount] = useState<string | null>(null);
+  const [liveStatus, setLiveStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
+  const [liveError, setLiveError] = useState('');
+
+  const connectToSepolia = async () => {
+    setLiveStatus('connecting');
+    setLiveError('');
+    try {
+      const { provider, account } = await connectInjectedWallet();
+      const snapshot = await readSepoliaSafe(provider);
+      setLiveAccount(account);
+      setLiveSafe(snapshot);
+      setLiveStatus('connected');
+      showNotice('Connected to Sepolia — showing live Safe data');
+    } catch (error) {
+      setLiveStatus('error');
+      setLiveError(error instanceof Error ? error.message : 'Failed to connect to Sepolia');
+      showNotice('Could not connect to Sepolia — see sidebar for details');
+    }
+  };
+
   const totalUsd = useMemo(() => initialAssets.reduce((total, asset) => total + Number(asset.usd.replace(/[$,]/g, '')), 0), []);
   const pendingCount = queue.filter((item) => item.status !== 'Executed').length;
   const signerCount = 3;
@@ -205,9 +239,9 @@ function Home() {
                   <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary/15 text-sidebar-primary"><WalletCards size={16} /></div>
                   <div className="min-w-0 flex-1">
                     <p className="truncate text-[12px] font-bold">Main Treasury</p>
-                    <p className="mt-0.5 font-mono text-[9px] text-sidebar-foreground/45">SAFE · 0x4B2…91fC</p>
+                    <p className="mt-0.5 font-mono text-[9px] text-sidebar-foreground/45">SAFE · {liveSafe ? shortAddress(liveSafe.safeAddress) : shortAddress(SEPOLIA_SAFE_ADDRESS)}</p>
                   </div>
-                  <span className="h-1.5 w-1.5 rounded-full bg-sidebar-primary status-pulse" />
+                  <span className={`h-1.5 w-1.5 rounded-full status-pulse ${liveStatus === 'connected' ? 'bg-sidebar-primary' : 'bg-sidebar-foreground/30'}`} />
                 </div>
               </div>
             </div>
@@ -237,10 +271,28 @@ function Home() {
             <div className="px-4 pb-5">
               <div className="mb-4 rounded-lg border border-sidebar-border bg-[#19263a] p-3">
                 <div className="flex items-center gap-2 text-sidebar-foreground/80">
-                  <ShieldCheck size={14} className="text-sidebar-primary" />
-                  <span className="text-[10px] font-bold uppercase tracking-[0.12em]">Simulated Safe</span>
+                  <ShieldCheck size={14} className={liveStatus === 'connected' ? 'text-sidebar-primary' : 'text-sidebar-foreground/60'} />
+                  <span className="text-[10px] font-bold uppercase tracking-[0.12em]">{liveStatus === 'connected' ? 'Live · Sepolia' : 'Simulated Safe'}</span>
                 </div>
-                 <p className="mt-2 text-[10px] leading-4 text-sidebar-foreground/45">Local data only. {mockSafeCore.protocolKit} and {mockSafeCore.apiKit} are simulated.</p>
+                {liveStatus === 'connected' && liveSafe ? (
+                  <p className="mt-2 text-[10px] leading-4 text-sidebar-foreground/45">
+                    {liveSafe.threshold} of {liveSafe.owners.length} signers · {formatEth(liveSafe.balanceWei)} ETH on Sepolia
+                    {liveAccount && <> · viewing as {shortAddress(liveAccount)}</>}
+                  </p>
+                ) : (
+                  <p className="mt-2 text-[10px] leading-4 text-sidebar-foreground/45">Local data only. {mockSafeCore.protocolKit} and {mockSafeCore.apiKit} are simulated.</p>
+                )}
+                {liveStatus === 'error' && (
+                  <p className="mt-2 text-[10px] leading-4 text-destructive">{liveError}</p>
+                )}
+                <button
+                  onClick={connectToSepolia}
+                  disabled={liveStatus === 'connecting'}
+                  className="mt-3 w-full rounded-md border border-sidebar-border bg-sidebar-accent/60 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-sidebar-foreground hover:bg-sidebar-accent disabled:opacity-60"
+                  data-testid="button-connect-sepolia"
+                >
+                  {liveStatus === 'connected' ? 'Reconnect to Sepolia' : liveStatus === 'connecting' ? 'Connecting…' : 'Connect to Sepolia'}
+                </button>
               </div>
               <div className="flex items-center gap-2.5 border-t border-sidebar-border pt-4">
                 <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#31435b] text-[11px] font-bold text-sidebar-foreground">MC</div>
@@ -312,12 +364,13 @@ function Home() {
                   onPropose={openProposal}
                   onCopy={copySafeAddress}
                   copiedAddress={copiedAddress}
+                  liveSafe={liveSafe}
                 />
               )}
               {activeView === 'Transactions' && (
                 <TransactionsView queue={queue} role={role} expandedId={expandedId} setExpandedId={setExpandedId} onApprove={approveTransaction} onExecute={executeTransaction} onPropose={openProposal} />
               )}
-              {activeView === 'Signers' && <SignersView role={role} onCopy={copySafeAddress} copiedAddress={copiedAddress} />}
+              {activeView === 'Signers' && <SignersView role={role} onCopy={copySafeAddress} copiedAddress={copiedAddress} liveSafe={liveSafe} />}
               {activeView === 'Audit log' && <AuditView />}
             </div>
           </div>
@@ -330,9 +383,9 @@ function Home() {
 }
 
 function OverviewView({
-  assets, totalUsd, pendingCount, signerCount, role, queue, expandedId, setExpandedId, onApprove, onExecute, onPropose, onCopy, copiedAddress,
+  assets, totalUsd, pendingCount, signerCount, role, queue, expandedId, setExpandedId, onApprove, onExecute, onPropose, onCopy, copiedAddress, liveSafe,
 }: {
-  assets: Asset[]; totalUsd: number; pendingCount: number; signerCount: number; role: Role; queue: QueueItem[]; expandedId: number | null; setExpandedId: (id: number | null) => void; onApprove: (id: number) => void; onExecute: (id: number) => void; onPropose: () => void; onCopy: () => void; copiedAddress: boolean;
+  assets: Asset[]; totalUsd: number; pendingCount: number; signerCount: number; role: Role; queue: QueueItem[]; expandedId: number | null; setExpandedId: (id: number | null) => void; onApprove: (id: number) => void; onExecute: (id: number) => void; onPropose: () => void; onCopy: () => void; copiedAddress: boolean; liveSafe: LiveSafeSnapshot | null;
 }) {
   return (
     <>
@@ -345,7 +398,7 @@ function OverviewView({
         <div className="flex items-center gap-2 animate-rise-in animation-delay-1">
           <button onClick={onCopy} className="group flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-[11px] font-semibold text-muted-foreground hover:border-primary/50 hover:text-foreground" data-testid="button-copy-safe-address">
             {copiedAddress ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
-            {copiedAddress ? 'Copied' : '0x4B2E…91fC'}
+            {copiedAddress ? 'Copied' : shortAddress(liveSafe?.safeAddress ?? SEPOLIA_SAFE_ADDRESS)}
           </button>
           <button onClick={onPropose} className="flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2.5 text-[11px] font-bold text-primary-foreground shadow-[0_5px_16px_hsl(164_63%_35%_/_0.2)] hover:-translate-y-0.5 hover:shadow-[0_8px_20px_hsl(164_63%_35%_/_0.28)] disabled:opacity-50" data-testid="button-open-proposal">
             <Plus size={15} strokeWidth={2.4} /> Propose transfer
@@ -356,7 +409,7 @@ function OverviewView({
       <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
         <MetricCard label="Total treasury" value={`$${totalUsd.toLocaleString('en-US', { maximumFractionDigits: 2 })}`} detail="+4.82% this month" accent="primary" icon={<WalletCards size={16} />} delay="0" />
         <MetricCard label="Pending signatures" value={String(pendingCount).padStart(2, '0')} detail="2 need your attention" accent="accent" icon={<Fingerprint size={16} />} delay="1" />
-        <MetricCard label="Required threshold" value="2 of 3" detail="Safe{Core} multisig" accent="blue" icon={<ShieldCheck size={16} />} delay="2" />
+        <MetricCard label="Required threshold" value={liveSafe ? `${liveSafe.threshold} of ${liveSafe.owners.length}` : '2 of 3'} detail={liveSafe ? 'Live on Sepolia' : 'Safe{Core} multisig'} accent="blue" icon={<ShieldCheck size={16} />} delay="2" />
         <MetricCard label="Active signers" value={String(signerCount).padStart(2, '0')} detail="All keys healthy" accent="purple" icon={<UsersRound size={16} />} delay="3" />
       </div>
 
@@ -437,9 +490,75 @@ function EmptyQueue() {
   return <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center"><div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground"><FileCheck2 size={18} /></div><h4 className="mt-4 text-[13px] font-bold">Signing queue is clear</h4><p className="mt-1 text-[11px] text-muted-foreground">New transfer proposals will appear here for review.</p></div>;
 }
 
-function SignersView({ role, onCopy, copiedAddress }: { role: Role; onCopy: () => void; copiedAddress: boolean }) {
-  const signers = [{ initials: 'MC', name: 'Morgan Chen', role: 'Admin · Signer', address: '0x8A91…D4e0', status: 'Active', last: 'Signed 18 min ago' }, { initials: 'NP', name: 'Nisha Patel', role: 'Signer', address: '0x3B12…A90c', status: 'Active', last: 'Signed 42 min ago' }, { initials: 'JL', name: 'Jon Lee', role: 'Signer', address: '0xF204…7c18', status: 'Active', last: 'Last active 2 hr ago' }];
-  return <div className="animate-rise-in"><div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-primary">Access policy</p><h2 className="mt-2 text-[29px] font-extrabold tracking-[-.055em]">Signers & policy</h2><p className="mt-2 text-[13px] text-muted-foreground">The people and keys that protect Main Treasury.</p></div><div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[10px] font-semibold text-muted-foreground"><ShieldCheck size={14} className="text-primary" /> Simulated Safe{role === 'Viewer' && <span className="ml-1 text-muted-foreground/60">· read only</span>}</div></div><div className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]"><section className="rounded-xl border border-border bg-card shadow-[0_12px_38px_hsl(222_28%_13%_/_0.035)]"><div className="flex items-center justify-between border-b border-border px-5 py-4"><div><h3 className="text-[14px] font-extrabold">Authorized signers</h3><p className="mt-1 text-[11px] text-muted-foreground">3 active keys · 2 of 3 threshold</p></div><span className="rounded-full bg-primary/10 px-2 py-1 font-mono text-[9px] font-bold text-primary">HEALTHY</span></div><div className="divide-y divide-border">{signers.map((signer, index) => <div className="flex items-center gap-3.5 px-5 py-4 transition-colors hover:bg-muted/30" key={signer.address} data-testid={`row-signer-${index}`}><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#dbe6e4] text-[11px] font-bold text-[#24584f]">{signer.initials}</div><div className="min-w-0 flex-1"><p className="text-[12px] font-bold">{signer.name}</p><p className="mt-1 text-[10px] text-muted-foreground">{signer.role} <span className="mx-1 text-border">·</span> <span className="font-mono">{signer.address}</span></p></div><div className="hidden text-right sm:block"><p className="text-[10px] font-semibold text-primary">{signer.status}</p><p className="mt-1 text-[9px] text-muted-foreground">{signer.last}</p></div><MoreHorizontal size={16} className="text-muted-foreground" /></div>)}</div></section><section className="rounded-xl border border-border bg-card p-5 shadow-[0_12px_38px_hsl(222_28%_13%_/_0.035)]"><p className="font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground">Safe configuration</p><div className="mt-5 space-y-4"><div><p className="text-[10px] text-muted-foreground">Contract address</p><button onClick={onCopy} className="mt-1 flex items-center gap-2 font-mono text-[11px] font-medium hover:text-primary" data-testid="button-copy-safe-address-signers">{copiedAddress ? <Check size={13} className="text-primary" /> : <Copy size={13} />} 0x4B2E…91fC</button></div><div className="border-t border-border pt-4"><p className="text-[10px] text-muted-foreground">Network</p><p className="mt-1 flex items-center gap-2 text-[11px] font-bold"><span className="h-2 w-2 rounded-full bg-primary" /> Ethereum mainnet <span className="font-normal text-muted-foreground">(simulated)</span></p></div><div className="border-t border-border pt-4"><p className="text-[10px] text-muted-foreground">Execution policy</p><p className="mt-1 text-[11px] font-bold">2 signatures required</p></div></div></section></div></div>;
+function SignersView({ role, onCopy, copiedAddress, liveSafe }: { role: Role; onCopy: () => void; copiedAddress: boolean; liveSafe: LiveSafeSnapshot | null }) {
+  const mockSigners = [{ initials: 'MC', name: 'Morgan Chen', role: 'Admin · Signer', address: '0x8A91…D4e0', status: 'Active', last: 'Signed 18 min ago' }, { initials: 'NP', name: 'Nisha Patel', role: 'Signer', address: '0x3B12…A90c', status: 'Active', last: 'Signed 42 min ago' }, { initials: 'JL', name: 'Jon Lee', role: 'Signer', address: '0xF204…7c18', status: 'Active', last: 'Last active 2 hr ago' }];
+  const liveSigners = liveSafe?.owners.map((address) => ({ initials: 'ΞX', name: shortAddress(address), role: 'On-chain owner', address: shortAddress(address), status: 'Active', last: 'Read from Sepolia' }));
+  const signers = liveSigners ?? mockSigners;
+  const displayAddress = liveSafe ? shortAddress(liveSafe.safeAddress) : '0x4B2E…91fC';
+  const threshold = liveSafe ? liveSafe.threshold : 2;
+  return (
+    <div className="animate-rise-in">
+      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
+        <div>
+          <p className="font-mono text-[10px] uppercase tracking-[.18em] text-primary">Access policy</p>
+          <h2 className="mt-2 text-[29px] font-extrabold tracking-[-.055em]">Signers & policy</h2>
+          <p className="mt-2 text-[13px] text-muted-foreground">The people and keys that protect Main Treasury.</p>
+        </div>
+        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[10px] font-semibold text-muted-foreground">
+          <ShieldCheck size={14} className={liveSafe ? 'text-primary' : ''} /> {liveSafe ? 'Live Safe · Sepolia' : 'Simulated Safe'}
+          {role === 'Viewer' && <span className="ml-1 text-muted-foreground/60">· read only</span>}
+        </div>
+      </div>
+      <div className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
+        <section className="rounded-xl border border-border bg-card shadow-[0_12px_38px_hsl(222_28%_13%_/_0.035)]">
+          <div className="flex items-center justify-between border-b border-border px-5 py-4">
+            <div>
+              <h3 className="text-[14px] font-extrabold">Authorized signers</h3>
+              <p className="mt-1 text-[11px] text-muted-foreground">{signers.length} active keys · {threshold} of {signers.length} threshold</p>
+            </div>
+            <span className="rounded-full bg-primary/10 px-2 py-1 font-mono text-[9px] font-bold text-primary">HEALTHY</span>
+          </div>
+          <div className="divide-y divide-border">
+            {signers.map((signer, index) => (
+              <div className="flex items-center gap-3.5 px-5 py-4 transition-colors hover:bg-muted/30" key={signer.address} data-testid={`row-signer-${index}`}>
+                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#dbe6e4] text-[11px] font-bold text-[#24584f]">{signer.initials}</div>
+                <div className="min-w-0 flex-1">
+                  <p className="text-[12px] font-bold">{signer.name}</p>
+                  <p className="mt-1 text-[10px] text-muted-foreground">{signer.role} <span className="mx-1 text-border">·</span> <span className="font-mono">{signer.address}</span></p>
+                </div>
+                <div className="hidden text-right sm:block">
+                  <p className="text-[10px] font-semibold text-primary">{signer.status}</p>
+                  <p className="mt-1 text-[9px] text-muted-foreground">{signer.last}</p>
+                </div>
+                <MoreHorizontal size={16} className="text-muted-foreground" />
+              </div>
+            ))}
+          </div>
+        </section>
+        <section className="rounded-xl border border-border bg-card p-5 shadow-[0_12px_38px_hsl(222_28%_13%_/_0.035)]">
+          <p className="font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground">Safe configuration</p>
+          <div className="mt-5 space-y-4">
+            <div>
+              <p className="text-[10px] text-muted-foreground">Contract address</p>
+              <button onClick={onCopy} className="mt-1 flex items-center gap-2 font-mono text-[11px] font-medium hover:text-primary" data-testid="button-copy-safe-address-signers">
+                {copiedAddress ? <Check size={13} className="text-primary" /> : <Copy size={13} />} {displayAddress}
+              </button>
+            </div>
+            <div className="border-t border-border pt-4">
+              <p className="text-[10px] text-muted-foreground">Network</p>
+              <p className="mt-1 flex items-center gap-2 text-[11px] font-bold">
+                <span className={`h-2 w-2 rounded-full ${liveSafe ? 'bg-primary' : 'bg-muted-foreground/50'}`} /> {liveSafe ? 'Sepolia testnet' : 'Ethereum mainnet'} <span className="font-normal text-muted-foreground">{liveSafe ? '(live)' : '(simulated)'}</span>
+              </p>
+            </div>
+            <div className="border-t border-border pt-4">
+              <p className="text-[10px] text-muted-foreground">Execution policy</p>
+              <p className="mt-1 text-[11px] font-bold">{threshold} signatures required</p>
+            </div>
+          </div>
+        </section>
+      </div>
+    </div>
+  );
 }
 
 function AuditView() {
diff --git a/artifacts/institutional-wallet/src/lib/safe-core.ts b/artifacts/institutional-wallet/src/lib/safe-core.ts
index f7ff18b..4ac3e5e 100644
--- a/artifacts/institutional-wallet/src/lib/safe-core.ts
+++ b/artifacts/institutional-wallet/src/lib/safe-core.ts
@@ -30,6 +30,67 @@ export async function connectSafeCore(
   return { protocolKit, apiKit, mode: 'connected' };
 }
 
+/**
+ * Sepolia testnet wiring.
+ *
+ * This address is user-supplied and has not been independently verified as a
+ * deployed Safe on Sepolia. `Safe.init` below will throw if it isn't one
+ * (wrong network, not a Safe proxy, or not yet deployed) — that failure is
+ * surfaced to the caller rather than silently falling back to mock data, so
+ * verify the address on https://sepolia.etherscan.io before relying on it.
+ */
+export const SEPOLIA_CHAIN_ID = 11155111n;
+export const SEPOLIA_CHAIN_ID_HEX = '0xaa36a7';
+export const SEPOLIA_SAFE_ADDRESS = '0x62D961331016C24CBFF9daD3A06fE16E68C569B9';
+export const SEPOLIA_PUBLIC_RPC = 'https://ethereum-sepolia-rpc.publicnode.com';
+
+export type LiveSafeSnapshot = {
+  safeAddress: string;
+  chainId: bigint;
+  owners: string[];
+  threshold: number;
+  balanceWei: bigint;
+  isDeployed: boolean;
+};
+
+/**
+ * Read-only Safe{Core} connection against Sepolia.
+ *
+ * Pass an EIP-1193 provider (e.g. `window.ethereum`) to read through the
+ * connected wallet's RPC, or omit it to fall back to a public Sepolia RPC —
+ * either way this only reads on-chain state, it never signs or sends.
+ */
+export async function readSepoliaSafe(
+  provider?: unknown,
+): Promise<LiveSafeSnapshot> {
+  const protocolKit = await Safe.init({
+    provider: (provider ?? SEPOLIA_PUBLIC_RPC) as SafeConfig['provider'],
+    safeAddress: SEPOLIA_SAFE_ADDRESS,
+  });
+
+  const isDeployed = await protocolKit.isSafeDeployed();
+  if (!isDeployed) {
+    throw new Error(
+      `${SEPOLIA_SAFE_ADDRESS} has no Safe contract deployed on Sepolia (chain ${SEPOLIA_CHAIN_ID}). Double-check the address and network.`,
+    );
+  }
+
+  const [owners, threshold, balanceWei] = await Promise.all([
+    protocolKit.getOwners(),
+    protocolKit.getThreshold(),
+    protocolKit.getBalance(),
+  ]);
+
+  return {
+    safeAddress: SEPOLIA_SAFE_ADDRESS,
+    chainId: SEPOLIA_CHAIN_ID,
+    owners,
+    threshold,
+    balanceWei,
+    isDeployed,
+  };
+}
+
 export const mockSafeCore = {
   mode: 'mock' as const,
   protocolKit: 'Protocol Kit ready for a provider',
diff --git a/artifacts/institutional-wallet/src/lib/wallet.ts b/artifacts/institutional-wallet/src/lib/wallet.ts
new file mode 100644
index 0000000..f78b8a6
--- /dev/null
+++ b/artifacts/institutional-wallet/src/lib/wallet.ts
@@ -0,0 +1,73 @@
+import { SEPOLIA_CHAIN_ID_HEX } from '@/lib/safe-core';
+
+type Eip1193Provider = {
+  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
+  on?: (event: string, handler: (...args: unknown[]) => void) => void;
+  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
+};
+
+declare global {
+  interface Window {
+    ethereum?: Eip1193Provider;
+  }
+}
+
+export function getInjectedProvider(): Eip1193Provider | undefined {
+  return typeof window !== 'undefined' ? window.ethereum : undefined;
+}
+
+/**
+ * Requests account access from an injected wallet (MetaMask, etc.) and makes
+ * sure it's pointed at Sepolia, adding the network to the wallet if it
+ * doesn't know it yet. Throws if no injected wallet is present.
+ */
+export async function connectInjectedWallet(): Promise<{
+  provider: Eip1193Provider;
+  account: string;
+}> {
+  const provider = getInjectedProvider();
+  if (!provider) {
+    throw new Error('No injected wallet found. Install MetaMask or another browser wallet extension.');
+  }
+
+  const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
+  const account = accounts[0];
+  if (!account) {
+    throw new Error('Wallet connection was rejected or returned no account.');
+  }
+
+  await ensureSepolia(provider);
+
+  return { provider, account };
+}
+
+async function ensureSepolia(provider: Eip1193Provider): Promise<void> {
+  const currentChainId = (await provider.request({ method: 'eth_chainId' })) as string;
+  if (currentChainId?.toLowerCase() === SEPOLIA_CHAIN_ID_HEX) return;
+
+  try {
+    await provider.request({
+      method: 'wallet_switchEthereumChain',
+      params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
+    });
+  } catch (switchError) {
+    const code = (switchError as { code?: number })?.code;
+    // 4902 = the wallet doesn't have this chain registered yet.
+    if (code === 4902) {
+      await provider.request({
+        method: 'wallet_addEthereumChain',
+        params: [
+          {
+            chainId: SEPOLIA_CHAIN_ID_HEX,
+            chainName: 'Sepolia',
+            nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
+            rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
+            blockExplorerUrls: ['https://sepolia.etherscan.io'],
+          },
+        ],
+      });
+    } else {
+      throw switchError;
+    }
+  }
+}
diff --git a/artifacts/institutional-wallet/vite.config.ts b/artifacts/institutional-wallet/vite.config.ts
index 82792ad..9b0d8b4 100644
--- a/artifacts/institutional-wallet/vite.config.ts
+++ b/artifacts/institutional-wallet/vite.config.ts
@@ -2,6 +2,7 @@ import path from 'path';
 import react from '@vitejs/plugin-react';
 import tailwindcss from '@tailwindcss/vite';
 import { defineConfig } from 'vite';
+import { nodePolyfills } from 'vite-plugin-node-polyfills';
 
 import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';
 
@@ -32,6 +33,10 @@ export default defineConfig({
   plugins: [
     react(),
     tailwindcss(),
+    // @safe-global/protocol-kit (and its deps) assume Node's Buffer/global
+    // exist; this polyfills just enough of the Node runtime for it to work
+    // in the browser bundle without dragging in fs/net/etc.
+    nodePolyfills({ include: ['buffer'], globals: { Buffer: true, global: false, process: false } }),
     runtimeErrorOverlay(),
     ...(process.env.NODE_ENV !== 'production' &&
     process.env.REPL_ID !== undefined

 //wire up Sepolia connection
