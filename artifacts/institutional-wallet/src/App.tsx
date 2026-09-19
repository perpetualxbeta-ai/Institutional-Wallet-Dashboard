import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  ArrowDownLeft,
  ArrowUpRight,
  BadgeCheck,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clipboard,
  Clock3,
  Copy,
  FileCheck2,
  Fingerprint,
  KeyRound,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  MoreHorizontal,
  Plus,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
  WalletCards,
  X,
} from 'lucide-react';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { mockSafeCore } from '@/lib/safe-core';

const queryClient = new QueryClient();

type Role = 'Admin' | 'Signer' | 'Viewer';
type View = 'Overview' | 'Transactions' | 'Signers' | 'Audit log';
type AssetKey = 'ETH' | 'USDC' | 'WBTC';

type Asset = {
  symbol: AssetKey;
  name: string;
  balance: string;
  usd: string;
  accent: string;
  initials: string;
};

type QueueItem = {
  id: number;
  title: string;
  recipient: string;
  amount: string;
  asset: AssetKey;
  status: 'Needs signature' | 'Ready to execute' | 'Executed';
  signatures: number;
  required: number;
  created: string;
  proposer: string;
  risk: 'Routine' | 'Review';
};

const initialAssets: Asset[] = [
  { symbol: 'ETH', name: 'Ethereum', balance: '128.4308', usd: '$422,988.41', accent: '#627eea', initials: 'Ξ' },
  { symbol: 'USDC', name: 'USD Coin', balance: '842,190.00', usd: '$842,190.00', accent: '#2775ca', initials: '$' },
  { symbol: 'WBTC', name: 'Wrapped Bitcoin', balance: '4.8120', usd: '$318,624.96', accent: '#f7931a', initials: '₿' },
];

const initialQueue: QueueItem[] = [
  { id: 1, title: 'Q3 vendor settlement', recipient: '0x71C4…9a2E', amount: '12,500.00', asset: 'USDC', status: 'Needs signature', signatures: 1, required: 3, created: '18 min ago', proposer: 'M. Chen', risk: 'Routine' },
  { id: 2, title: 'Cold storage rebalance', recipient: '0xA830…4cD1', amount: '18.0000', asset: 'ETH', status: 'Needs signature', signatures: 1, required: 3, created: '42 min ago', proposer: 'N. Patel', risk: 'Review' },
  { id: 3, title: 'Market maker allocation', recipient: '0x2F08…c813', amount: '1.2500', asset: 'WBTC', status: 'Ready to execute', signatures: 2, required: 3, created: '2 hr ago', proposer: 'M. Chen', risk: 'Routine' },
];

const navItems: { label: View; icon: typeof LayoutDashboard; count?: string }[] = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Transactions', icon: ArrowUpRight, count: '03' },
  { label: 'Signers', icon: UsersRound },
  { label: 'Audit log', icon: FileCheck2 },
];

