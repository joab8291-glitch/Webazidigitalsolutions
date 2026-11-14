import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { MessageCircle, Activity, ArrowDownRight, ArrowUpRight, BriefcaseBusiness, Building2, CalendarDays, CircleDollarSign, ClipboardList, FileText, FolderKanban, LayoutDashboard, LifeBuoy, LogOut, Menu, Plus, Search, ShieldCheck, Users, X } from 'lucide-react';
import { isSupabaseConfigured, requireAgencyAdmin, supabase } from './lib/supabase';

type Section = 'Overview' | 'Chat Inbox' | 'Enquiries' | 'Clients' | 'Projects' | 'Tasks' | 'Invoices' | 'Services';
type RowData = Record<string, unknown>;
const sections: { name: Section; icon: typeof LayoutDashboard }[] = [
  { name: 'Overview', icon: LayoutDashboard }, { name: 'Chat Inbox', icon: MessageCircle }, { name: 'Enquiries', icon: LifeBuoy },
  { name: 'Clients', icon: Users }, { name: 'Projects', icon: FolderKanban },
  { name: 'Tasks', icon: ClipboardList }, { name: 'Invoices', icon: FileText }, { name: 'Services', icon: BriefcaseBusiness }
];
const tables: Record<Exclude<Section, 'Overview'>, { table: string; columns: string[] }> = {
  'Chat Inbox': { table: 'agency_chat_requests', columns: ['name', 'phone', 'service', 'status', 'created_at'] },
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
type Field = { key: string; label: string; type?: 'text' | 'email' | 'tel' | 'number' | 'date' | 'textarea' | 'select'; required?: boolean; options?: string[] };
const fields: Record<Exclude<Section, 'Overview'>, Field[]> = {
  'Chat Inbox': [{key:'name',label:'Customer name',required:true},{key:'phone',label:'Contact number',type:'tel',required:true},{key:'email',label:'Email',type:'email'},{key:'service',label:'Service requested'},{key:'message',label:'Customer message',type:'textarea'},{key:'admin_reply',label:'Your reply / response',type:'textarea'},{key:'status',label:'Status',type:'select',options:['New','In Progress','Replied','Closed']}],
  Enquiries: [{key:'name',label:'Contact name',required:true},{key:'email',label:'Email',type:'email',required:true},{key:'phone',label:'Phone',type:'tel',required:true},{key:'business_name',label:'Business name'},{key:'service',label:'Service required',required:true},{key:'budget_kes',label:'Budget (KES)',type:'number'},{key:'status',label:'Status',type:'select',options:['New','Contacted','Quoted','Converted','Closed']},{key:'message',label:'Message',type:'textarea'}],
  Clients: [{key:'name',label:'Client name',required:true},{key:'business_name',label:'Business name'},{key:'email',label:'Email',type:'email'},{key:'phone',label:'Phone',type:'tel'},{key:'location',label:'Location'},{key:'notes',label:'Notes',type:'textarea'}],
  Projects: [{key:'name',label:'Project name',required:true},{key:'service',label:'Service',required:true},{key:'status',label:'Status',type:'select',options:['Not Started','In Progress','Awaiting Client','In Review','Completed','On Hold','Cancelled']},{key:'budget_kes',label:'Project value (KES)',type:'number'},{key:'start_date',label:'Start date',type:'date'},{key:'due_date',label:'Due date',type:'date'},{key:'description',label:'Description',type:'textarea'}],
  Tasks: [{key:'title',label:'Task title',required:true},{key:'status',label:'Status',type:'select',options:['To Do','In Progress','Blocked','Done']},{key:'priority',label:'Priority',type:'select',options:['Low','Normal','High','Urgent']},{key:'due_date',label:'Due date',type:'date'},{key:'description',label:'Description',type:'textarea'}],
  Invoices: [{key:'invoice_number',label:'Invoice number',required:true},{key:'client_name',label:'Client name',required:true},{key:'total_kes',label:'Total (KES)',type:'number',required:true},{key:'status',label:'Status',type:'select',options:['Draft','Sent','Partially Paid','Paid','Overdue','Cancelled']},{key:'due_date',label:'Due date',type:'date'},{key:'notes',label:'Notes',type:'textarea'}],
  Services: [{key:'name',label:'Service name',required:true},{key:'category',label:'Category',required:true},{key:'starting_price_kes',label:'Starting price (KES)',type:'number'},{key:'active',label:'Visibility',type:'select',options:['Active','Inactive']},{key:'description',label:'Description',type:'textarea'}]
};
const defaults: Record<string, unknown> = { priority:'Normal', budget_kes:0, total_kes:0, starting_price_kes:0, active:'Active' };



function PublicRequestForm() {
 const bookingParams = new URLSearchParams(window.location.search);
 const [name,setName]=useState(bookingParams.get('name') || ''); const [phone,setPhone]=useState(''); const [email,setEmail]=useState('');
 const [service,setService]=useState(bookingParams.get('service') || 'Web Design'); const [message,setMessage]=useState(bookingParams.get('message') || '');
 const [busy,setBusy]=useState(false); const [sent,setSent]=useState(false); const [error,setError]=useState('');
 async function submit(e:FormEvent){e.preventDefault();if(!supabase){setError('The request form is temporarily unavailable. Please call Webazi directly.');return;}setBusy(true);setError('');
 try {
  const {error:err}=await supabase.from('agency_chat_requests').insert({name:name.trim(),phone:phone.trim(),email:email.trim()||null,service,message:message.trim(),status:'New'});
  if(err){console.error('Webazi customer request submission failed:',err);setError('We could not send your request. Please try again shortly, or call Webazi directly.');return;}
  setSent(true);
 } catch(err) { console.error('Webazi customer request submission failed:',err);setError('A connection problem stopped your request from sending. Please try again, or call Webazi directly.'); }
 finally {setBusy(false);}
 }
 return <div className="request-screen"><form className="request-card" onSubmit={submit}>
 <img className="brand-logo request-logo" src="/icon-192.png" alt="Webazi Digital Solutions"/>
 <span className="eyebrow">WEBAZI DIGITAL SOLUTIONS</span><h1>How can we help your business?</h1>
 <p>Send your request directly to our team. No account or sign-in is needed.</p>
 {sent ? <div className="request-success"><ShieldCheck size={28}/><h2>Request received</h2><p>We’ll contact you using the number you provided.</p><a href="/">Back to website</a></div> : <>
 <label>Your name<input value={name} onChange={e=>setName(e.target.value)} required maxLength={100}/></label>
 <label>Contact number<input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} required minLength={7} maxLength={30} placeholder="+254 7xx xxx xxx"/></label>
 <label>Email (optional)<input type="email" value={email} onChange={e=>setEmail(e.target.value)} maxLength={254}/></label>
 <label>Service<select value={service} onChange={e=>setService(e.target.value)}>{['Web Design','E-commerce Website','SEO Services','Digital Marketing','Graphic Design','M-Pesa Integration','Other'].map(x=><option key={x}>{x}</option>)}</select></label>
 <label>Your message<textarea value={message} onChange={e=>setMessage(e.target.value)} required minLength={5} maxLength={3000} rows={5}/></label>
 {error&&<div className="error">{error}</div>}<button className="primary full" disabled={busy}>{busy?'Sending…':'Send request to Webazi'}</button>
 <div className="secure-note"><ShieldCheck size={15}/> No customer account required</div></>}
 </form></div>;
}

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
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  const loadOverview = useCallback(async () => {
    const client = supabase;
    if (!client) return;
    setLoading(true); setError('');
    const names = ['agency_chat_requests', 'agency_enquiries', 'agency_clients', 'agency_projects', 'agency_tasks', 'agency_invoices'];
    const results = await Promise.all(names.map(t => client.from(t).select('*', { count: 'exact', head: true })));
    const next: Record<string, number> = {};
    results.forEach((r, i) => { next[names[i]] = r.count ?? 0; });
    const inv = await client.from('agency_invoices').select('total_kes').eq('status', 'Paid');
    setRevenue((inv.data || []).reduce((sum: number, item: any) => sum + Number(item.total_kes || 0), 0));
    setCounts(next); setLoading(false);
  }, []);

  const loadRows = useCallback(async (target: Section) => {
    const client = supabase;
    if (!client || target === 'Overview') return;
    setLoading(true); setError('');
    const config = tables[target];
    const { data, error: queryError } = await client.from(config.table).select('*').order('created_at', { ascending: false }).limit(100);
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

  function openCreate() {
    if (section === 'Overview') return;
    const initial: Record<string, unknown> = {};
    fields[section].forEach(field => { initial[field.key] = defaults[field.key] ?? (field.type === 'select' ? field.options?.[0] ?? '' : ''); });
    setEditingId(null); setFormValues(initial); setModalOpen(true);
  }
  function openEdit(row: RowData) {
    if (section === 'Overview') return;
    const initial: Record<string, unknown> = {};
    fields[section].forEach(field => {
      const value = row[field.key];
      initial[field.key] = field.key === 'active' ? (value ? 'Active' : 'Inactive') : value ?? '';
    });
    setEditingId(String(row.id)); setFormValues(initial); setModalOpen(true);
  }
  async function saveRecord(e: FormEvent) {
    e.preventDefault();
    const client = supabase;
    if (!client || section === 'Overview') return;
    setSaving(true); setError('');
    const payload: Record<string, unknown> = {};
    fields[section].forEach(field => {
      const value = formValues[field.key];
      if (field.key === 'active') payload.active = value === 'Active';
      else if (field.type === 'number') payload[field.key] = value === '' ? 0 : Number(value);
      else payload[field.key] = value === '' ? null : value;
    });
    const table = tables[section].table;
    const result = editingId ? await client.from(table).update(payload).eq('id', editingId) : await client.from(table).insert(payload);
    setSaving(false);
    if (result.error) { setError(result.error.message); return; }
    setModalOpen(false); await loadRows(section); await loadOverview();
  }
  async function removeRecord(row: RowData) {
    const client = supabase;
    if (!client || section === 'Overview' || !row.id) return;
    if (!window.confirm('Delete this record permanently?')) return;
    const { error: deleteError } = await client.from(tables[section].table).delete().eq('id', row.id);
    if (deleteError) setError(deleteError.message);
    else { await loadRows(section); await loadOverview(); }
  }

  async function signOut() { if (supabase) await supabase.auth.signOut(); setSession(null); }

  if ((window.location.pathname === '/request' || window.location.pathname === '/request/') && isSupabaseConfigured) return <PublicRequestForm />;

  if (!isSupabaseConfigured) return <div className="setup-screen"><div className="login-card"><img className="brand-logo" src="/icon-192.png" alt="Webazi Digital Solutions" /><h1>Connect your admin database</h1><p>Add the Supabase project URL and public anon key to the Vercel environment variables for this project.</p><code>VITE_SUPABASE_URL<br/>VITE_SUPABASE_ANON_KEY</code><p className="muted">Never place a service-role key or admin secret in frontend environment variables.</p></div></div>;

  if (!session) return <div className="login-screen"><form className="login-card" onSubmit={signIn}><div className="brand-mark">W</div><span className="eyebrow">WEBazi DIGITAL SOLUTIONS</span><h1>Welcome back</h1><p>Sign in to your private business workspace.</p><label>Email address<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="username" /></label><label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" /></label>{error && <div className="error">{error}</div>}<button className="primary full">Sign in securely</button><div className="secure-note"><ShieldCheck size={15}/> Protected administrator access</div></form></div>;

  return <div className="app-shell">
    <aside className={mobileNav ? 'sidebar open' : 'sidebar'}><div className="brand"><div className="brand-mark">W</div><div><strong>Webazi</strong><small>Digital Solutions</small></div><button className="icon-btn mobile-close" onClick={() => setMobileNav(false)}><X/></button></div>
      <div className="workspace-label">WORKSPACE</div><nav>{sections.map(item => <button key={item.name} className={section === item.name ? 'nav-item active' : 'nav-item'} onClick={() => { setSection(item.name); setMobileNav(false); }}><item.icon size={18}/><span>{item.name}</span>{item.name === 'Chat Inbox' && counts.agency_chat_requests > 0 && <b>{counts.agency_chat_requests}</b>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="workspace-label">ACCOUNT</div><div className="profile"><div className="avatar">{(session.user.email || 'W').slice(0,1).toUpperCase()}</div><div><strong>{session.user.email}</strong><small>Administrator</small></div><button className="icon-btn" onClick={signOut} title="Sign out"><LogOut size={17}/></button></div></div>
    </aside>
    {mobileNav && <button className="scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation"/>}
    <main className="main-area"><header className="topbar"><button className="icon-btn menu-btn" onClick={() => setMobileNav(true)}><Menu/></button><div><div className="crumb">Webazi Workspace <span>/</span> {section}</div><h2>{section === 'Overview' ? 'Business overview' : section}</h2></div><div className="top-actions"><a href="https://webazi.co.ke" target="_blank" rel="noreferrer">View website ↗</a><div className="avatar">{(session.user.email || 'W').slice(0,1).toUpperCase()}</div></div></header>
      {section === 'Overview' ? <><div className="welcome-row"><div><h1>Good to see you.</h1><p>Here’s what’s happening across your agency.</p></div><span className="date-pill"><CalendarDays size={15}/> {new Date().toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
        <div className="stats-grid">{[['Enquiries','agency_enquiries',LifeBuoy],['Clients','agency_clients',Users],['Active projects','agency_projects',FolderKanban],['Tasks','agency_tasks',ClipboardList]].map(([name,key,Icon]: any) => <div className="stat-card" key={key}><div className="stat-top"><span>{name}</span><span className="stat-icon"><Icon size={18}/></span></div><strong>{loading ? '—' : counts[key as string] ?? 0}</strong><small><Activity size={13}/> Live database count</small></div>)}</div>
        <div className="overview-grid"><section className="panel"><div className="panel-head"><div><h3>Business snapshot</h3><p>Confirmed paid invoices</p></div><span className="panel-icon"><CircleDollarSign/></span></div><div className="revenue">{money(revenue)}</div><div className="positive"><ArrowUpRight size={15}/> Paid invoice total</div><div className="snapshot-note">Revenue is calculated from invoices marked Paid; it is not a bank balance.</div></section><section className="panel"><div className="panel-head"><div><h3>Quick actions</h3><p>Jump into your daily workflow</p></div><span className="panel-icon"><Plus/></span></div><div className="quick-actions">{(['Chat Inbox','Clients','Projects','Invoices'] as Section[]).map(s => <button key={s} onClick={() => setSection(s)}><span>{s}</span><ArrowDownRight size={16}/></button>)}</div></section></div>
      </> : <section className="panel data-panel"><div className="panel-head"><div><h3>{section} management</h3><p>Review customer requests, save replies and contact customers directly from the inbox.</p></div><div className="table-tools"><div className="search-box"><Search size={16}/><input placeholder={'Search ' + section.toLowerCase()} value={search} onChange={e => setSearch(e.target.value)}/></div><button className="primary add-btn" onClick={openCreate}><Plus size={15}/> New {section === 'Chat Inbox' ? 'request' : section === 'Enquiries' ? 'enquiry' : section.slice(0,-1).toLowerCase()}</button></div></div>{error && <div className="error">{error}</div>}{loading ? <div className="empty">Loading records…</div> : visibleRows.length ? <div className="table-wrap"><table><thead><tr>{tables[section as Exclude<Section,'Overview'>].columns.map(c => <th key={c}>{label(c)}</th>)}<th>Actions</th></tr></thead><tbody>{visibleRows.map((row,i)=><tr key={String(row.id ?? i)}>{tables[section as Exclude<Section,'Overview'>].columns.map(c=><td key={c}>{c === 'phone' && row[c] ? <span className="contact-links"><a href={'tel:' + String(row[c])}>Call</a><a href={'sms:' + String(row[c]) + '?body=' + encodeURIComponent(String(row.admin_reply || ''))}>Text</a></span> : c.endsWith('_kes') ? money(row[c]) : display(row[c])}</td>)}<td><div className="row-actions"><button onClick={() => openEdit(row)}>Edit</button><button className="danger-link" onClick={() => removeRecord(row)}>Delete</button></div></td></tr>)}</tbody></table></div> : <div className="empty"><Building2 size={26}/><strong>No {section.toLowerCase()} yet</strong><span>Create your first record using the button above.</span></div>}</section>}
      {modalOpen && section !== 'Overview' && <div className="modal-backdrop" onClick={() => setModalOpen(false)}><form className="record-modal" onSubmit={saveRecord} onClick={e => e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">WEBAZI WORKSPACE</span><h3>{editingId ? 'Edit ' : 'New '}{section === 'Chat Inbox' ? 'Customer Request' : section === 'Enquiries' ? 'Enquiry' : section.slice(0,-1)}</h3></div><button type="button" className="icon-btn" onClick={() => setModalOpen(false)}><X/></button></div><div className="form-grid">{fields[section].map(field => <label key={field.key} className={field.type === 'textarea' ? 'wide-field' : ''}>{field.label}{field.type === 'textarea' ? <textarea rows={3} value={String(formValues[field.key] ?? '')} onChange={e => setFormValues(v => ({...v,[field.key]:e.target.value}))}/> : field.type === 'select' ? <select value={String(formValues[field.key] ?? '')} onChange={e => setFormValues(v => ({...v,[field.key]:e.target.value}))}>{field.options?.map(option => <option key={option}>{option}</option>)}</select> : <input type={field.type || 'text'} min={field.type === 'number' ? '0' : undefined} value={String(formValues[field.key] ?? '')} onChange={e => setFormValues(v => ({...v,[field.key]:e.target.value}))} required={field.required}/>}</label>)}</div><div className="modal-actions"><button type="button" className="secondary" onClick={() => setModalOpen(false)}>Cancel</button><button className="primary" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Create record'}</button></div></form></div>}
      <footer>© {new Date().getFullYear()} Webazi Digital Solutions <span>Private business workspace</span></footer>
    </main>
  </div>;
}