import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Activity, ArrowDownRight, ArrowUpRight, BriefcaseBusiness, Building2, CalendarDays, CircleDollarSign, ClipboardList, FileText, FolderKanban, LayoutDashboard, LifeBuoy, LogOut, Menu, Plus, Search, ShieldCheck, Users, X } from 'lucide-react';
import { isSupabaseConfigured, requireAgencyAdmin, supabase } from './lib/supabase';

type Section = 'Overview' | 'Enquiries' | 'Clients' | 'Projects' | 'Tasks' | 'Invoices' | 'Services';
type RowData = Record<string, unknown>;
const sections: { name: Section; icon: typeof LayoutDashboard }[] = [
  { name: 'Overview', icon: LayoutDashboard }, { name: 'Enquiries', icon: LifeBuoy },
  { name: 'Clients', icon: Users }, { name: 'Projects', icon: FolderKanban },
  { name: 'Tasks', icon: ClipboardList }, { name: 'Invoices', icon: FileText }, { name: 'Services', icon: BriefcaseBusiness }
];
const tables: Record<Exclude<Section, 'Overview'>, { table: string; columns: string[] }> = {
  Enquiries: { table: 'agency_enquiries', columns: ['name', 'email', 'phone', 'service', 'status'] },
  Clients: { table: 'agency_clients', columns: ['name', 'business_name', 'email', 'phone', 'created_at'] },
  Projects: { table: 'agency_projects', columns: ['name', 'service', 'status', 'budget_kes', 'due_date'] },
  Tasks: { table: 'agency_tasks', columns: ['title', 'status', 'priority', 'due_date'] },
  Invoices: { table: 'agency_invoices', columns: ['invoice_number', 'client_name', 'total_kes', 'status', 'due_date'] },
  Services: { table: 'agency_services', columns: ['name', 'category', 'starting_price_kes', 'active'] }
};
const money = (value: unknown) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(Number(value || 0));
const label = (key: string) => key.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
const display = (v: unknown) => v == null || v === '' ? '—' : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v);

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [section, setSection] = useState<Section>('Overview');
  const [rows, setRows] = useState<RowData[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [revenue, setRevenue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const [search, setSearch] = useState('');

  const loadOverview = useCallback(async () => {
    if (!supabase) return;
    setLoading(true); setError('');
    const names = ['agency_enquiries', 'agency_clients', 'agency_projects', 'agency_tasks', 'agency_invoices'];
    const results = await Promise.all(names.map(t => supabase.from(t).select('*', { count: 'exact', head: true })));
    const next: Record<string, number> = {};
    results.forEach((r, i) => { next[names[i]] = r.count ?? 0; });
    const inv = await supabase.from('agency_invoices').select('total_kes').eq('status', 'Paid');
    setRevenue((inv.data || []).reduce((sum: number, item: any) => sum + Number(item.total_kes || 0), 0));
    setCounts(next); setLoading(false);
  }, []);

  const loadRows = useCallback(async (target: Section) => {
    if (!supabase || target === 'Overview') return;
    setLoading(true); setError('');
    const config = tables[target];
    const { data, error: queryError } = await supabase.from(config.table).select('*').order('created_at', { ascending: false }).limit(100);
    if (queryError) setError(queryError.message); else setRows((data || []) as RowData[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    client.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        const allowed = await requireAgencyAdmin(data.session.user.id);
        if (allowed) setSession(data.session); else { await client.auth.signOut(); setError('This account is not authorised for Webazi administration.'); }
      }
    });
    const { data: listener } = client.auth.onAuthStateChange((_event, next) => { if (!next) setSession(null); });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => { if (session) section === 'Overview' ? loadOverview() : loadRows(section); }, [session, section, loadOverview, loadRows]);

  const visibleRows = useMemo(() => rows.filter(row => Object.values(row).some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase()))), [rows, search]);

  async function signIn(e: FormEvent) {
    e.preventDefault(); setError('');
    const client = supabase;
    if (!client) return;
    const { data, error: authError } = await client.auth.signInWithPassword({ email: email.trim(), password });
    setPassword('');
    if (authError) { setError('Sign-in failed. Check your email and password.'); return; }
    if (data.user && !(await requireAgencyAdmin(data.user.id))) {
      await client.auth.signOut(); setError('Your account is not authorised for Webazi administration.');
    } else setSession(data.session);
  }
  async function signOut() { if (supabase) await supabase.auth.signOut(); setSession(null); }

  if (!isSupabaseConfigured) return <div className="setup-screen"><div className="login-card"><div className="brand-mark">W</div><h1>Connect your admin database</h1><p>Add the Supabase project URL and public anon key to the Vercel environment variables for this project.</p><code>VITE_SUPABASE_URL<br/>VITE_SUPABASE_ANON_KEY</code><p className="muted">Never place a service-role key or admin secret in frontend environment variables.</p></div></div>;

  if (!session) return <div className="login-screen"><form className="login-card" onSubmit={signIn}><div className="brand-mark">W</div><span className="eyebrow">WEBazi DIGITAL SOLUTIONS</span><h1>Welcome back</h1><p>Sign in to your private business workspace.</p><label>Email address<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="username" /></label><label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" /></label>{error && <div className="error">{error}</div>}<button className="primary full">Sign in securely</button><div className="secure-note"><ShieldCheck size={15}/> Protected administrator access</div></form></div>;

  return <div className="app-shell">
    <aside className={mobileNav ? 'sidebar open' : 'sidebar'}><div className="brand"><div className="brand-mark">W</div><div><strong>Webazi</strong><small>Digital Solutions</small></div><button className="icon-btn mobile-close" onClick={() => setMobileNav(false)}><X/></button></div>
      <div className="workspace-label">WORKSPACE</div><nav>{sections.map(item => <button key={item.name} className={section === item.name ? 'nav-item active' : 'nav-item'} onClick={() => { setSection(item.name); setMobileNav(false); }}><item.icon size={18}/><span>{item.name}</span>{item.name === 'Enquiries' && counts.agency_enquiries > 0 && <b>{counts.agency_enquiries}</b>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="workspace-label">ACCOUNT</div><div className="profile"><div className="avatar">{(session.user.email || 'W').slice(0,1).toUpperCase()}</div><div><strong>{session.user.email}</strong><small>Administrator</small></div><button className="icon-btn" onClick={signOut} title="Sign out"><LogOut size={17}/></button></div></div>
    </aside>
    {mobileNav && <button className="scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation"/>}
    <main className="main-area"><header className="topbar"><button className="icon-btn menu-btn" onClick={() => setMobileNav(true)}><Menu/></button><div><div className="crumb">Webazi Workspace <span>/</span> {section}</div><h2>{section === 'Overview' ? 'Business overview' : section}</h2></div><div className="top-actions"><a href="https://webazi.co.ke" target="_blank" rel="noreferrer">View website ↗</a><div className="avatar">{(session.user.email || 'W').slice(0,1).toUpperCase()}</div></div></header>
      {section === 'Overview' ? <><div className="welcome-row"><div><h1>Good to see you.</h1><p>Here’s what’s happening across your agency.</p></div><span className="date-pill"><CalendarDays size={15}/> {new Date().toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
        <div className="stats-grid">{[['Enquiries','agency_enquiries',LifeBuoy],['Clients','agency_clients',Users],['Active projects','agency_projects',FolderKanban],['Tasks','agency_tasks',ClipboardList]].map(([name,key,Icon]: any) => <div className="stat-card" key={key}><div className="stat-top"><span>{name}</span><span className="stat-icon"><Icon size={18}/></span></div><strong>{loading ? '—' : counts[key as string] ?? 0}</strong><small><Activity size={13}/> Live database count</small></div>)}</div>
        <div className="overview-grid"><section className="panel"><div className="panel-head"><div><h3>Business snapshot</h3><p>Confirmed paid invoices</p></div><span className="panel-icon"><CircleDollarSign/></span></div><div className="revenue">{money(revenue)}</div><div className="positive"><ArrowUpRight size={15}/> Paid invoice total</div><div className="snapshot-note">Revenue is calculated from invoices marked Paid; it is not a bank balance.</div></section><section className="panel"><div className="panel-head"><div><h3>Quick actions</h3><p>Jump into your daily workflow</p></div><span className="panel-icon"><Plus/></span></div><div className="quick-actions">{(['Enquiries','Clients','Projects','Invoices'] as Section[]).map(s => <button key={s} onClick={() => setSection(s)}><span>{s}</span><ArrowDownRight size={16}/></button>)}</div></section></div>
      </> : <section className="panel data-panel"><div className="panel-head"><div><h3>{section} management</h3><p>Showing the latest 100 records. Create and edit workflows will be added in the next phase.</p></div><div className="table-tools"><div className="search-box"><Search size={16}/><input placeholder={'Search ' + section.toLowerCase()} value={search} onChange={e => setSearch(e.target.value)}/></div></div></div>{error && <div className="error">{error}</div>}{loading ? <div className="empty">Loading records…</div> : visibleRows.length ? <div className="table-wrap"><table><thead><tr>{tables[section as Exclude<Section,'Overview'>].columns.map(c => <th key={c}>{label(c)}</th>)}</tr></thead><tbody>{visibleRows.map((row,i)=><tr key={String(row.id ?? i)}>{tables[section as Exclude<Section,'Overview'>].columns.map(c=><td key={c}>{c.endsWith('_kes') ? money(row[c]) : display(row[c])}</td>)}</tr>)}</tbody></table></div> : <div className="empty"><Building2 size={26}/><strong>No {section.toLowerCase()} yet</strong><span>New records will appear here when they are added to your workspace.</span></div>}</section>}
      <footer>© {new Date().getFullYear()} Webazi Digital Solutions <span>Private business workspace</span></footer>
    </main>
  </div>;
}