function Home() {
  const [role, setRole] = useState<Role>('Signer');
  const [activeView, setActiveView] = useState<View>('Overview');
  const [queue, setQueue] = useState<QueueItem[]>(initialQueue);
  const [isProposalOpen, setIsProposalOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(1);
  const [notice, setNotice] = useState('');
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('just now');

  const totalUsd = useMemo(() => initialAssets.reduce((total, asset) => total + Number(asset.usd.replace(/[$,]/g, '')), 0), []);
  const pendingCount = queue.filter((item) => item.status !== 'Executed').length;
  const signerCount = 3;

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 3600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const showNotice = (message: string) => setNotice(message);

  const copySafeAddress = () => {
    setCopiedAddress(true);
    showNotice('Safe address copied to clipboard');
    window.setTimeout(() => setCopiedAddress(false), 1600);
  };

  const approveTransaction = (id: number) => {
    if (role !== 'Signer') {
      showNotice('Switch to Signer role to add a simulated approval');
      return;
    }
    setQueue((current) =>
      current.map((item) => {
        if (item.id !== id || item.signatures >= item.required) return item;
        const signatures = item.signatures + 1;
        return { ...item, signatures, status: signatures >= item.required ? 'Ready to execute' : item.status };
      }),
    );
    showNotice('Simulated signature added to the transaction');
  };

  const executeTransaction = (id: number) => {
    if (role === 'Viewer') {
      showNotice('Viewer role cannot execute transactions');
      return;
    }
    setQueue((current) => current.map((item) => (item.id === id ? { ...item, status: 'Executed' } : item)));
    showNotice('Transaction marked executed in simulation');
  };

  const refreshData = () => {
    setLastUpdated('just now');
    showNotice('Treasury data refreshed');
  };

  const openProposal = () => {
    if (role === 'Viewer') {
      showNotice('Viewer role cannot propose transfers');
      return;
    }
    setIsProposalOpen(true);
  };

  const createProposal = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const asset = String(formData.get('asset')) as AssetKey;
    const amount = String(formData.get('amount'));
    const recipient = String(formData.get('recipient'));
    const note = String(formData.get('note') || 'Treasury transfer');
    if (!amount || Number(amount) <= 0 || recipient.length < 8) {
      showNotice('Add a valid amount and recipient address');
      return;
    }
    const nextId = Math.max(...queue.map((item) => item.id), 0) + 1;
    setQueue((current) => [
      {
        id: nextId,
        title: note.slice(0, 34),
        recipient: `${recipient.slice(0, 6)}…${recipient.slice(-4)}`,
        amount: Number(amount).toLocaleString('en-US', { maximumFractionDigits: 6 }),
        asset,
        status: 'Needs signature',
        signatures: 1,
        required: 3,
        created: 'just now',
        proposer: role === 'Admin' ? 'You · Admin' : 'You · Signer',
        risk: Number(amount) > 10000 ? 'Review' : 'Routine',
      },
      ...current,
    ]);
    setIsProposalOpen(false);
    setActiveView('Transactions');
    showNotice('Transfer proposal added to the signing queue');
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <div className="flex min-h-[100dvh]">
        <aside className={`fixed inset-y-0 left-0 z-30 w-[252px] -translate-x-full bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:relative lg:translate-x-0 ${isMobileNavOpen ? 'translate-x-0' : ''}`} data-testid="navigation-sidebar">
          <div className="flex h-full flex-col border-r border-sidebar-border">
            <div className="flex h-[76px] items-center border-b border-sidebar-border px-6">
              <div className="mr-3 flex h-9 w-9 items-center justify-center rounded-[10px] bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_8px_18px_hsl(164_63%_43%_/_0.18)]">
                <LockKeyhole size={18} strokeWidth={2.3} />
              </div>
              <div>
                <p className="text-[15px] font-extrabold tracking-[-0.03em]">Northstar</p>
                <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.19em] text-sidebar-foreground/50">Treasury console</p>
              </div>
              <button className="ml-auto rounded-md p-1.5 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground lg:hidden" onClick={() => setIsMobileNavOpen(false)} data-testid="button-close-mobile-navigation" aria-label="Close navigation">
                <X size={17} />
              </button>
            </div>

            <div className="px-4 pt-6">
              <p className="px-2 text-[10px] font-bold uppercase tracking-[0.17em] text-sidebar-foreground/40">Workspace</p>
              <div className="mt-3 rounded-lg border border-sidebar-border bg-sidebar-accent/60 p-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary/15 text-sidebar-primary"><WalletCards size={16} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-bold">Main Treasury</p>
                    <p className="mt-0.5 font-mono text-[9px] text-sidebar-foreground/45">SAFE · 0x4B2…91fC</p>
                  </div>
                  <span className="h-1.5 w-1.5 rounded-full bg-sidebar-primary status-pulse" />
                </div>
              </div>
            </div>

            <nav className="mt-7 flex-1 px-4" aria-label="Primary navigation">
              <p className="px-2 text-[10px] font-bold uppercase tracking-[0.17em] text-sidebar-foreground/40">Console</p>
              <div className="mt-3 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = activeView === item.label;
                  return (
                    <button
                      key={item.label}
                      onClick={() => { setActiveView(item.label); setIsMobileNavOpen(false); }}
                      className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[12px] font-semibold ${active ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_5px_14px_hsl(164_63%_43%_/_0.15)]' : 'text-sidebar-foreground/62 hover:bg-sidebar-accent hover:text-sidebar-foreground'}`}
                      data-testid={`button-nav-${item.label.toLowerCase().replace(' ', '-')}`}
                    >
                      <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
                      <span className="flex-1">{item.label}</span>
                      {item.count && <span className={`font-mono text-[10px] ${active ? 'text-sidebar-primary-foreground/75' : 'text-sidebar-foreground/35'}`}>{item.count}</span>}
                    </button>
                  );
                })}
              </div>
            </nav>

            <div className="px-4 pb-5">
              <div className="mb-4 rounded-lg border border-sidebar-border bg-[#19263a] p-3">
                <div className="flex items-center gap-2 text-sidebar-foreground/80">
                  <ShieldCheck size={14} className="text-sidebar-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em]">Simulated Safe</span>
                </div>
                 <p className="mt-2 text-[10px] leading-4 text-sidebar-foreground/45">Local data only. {mockSafeCore.protocolKit} and {mockSafeCore.apiKit} are simulated.</p>
              </div>
              <div className="flex items-center gap-2.5 border-t border-sidebar-border pt-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#31435b] text-[11px] font-bold text-sidebar-foreground">MC</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-bold">Morgan Chen</p>
                  <p className="text-[10px] text-sidebar-foreground/45">{role} access</p>
                </div>
                <button className="rounded-md p-1 text-sidebar-foreground/45 hover:bg-sidebar-accent hover:text-sidebar-foreground" data-testid="button-user-settings" aria-label="Open user settings"><SlidersHorizontal size={14} /></button>
              </div>
            </div>
          </div>
        </aside>

        {isMobileNavOpen && <button className="fixed inset-0 z-20 bg-[#0e1724]/55 lg:hidden" onClick={() => setIsMobileNavOpen(false)} data-testid="button-close-navigation-overlay" aria-label="Close navigation overlay" />}

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 flex h-[76px] items-center justify-between border-b border-border bg-background/90 px-5 backdrop-blur-md sm:px-8 lg:px-10">
            <div className="flex items-center gap-3">
              <button className="rounded-lg border border-border bg-card p-2 text-muted-foreground hover:border-primary/50 hover:text-foreground lg:hidden" onClick={() => setIsMobileNavOpen(true)} data-testid="button-open-mobile-navigation" aria-label="Open navigation"><Menu size={18} /></button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Main Treasury / {activeView}</p>
                </div>
                <h1 className="mt-1 text-[18px] font-extrabold tracking-[-0.04em]">{activeView === 'Overview' ? 'Treasury overview' : activeView}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2.5 sm:gap-4">
              <button className="hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[11px] font-semibold text-muted-foreground hover:border-primary/50 hover:text-foreground sm:flex" onClick={refreshData} data-testid="button-refresh-data">
                <RefreshCw size={13} /> <span>Updated {lastUpdated}</span>
              </button>
              <button className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => showNotice('No new security alerts')} data-testid="button-notifications" aria-label="View notifications">
                <Bell size={17} />
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent" />
              </button>
              <div className="hidden h-6 w-px bg-border sm:block" />
              <label className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5">
                <span className="hidden font-mono text-[9px] uppercase tracking-[0.13em] text-muted-foreground sm:inline">Role</span>
                <select value={role} onChange={(event) => { setRole(event.target.value as Role); showNotice(`${event.target.value} permissions active`); }} className="cursor-pointer bg-transparent text-[11px] font-bold outline-none" data-testid="select-active-role" aria-label="Select active role">
                  <option>Admin</option>
                  <option>Signer</option>
                  <option>Viewer</option>
                </select>
                <ChevronDown size={13} className="text-muted-foreground" />
              </label>
            </div>
          </header>

          <div className="wallet-grid min-h-[calc(100dvh-76px)] px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
            <div className="mx-auto max-w-[1420px]">
              {notice && (
                <div className="fixed bottom-5 right-5 z-40 flex max-w-[calc(100vw-40px)] items-center gap-2 rounded-lg border border-primary/25 bg-foreground px-4 py-3 text-[12px] font-semibold text-background shadow-xl animate-rise-in" data-testid="status-toast">
                  <BadgeCheck size={16} className="text-primary" /> {notice}
                </div>
              )}

              {activeView === 'Overview' && (
                <OverviewView
                  assets={initialAssets}
                  totalUsd={totalUsd}
                  pendingCount={pendingCount}
                  signerCount={signerCount}
                  role={role}
                  queue={queue}
                  expandedId={expandedId}
                  setExpandedId={setExpandedId}
                  onApprove={approveTransaction}
                  onExecute={executeTransaction}
                  onPropose={openProposal}
                  onCopy={copySafeAddress}
                  copiedAddress={copiedAddress}
                />
              )}
              {activeView === 'Transactions' && (
                <TransactionsView queue={queue} role={role} expandedId={expandedId} setExpandedId={setExpandedId} onApprove={approveTransaction} onExecute={executeTransaction} onPropose={openProposal} />
              )}
              {activeView === 'Signers' && <SignersView role={role} onCopy={copySafeAddress} copiedAddress={copiedAddress} />}
              {activeView === 'Audit log' && <AuditView />}
            </div>
          </div>
        </main>
      </div>

      {isProposalOpen && <ProposalModal onClose={() => setIsProposalOpen(false)} onSubmit={createProposal} />}
    </div>
  );
}

function OverviewView({
  assets, totalUsd, pendingCount, signerCount, role, queue, expandedId, setExpandedId, onApprove, onExecute, onPropose, onCopy, copiedAddress,
}: {
  assets: Asset[]; totalUsd: number; pendingCount: number; signerCount: number; role: Role; queue: QueueItem[]; expandedId: number | null; setExpandedId: (id: number | null) => void; onApprove: (id: number) => void; onExecute: (id: number) => void; onPropose: () => void; onCopy: () => void; copiedAddress: boolean;
}) {
  return (
    <>
      <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div className="animate-rise-in">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">Good morning, Morgan</p>
          <h2 className="mt-2 max-w-[650px] text-[29px] font-extrabold leading-[1.1] tracking-[-0.055em] sm:text-[37px]">Capital, with a clear<br className="hidden sm:block" /> chain of custody.</h2>
          <p className="mt-3 max-w-[500px] text-[13px] leading-6 text-muted-foreground">Monitor reserves, route proposals, and keep every signature deliberate.</p>
        </div>
        <div className="flex items-center gap-2 animate-rise-in animation-delay-1">
          <button onClick={onCopy} className="group flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-[11px] font-semibold text-muted-foreground hover:border-primary/50 hover:text-foreground" data-testid="button-copy-safe-address">
            {copiedAddress ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
            {copiedAddress ? 'Copied' : '0x4B2E…91fC'}
          </button>
          <button onClick={onPropose} className="flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2.5 text-[11px] font-bold text-primary-foreground shadow-[0_5px_16px_hsl(164_63%_35%_/_0.2)] hover:-translate-y-0.5 hover:shadow-[0_8px_20px_hsl(164_63%_35%_/_0.28)] disabled:opacity-50" data-testid="button-open-proposal">
            <Plus size={15} strokeWidth={2.4} /> Propose transfer
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total treasury" value={`$${totalUsd.toLocaleString('en-US', { maximumFractionDigits: 2 })}`} detail="+4.82% this month" accent="primary" icon={<WalletCards size={16} />} delay="0" />
        <MetricCard label="Pending signatures" value={String(pendingCount).padStart(2, '0')} detail="2 need your attention" accent="accent" icon={<Fingerprint size={16} />} delay="1" />
        <MetricCard label="Required threshold" value="2 of 3" detail="Safe{Core} multisig" accent="blue" icon={<ShieldCheck size={16} />} delay="2" />
        <MetricCard label="Active signers" value={String(signerCount).padStart(2, '0')} detail="All keys healthy" accent="purple" icon={<UsersRound size={16} />} delay="3" />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.56fr)_minmax(310px,.84fr)]">
        <section className="rounded-xl border border-border bg-card shadow-[0_12px_38px_hsl(222_28%_13%_/_0.035)] animate-rise-in animation-delay-1">
          <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
            <div>
              <div className="flex items-center gap-2"><h3 className="text-[14px] font-extrabold tracking-[-0.025em]">Treasury assets</h3><span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">3 assets</span></div>
              <p className="mt-1 text-[11px] text-muted-foreground">Live balances from the simulated Safe</p>
            </div>
            <button className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} data-testid="button-assets-options" aria-label="Asset options"><MoreHorizontal size={17} /></button>
          </div>
          <div className="divide-y divide-border">
            {assets.map((asset) => <AssetRow asset={asset} key={asset.symbol} />)}
          </div>
          <div className="flex items-center gap-2 border-t border-border bg-muted/35 px-5 py-3.5 text-[10px] text-muted-foreground sm:px-6">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Valuations based on simulated market prices · refreshed moments ago
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-[0_12px_38px_hsl(222_28%_13%_/_0.035)] animate-rise-in animation-delay-2 sm:p-6">
          <div className="flex items-start justify-between">
            <div><h3 className="text-[14px] font-extrabold tracking-[-0.025em]">Signing health</h3><p className="mt-1 text-[11px] text-muted-foreground">A quick view of the quorum</p></div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><Fingerprint size={16} /></div>
          </div>
          <div className="mt-7 flex items-center gap-5">
            <div className="relative flex h-[104px] w-[104px] shrink-0 items-center justify-center rounded-full" style={{ background: 'conic-gradient(hsl(var(--primary)) 0 66%, hsl(var(--muted)) 66% 100%)' }}>
              <div className="flex h-[82px] w-[82px] flex-col items-center justify-center rounded-full bg-card"><span className="text-[24px] font-extrabold tracking-[-0.08em]">2<span className="text-muted-foreground">/3</span></span><span className="font-mono text-[8px] uppercase tracking-[.12em] text-muted-foreground">threshold</span></div>
            </div>
            <div className="space-y-3">
              <SignerMini initials="MC" name="Morgan Chen" state="Signed" />
              <SignerMini initials="NP" name="Nisha Patel" state="Signed" />
              <SignerMini initials="JL" name="Jon Lee" state="Awaiting" muted />
            </div>
          </div>
          <div className="mt-7 flex items-start gap-2.5 rounded-lg border border-accent/30 bg-accent/10 p-3.5"><Clock3 size={14} className="mt-0.5 shrink-0 text-[#bd7b04]" /><p className="text-[10px] leading-4 text-foreground/70">Two proposals are waiting for the next signature. Review before execution.</p></div>
        </section>
      </div>

      <section className="mt-6 animate-rise-in animation-delay-3">
        <div className="mb-3 flex items-end justify-between"><div><h3 className="text-[14px] font-extrabold tracking-[-0.025em]">Needs attention</h3><p className="mt-1 text-[11px] text-muted-foreground">Transactions moving through the signing policy</p></div><span className="font-mono text-[10px] text-muted-foreground">{pendingCount.toString().padStart(2, '0')} OPEN</span></div>
        {queue.length === 0 ? <EmptyQueue /> : <TransactionTable queue={queue} role={role} expandedId={expandedId} setExpandedId={setExpandedId} onApprove={onApprove} onExecute={onExecute} />}
      </section>
    </>
  );
}

function MetricCard({ label, value, detail, icon, accent, delay }: { label: string; value: string; detail: string; icon: ReactNode; accent: 'primary' | 'accent' | 'blue' | 'purple'; delay: string }) {
  const colorClass = { primary: 'text-primary bg-primary/10', accent: 'text-[#bd7b04] bg-accent/15', blue: 'text-[#4576c7] bg-[#4576c7]/10', purple: 'text-[#7d68bc] bg-[#7d68bc]/10' }[accent];
  return <div className={`rounded-xl border border-border bg-card p-4 shadow-[0_10px_30px_hsl(222_28%_13%_/_0.028)] animate-rise-in animation-delay-${delay}`} data-testid={`card-metric-${label.toLowerCase().replaceAll(' ', '-')}`}><div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">{label}</span><span className={`flex h-7 w-7 items-center justify-center rounded-md ${colorClass}`}>{icon}</span></div><p className="mt-4 text-[24px] font-extrabold tracking-[-.055em] tabular-nums">{value}</p><p className="mt-1 text-[10px] text-muted-foreground">{detail}</p></div>;
}

function AssetRow({ asset }: { asset: Asset }) {
  return <div className="flex items-center gap-3.5 px-5 py-4 transition-colors hover:bg-muted/35 sm:px-6" data-testid={`row-asset-${asset.symbol.toLowerCase()}`}><div className="flex h-9 w-9 items-center justify-center rounded-full text-[15px] font-bold text-white shadow-inner" style={{ backgroundColor: asset.accent }}>{asset.initials}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="text-[12px] font-extrabold">{asset.symbol}</p><span className="text-[10px] text-muted-foreground">{asset.name}</span></div><p className="mt-1 font-mono text-[11px] text-muted-foreground tabular-nums">{asset.balance} {asset.symbol}</p></div><div className="text-right"><p className="text-[12px] font-bold tabular-nums">{asset.usd}</p><p className="mt-1 text-[10px] text-muted-foreground">100% available</p></div><ChevronRight size={15} className="text-muted-foreground/50" /></div>;
}

function SignerMini({ initials, name, state, muted = false }: { initials: string; name: string; state: string; muted?: boolean }) {
  return <div className={`flex items-center gap-2.5 ${muted ? 'opacity-55' : ''}`}><div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted font-mono text-[8px] font-bold text-muted-foreground">{initials}</div><span className="text-[10px] font-semibold">{name}</span><span className={`ml-auto flex items-center gap-1 text-[9px] font-semibold ${muted ? 'text-muted-foreground' : 'text-primary'}`}>{muted ? <Clock3 size={10} /> : <Check size={10} strokeWidth={3} />}{state}</span></div>;
}

function TransactionsView({ queue, role, expandedId, setExpandedId, onApprove, onExecute, onPropose }: { queue: QueueItem[]; role: Role; expandedId: number | null; setExpandedId: (id: number | null) => void; onApprove: (id: number) => void; onExecute: (id: number) => void; onPropose: () => void }) {
  return <div className="animate-rise-in"><div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-primary">Transaction control</p><h2 className="mt-2 text-[29px] font-extrabold tracking-[-.055em]">Signing queue</h2><p className="mt-2 text-[13px] text-muted-foreground">Review every transfer before it reaches execution.</p></div><button onClick={onPropose} className="flex w-fit items-center gap-2 rounded-lg bg-primary px-3.5 py-2.5 text-[11px] font-bold text-primary-foreground hover:-translate-y-0.5" data-testid="button-open-proposal-transactions"><Plus size={15} /> Propose transfer</button></div><div className="mb-4 flex flex-wrap items-center gap-2"><span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 font-mono text-[9px] font-medium uppercase tracking-[.1em] text-primary">All transactions · {queue.length.toString().padStart(2, '0')}</span><span className="rounded-full border border-border bg-card px-2.5 py-1 font-mono text-[9px] font-medium uppercase tracking-[.1em] text-muted-foreground">Policy 2 of 3</span></div><TransactionTable queue={queue} role={role} expandedId={expandedId} setExpandedId={setExpandedId} onApprove={onApprove} onExecute={onExecute} /></div>;
}

function TransactionTable({ queue, role, expandedId, setExpandedId, onApprove, onExecute }: { queue: QueueItem[]; role: Role; expandedId: number | null; setExpandedId: (id: number | null) => void; onApprove: (id: number) => void; onExecute: (id: number) => void }) {
  return <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_12px_38px_hsl(222_28%_13%_/_0.035)]"><div className="hidden grid-cols-[minmax(210px,1.35fr)_minmax(120px,.8fr)_minmax(120px,.7fr)_minmax(130px,.8fr)_38px] gap-4 border-b border-border bg-muted/40 px-5 py-3 font-mono text-[9px] uppercase tracking-[.13em] text-muted-foreground sm:grid"><span>Transfer</span><span>Amount</span><span>Signatures</span><span>State</span><span /></div>{queue.map((item) => <TransactionRow key={item.id} item={item} role={role} expanded={expandedId === item.id} onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)} onApprove={onApprove} onExecute={onExecute} />)}</div>;
}

function TransactionRow({ item, role, expanded, onToggle, onApprove, onExecute }: { item: QueueItem; role: Role; expanded: boolean; onToggle: () => void; onApprove: (id: number) => void; onExecute: (id: number) => void }) {
  const asset = initialAssets.find((entry) => entry.symbol === item.asset);
  const complete = item.status === 'Ready to execute';
  const executed = item.status === 'Executed';
  return <div className={`border-b border-border last:border-0 ${expanded ? 'bg-muted/20' : ''}`} data-testid={`row-transaction-${item.id}`}><button onClick={onToggle} className="grid w-full grid-cols-1 gap-3 px-5 py-4 text-left hover:bg-muted/35 sm:grid-cols-[minmax(210px,1.35fr)_minmax(120px,.8fr)_minmax(120px,.7fr)_minmax(130px,.8fr)_38px] sm:items-center sm:gap-4" data-testid={`button-expand-transaction-${item.id}`}><div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ backgroundColor: asset?.accent }}>{asset?.initials}</div><div className="min-w-0"><p className="truncate text-[12px] font-bold">{item.title}</p><p className="mt-1 font-mono text-[9px] text-muted-foreground">{item.recipient} <span className="mx-1 text-border">/</span> {item.created}</p></div></div><div className="flex items-center justify-between sm:block"><span className="font-mono text-[9px] uppercase text-muted-foreground sm:hidden">Amount</span><p className="font-mono text-[12px] font-medium tabular-nums">{item.amount} <span className="text-[10px] text-muted-foreground">{item.asset}</span></p></div><div className="flex items-center justify-between sm:block"><span className="font-mono text-[9px] uppercase text-muted-foreground sm:hidden">Signatures</span><div className="flex items-center gap-2"><div className="h-1.5 w-[48px] overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${(item.signatures / item.required) * 100}%` }} /></div><span className="font-mono text-[10px] font-medium">{item.signatures}/{item.required}</span></div></div><div className="flex items-center justify-between sm:block"><span className="font-mono text-[9px] uppercase text-muted-foreground sm:hidden">State</span><span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[9px] font-bold ${executed ? 'bg-muted text-muted-foreground' : complete ? 'bg-primary/10 text-primary' : 'bg-accent/15 text-[#9b6705]'}`}><span className={`h-1.5 w-1.5 rounded-full ${executed ? 'bg-muted-foreground' : complete ? 'bg-primary' : 'bg-accent'}`} />{item.status}</span></div><ChevronRight size={15} className={`justify-self-end text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`} /></button>{expanded && <div className="border-t border-border px-5 pb-5 pt-4 sm:pl-[68px]"><div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end"><div className="grid grid-cols-2 gap-x-5 gap-y-3 text-[10px]"><div><p className="font-mono uppercase tracking-[.1em] text-muted-foreground">Proposed by</p><p className="mt-1 font-semibold">{item.proposer}</p></div><div><p className="font-mono uppercase tracking-[.1em] text-muted-foreground">Review tier</p><p className="mt-1 font-semibold">{item.risk} transfer</p></div><div><p className="font-mono uppercase tracking-[.1em] text-muted-foreground">Policy</p><p className="mt-1 font-semibold">2 of 3 signatures</p></div><div><p className="font-mono uppercase tracking-[.1em] text-muted-foreground">Destination</p><p className="mt-1 font-mono font-medium">{item.recipient}</p></div></div>{!executed && <div className="flex gap-2 sm:justify-end">{!complete && <button onClick={(event) => { event.stopPropagation(); onApprove(item.id); }} className="flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-[10px] font-bold text-primary hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-45" disabled={role !== 'Signer'} data-testid={`button-approve-transaction-${item.id}`}><Fingerprint size={13} /> {role === 'Signer' ? 'Add signature' : 'Signer approval'}</button>}{complete && <button onClick={(event) => { event.stopPropagation(); onExecute(item.id); }} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-[10px] font-bold text-primary-foreground hover:-translate-y-0.5" data-testid={`button-execute-transaction-${item.id}`}><ArrowUpRight size={13} /> Execute</button>}</div>}</div></div>}</div>;
}

function EmptyQueue() {
  return <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center"><div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground"><FileCheck2 size={18} /></div><h4 className="mt-4 text-[13px] font-bold">Signing queue is clear</h4><p className="mt-1 text-[11px] text-muted-foreground">New transfer proposals will appear here for review.</p></div>;
}

function SignersView({ role, onCopy, copiedAddress }: { role: Role; onCopy: () => void; copiedAddress: boolean }) {
  const signers = [{ initials: 'MC', name: 'Morgan Chen', role: 'Admin · Signer', address: '0x8A91…D4e0', status: 'Active', last: 'Signed 18 min ago' }, { initials: 'NP', name: 'Nisha Patel', role: 'Signer', address: '0x3B12…A90c', status: 'Active', last: 'Signed 42 min ago' }, { initials: 'JL', name: 'Jon Lee', role: 'Signer', address: '0xF204…7c18', status: 'Active', last: 'Last active 2 hr ago' }];
  return <div className="animate-rise-in"><div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-primary">Access policy</p><h2 className="mt-2 text-[29px] font-extrabold tracking-[-.055em]">Signers & policy</h2><p className="mt-2 text-[13px] text-muted-foreground">The people and keys that protect Main Treasury.</p></div><div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[10px] font-semibold text-muted-foreground"><ShieldCheck size={14} className="text-primary" /> Simulated Safe{role === 'Viewer' && <span className="ml-1 text-muted-foreground/60">· read only</span>}</div></div><div className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]"><section className="rounded-xl border border-border bg-card shadow-[0_12px_38px_hsl(222_28%_13%_/_0.035)]"><div className="flex items-center justify-between border-b border-border px-5 py-4"><div><h3 className="text-[14px] font-extrabold">Authorized signers</h3><p className="mt-1 text-[11px] text-muted-foreground">3 active keys · 2 of 3 threshold</p></div><span className="rounded-full bg-primary/10 px-2 py-1 font-mono text-[9px] font-bold text-primary">HEALTHY</span></div><div className="divide-y divide-border">{signers.map((signer, index) => <div className="flex items-center gap-3.5 px-5 py-4 transition-colors hover:bg-muted/30" key={signer.address} data-testid={`row-signer-${index}`}><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#dbe6e4] text-[11px] font-bold text-[#24584f]">{signer.initials}</div><div className="min-w-0 flex-1"><p className="text-[12px] font-bold">{signer.name}</p><p className="mt-1 text-[10px] text-muted-foreground">{signer.role} <span className="mx-1 text-border">·</span> <span className="font-mono">{signer.address}</span></p></div><div className="hidden text-right sm:block"><p className="text-[10px] font-semibold text-primary">{signer.status}</p><p className="mt-1 text-[9px] text-muted-foreground">{signer.last}</p></div><MoreHorizontal size={16} className="text-muted-foreground" /></div>)}</div></section><section className="rounded-xl border border-border bg-card p-5 shadow-[0_12px_38px_hsl(222_28%_13%_/_0.035)]"><p className="font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground">Safe configuration</p><div className="mt-5 space-y-4"><div><p className="text-[10px] text-muted-foreground">Contract address</p><button onClick={onCopy} className="mt-1 flex items-center gap-2 font-mono text-[11px] font-medium hover:text-primary" data-testid="button-copy-safe-address-signers">{copiedAddress ? <Check size={13} className="text-primary" /> : <Copy size={13} />} 0x4B2E…91fC</button></div><div className="border-t border-border pt-4"><p className="text-[10px] text-muted-foreground">Network</p><p className="mt-1 flex items-center gap-2 text-[11px] font-bold"><span className="h-2 w-2 rounded-full bg-primary" /> Ethereum mainnet <span className="font-normal text-muted-foreground">(simulated)</span></p></div><div className="border-t border-border pt-4"><p className="text-[10px] text-muted-foreground">Execution policy</p><p className="mt-1 text-[11px] font-bold">2 signatures required</p></div></div></section></div></div>;
}

function AuditView() {
  const events = [{ time: 'Today, 09:41', actor: 'Morgan Chen', action: 'proposed Q3 vendor settlement', detail: '12,500.00 USDC', tone: 'primary' }, { time: 'Today, 09:18', actor: 'Nisha Patel', action: 'signed cold storage rebalance', detail: 'Signature 1 of 3', tone: 'blue' }, { time: 'Yesterday, 16:24', actor: 'Jon Lee', action: 'viewed treasury balances', detail: 'Read-only session', tone: 'muted' }, { time: 'Yesterday, 14:08', actor: 'Morgan Chen', action: 'updated signing threshold', detail: '2 of 3 → 2 of 3', tone: 'accent' }];
  return <div className="animate-rise-in"><div className="mb-8"><p className="font-mono text-[10px] uppercase tracking-[.18em] text-primary">Immutable record</p><h2 className="mt-2 text-[29px] font-extrabold tracking-[-.055em]">Audit log</h2><p className="mt-2 text-[13px] text-muted-foreground">A concise history of activity in the simulated console.</p></div><div className="max-w-[900px] rounded-xl border border-border bg-card shadow-[0_12px_38px_hsl(222_28%_13%_/_0.035)]"><div className="flex items-center justify-between border-b border-border px-5 py-4"><div><h3 className="text-[14px] font-extrabold">Recent activity</h3><p className="mt-1 text-[11px] text-muted-foreground">Last 7 days · local mock data</p></div><button className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground hover:bg-muted" data-testid="button-audit-filter"><SlidersHorizontal size={12} /> Filter</button></div><div className="divide-y divide-border">{events.map((event, index) => <div className="flex gap-4 px-5 py-4 sm:px-6" key={event.time} data-testid={`row-audit-${index}`}><div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${event.tone === 'primary' ? 'bg-primary' : event.tone === 'blue' ? 'bg-[#4576c7]' : event.tone === 'accent' ? 'bg-accent' : 'bg-muted-foreground'}`} /><div className="min-w-0 flex-1"><p className="text-[11px]"><span className="font-bold">{event.actor}</span> <span className="text-muted-foreground">{event.action}</span></p><p className="mt-1 font-mono text-[9px] uppercase tracking-[.08em] text-muted-foreground">{event.detail}</p></div><time className="shrink-0 font-mono text-[9px] text-muted-foreground">{event.time}</time></div>)}</div></div></div>;
}

function ProposalModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0e1724]/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="proposal-title"><div className="w-full max-w-[520px] rounded-t-2xl border border-border bg-card shadow-2xl sm:rounded-2xl animate-rise-in"><div className="flex items-start justify-between border-b border-border px-5 py-5 sm:px-6"><div><div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><ArrowUpRight size={16} /></div><div><h2 id="proposal-title" className="text-[15px] font-extrabold tracking-[-.025em]">Propose a transfer</h2><p className="mt-0.5 text-[10px] text-muted-foreground">Creates a simulated Safe{`{Core}`} transaction</p></div></div></div><button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" data-testid="button-close-proposal" aria-label="Close proposal"><X size={17} /></button></div><form onSubmit={onSubmit} className="space-y-5 px-5 py-5 sm:px-6 sm:py-6"><div className="grid grid-cols-2 gap-3"><label className="block"><span className="mb-2 block text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">Asset</span><select name="asset" defaultValue="USDC" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-[12px] font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" data-testid="select-proposal-asset"><option value="USDC">USDC · USD Coin</option><option value="ETH">ETH · Ethereum</option><option value="WBTC">WBTC · Wrapped Bitcoin</option></select></label><label className="block"><span className="mb-2 block text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">Amount</span><input name="amount" type="number" step="any" min="0" placeholder="0.00" className="h-10 w-full rounded-lg border border-input bg-background px-3 font-mono text-[12px] outline-none placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15" data-testid="input-proposal-amount" /></label></div><label className="block"><span className="mb-2 block text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">Recipient address</span><input name="recipient" type="text" placeholder="0x… destination wallet" className="h-10 w-full rounded-lg border border-input bg-background px-3 font-mono text-[11px] outline-none placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15" data-testid="input-proposal-recipient" /></label><label className="block"><span className="mb-2 block text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">Internal memo <span className="font-normal normal-case tracking-normal">(optional)</span></span><input name="note" type="text" defaultValue="Treasury transfer" maxLength={34} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-[12px] outline-none placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15" data-testid="input-proposal-note" /></label><div className="flex items-start gap-2.5 rounded-lg border border-accent/30 bg-accent/10 p-3"><CircleHelp size={14} className="mt-0.5 shrink-0 text-[#bd7b04]" /><p className="text-[10px] leading-4 text-foreground/70">Your proposal will enter the queue with your simulated signature. Two additional signatures are required.</p></div><div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="h-10 rounded-lg border border-border px-4 text-[11px] font-bold text-muted-foreground hover:bg-muted" data-testid="button-cancel-proposal">Cancel</button><button type="submit" className="flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-[11px] font-bold text-primary-foreground hover:-translate-y-0.5" data-testid="button-submit-proposal"><Plus size={14} /> Add to signing queue</button></div></form></div></div>;
}

function Router() {
  return <RoutedErrorBoundary><Switch><Route path="/" component={Home} /><Route component={NotFound} /></Switch></RoutedErrorBoundary>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function NotFound() {
  return <div className="flex min-h-[100dvh] items-center justify-center bg-background p-6 text-center"><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-primary">404</p><h1 className="mt-3 text-2xl font-extrabold">Nothing in this address.</h1><p className="mt-2 text-sm text-muted-foreground">Return to the treasury console to continue.</p><a href="/" className="mt-6 inline-flex rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground" data-testid="link-return-home">Return to console</a></div></div>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;