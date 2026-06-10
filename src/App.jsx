import { useState, useEffect } from 'react'
import { STAFF, ROOMS, SERVICES, genId, genToken } from './data.js'
import { loadBookings, saveBookings, loadSettings, saveSettings } from './storage.js'
import {
  sendStaffInviteEmail, sendClientPendingEmail,
  sendClientConfirmEmail, sendClientDeclineEmail
} from './email.js'

// ─── UI Primitives ─────────────────────────────────────────────────────────
function Toast({ message, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 4000); return () => clearTimeout(t) }, [])
  const s = {
    success: { bg: '#C8F5C8', color: '#0A3D0A', border: '1px solid #7CCC7C' },
    error:   { bg: '#FFD0D0', color: '#5C0000', border: '1px solid #FF8A8A' },
    warning: { bg: '#FFF3CD', color: '#7A5200', border: '1px solid #FFC107' },
    info:    { bg: '#1a1a1a', color: '#fff',    border: 'none' },
  }[type] || { bg: '#1a1a1a', color: '#fff', border: 'none' }
  return (
    <div style={{ position:'fixed', bottom:28, left:'50%', transform:'translateX(-50%)',
      background:s.bg, color:s.color, border:s.border,
      padding:'12px 24px', borderRadius:8, fontSize:14, fontWeight:500,
      zIndex:9999, boxShadow:'0 4px 24px rgba(0,0,0,0.18)', whiteSpace:'nowrap', maxWidth:'90vw'
    }}>{message}</div>
  )
}

function Badge({ status }) {
  const m = {
    pending:   { bg:'#FFF3CD', color:'#7A5200', label:'Pending'   },
    confirmed: { bg:'#C8F5C8', color:'#0A3D0A', label:'Confirmed' },
    declined:  { bg:'#FFE0E0', color:'#7A0000', label:'Declined'  },
    cancelled: { bg:'#E8E8E8', color:'#555',    label:'Cancelled' },
  }[status] || { bg:'#FFF3CD', color:'#7A5200', label:'Pending' }
  return <span style={{ background:m.bg, color:m.color, padding:'3px 10px', borderRadius:20,
    fontSize:12, fontWeight:600, letterSpacing:'0.04em', textTransform:'uppercase',
    fontFamily:'DM Mono, monospace' }}>{m.label}</span>
}

const INP = {
  width:'100%', padding:'10px 14px', borderRadius:8,
  border:'1px solid #2a2a2a', background:'#111', color:'#F0EDE8',
  fontSize:14, outline:'none', boxSizing:'border-box'
}
const LBL = {
  display:'block', fontSize:11, fontWeight:600, color:'#888',
  letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6,
  fontFamily:'DM Mono, monospace'
}

// ─── Settings ─────────────────────────────────────────────────────────────
function SettingsPanel({ settings, onSave }) {
  const [form, setForm] = useState(settings)
  const [saving, setSaving] = useState(false)
  const [showKey, setShowKey] = useState(false)

  async function handleSave() {
    setSaving(true); await onSave(form); setSaving(false)
  }

  return (
    <div style={{ maxWidth:560 }}>
      <div style={{ marginBottom:32 }}>
        <h1 style={{ fontFamily:'DM Sans, sans-serif', fontSize:28, fontWeight:800, margin:'0 0 4px', letterSpacing:'-0.03em' }}>Settings</h1>
        <p style={{ color:'#888', fontSize:14, margin:0 }}>Configure email notifications via Resend.</p>
      </div>
      <div style={{ background:'#111', border:'1px solid #2a2a2a', borderRadius:12, padding:20, marginBottom:28 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'#C8A96E', fontFamily:'DM Mono, monospace', letterSpacing:'0.06em', marginBottom:10 }}>SETUP GUIDE</div>
        <ol style={{ margin:0, paddingLeft:18, color:'#888', fontSize:13, lineHeight:2 }}>
          <li>Go to <a href="https://resend.com" target="_blank" rel="noreferrer" style={{ color:'#C8A96E' }}>resend.com</a> and create a free account</li>
          <li>Add & verify your domain <code style={{ background:'#1a1a1a', padding:'1px 6px', borderRadius:4, color:'#F0EDE8' }}>coachhousemusic.uk</code></li>
          <li>Go to API Keys → Create API Key → paste below</li>
          <li>Set your From address e.g. <code style={{ background:'#1a1a1a', padding:'1px 6px', borderRadius:4, color:'#F0EDE8' }}>bookings@coachhousemusic.uk</code></li>
        </ol>
      </div>
      <div style={{ display:'grid', gap:20 }}>
        <div>
          <span style={LBL}>Resend API Key</span>
          <div style={{ position:'relative' }}>
            <input style={{ ...INP, paddingRight:80 }} type={showKey ? 'text' : 'password'}
              value={form.resendApiKey || ''} onChange={e => setForm(f => ({ ...f, resendApiKey: e.target.value }))}
              placeholder="re_xxxxxxxxxxxxxxxxxxxx" />
            <button onClick={() => setShowKey(v => !v)} style={{ position:'absolute', right:10, top:'50%',
              transform:'translateY(-50%)', background:'transparent', border:'none', color:'#666',
              fontSize:12, cursor:'pointer', fontFamily:'DM Mono, monospace' }}>{showKey ? 'hide' : 'show'}</button>
          </div>
        </div>
        <div>
          <span style={LBL}>From Email Address</span>
          <input style={INP} type="email" value={form.fromEmail || ''}
            onChange={e => setForm(f => ({ ...f, fromEmail: e.target.value }))}
            placeholder="bookings@coachhousemusic.uk" />
        </div>
        <div>
          <span style={LBL}>App URL</span>
          <input style={INP} value={form.appUrl || ''}
            onChange={e => setForm(f => ({ ...f, appUrl: e.target.value }))}
            placeholder="https://booking.coachhousemusic.uk" />
          <div style={{ fontSize:11, color:'#555', marginTop:6 }}>Used for accept/decline links in staff emails.</div>
        </div>
        <div>
          <span style={LBL}>Staff Email Addresses</span>
          <div style={{ display:'grid', gap:10 }}>
            {STAFF.map(s => (
              <div key={s.id} style={{ display:'flex', gap:12, alignItems:'center' }}>
                <div style={{ width:80, fontSize:13, fontWeight:600, color:'#F0EDE8', flexShrink:0 }}>{s.name}</div>
                <input style={{ ...INP, flex:1 }} type="email"
                  value={form[`email_${s.id}`] || s.email}
                  onChange={e => setForm(f => ({ ...f, [`email_${s.id}`]: e.target.value }))}
                  placeholder={s.email} />
              </div>
            ))}
          </div>
        </div>
        <div>
          <span style={LBL}>Email Triggers</span>
          <div style={{ display:'grid', gap:8 }}>
            {[
              ['notifyStaffOnNew',      'Notify staff when new booking request arrives'],
              ['notifyClientOnReceive', 'Notify client their request was received'],
              ['notifyClientOnConfirm', 'Notify client when booking is confirmed'],
              ['notifyClientOnDecline', 'Notify client when booking is declined'],
            ].map(([key, label]) => (
              <label key={key} style={{ display:'flex', alignItems:'center', gap:12, cursor:'pointer',
                padding:'10px 14px', background:'#111', borderRadius:8, border:'1px solid #1e1e1e' }}>
                <div onClick={() => setForm(f => ({ ...f, [key]: !f[key] }))} style={{
                  width:36, height:20, borderRadius:10, position:'relative', flexShrink:0,
                  background: form[key] ? '#C8A96E' : '#2a2a2a', transition:'background 0.2s', cursor:'pointer'
                }}>
                  <div style={{ position:'absolute', top:3, left: form[key] ? 19 : 3,
                    width:14, height:14, borderRadius:'50%', background:'#fff',
                    transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.3)' }} />
                </div>
                <span style={{ fontSize:13, color:'#ccc' }}>{label}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <button onClick={handleSave} disabled={saving} style={{
            padding:'13px 28px', borderRadius:10, border:'none',
            background: saving ? '#2a2a2a' : '#C8A96E',
            color: saving ? '#555' : '#0D0D0D',
            fontWeight:700, fontSize:14, cursor: saving ? 'default' : 'pointer', transition:'all 0.15s'
          }}>{saving ? 'Saving…' : 'Save Settings'}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Booking Form ──────────────────────────────────────────────────────────
function BookingForm({ onSubmit, settings }) {
  const [form, setForm] = useState({
    clientName:'', clientEmail:'', clientPhone:'',
    room:'a', service:'Recording Session',
    date:'', startTime:'10:00', hours:4,
    notes:'', staffNeeded:['blaze'],
  })
  const [submitting, setSubmitting] = useState(false)
  const [emailStatus, setEmailStatus] = useState(null)

  const room = ROOMS.find(r => r.id === form.room)
  const total = room ? room.rate * form.hours : 0

  function toggleStaff(id) {
    setForm(f => ({
      ...f,
      staffNeeded: f.staffNeeded.includes(id)
        ? f.staffNeeded.filter(s => s !== id)
        : [...f.staffNeeded, id]
    }))
  }

  async function handleSubmit() {
    if (!form.clientName || !form.clientEmail || !form.date) return
    setSubmitting(true)
    const tokens = form.staffNeeded.reduce((acc, id) => ({ ...acc, [id]: genToken() }), {})
    const booking = {
      ...form, id: genId(), status: 'pending',
      createdAt: new Date().toISOString(),
      staffResponses: form.staffNeeded.reduce((acc, id) => ({ ...acc, [id]: 'pending' }), {}),
      tokens,
    }
    await onSubmit(booking)
    const apiKey = settings.resendApiKey
    const fromEmail = settings.fromEmail
    const appUrl = settings.appUrl || window.location.href.split('?')[0]
    if (apiKey && fromEmail) {
      const errs = []
      if (settings.notifyClientOnReceive) {
        try { await sendClientPendingEmail({ apiKey, fromEmail, booking, rooms: ROOMS }) }
        catch (e) { errs.push(`Client: ${e.message}`) }
      }
      if (settings.notifyStaffOnNew) {
        for (const sid of form.staffNeeded) {
          const staff = STAFF.find(s => s.id === sid)
          const staffEmail = settings[`email_${sid}`] || staff.email
          try { await sendStaffInviteEmail({ apiKey, fromEmail, staff: { ...staff, email: staffEmail }, booking, appUrl, rooms: ROOMS }) }
          catch (e) { errs.push(`${staff.name}: ${e.message}`) }
        }
      }
      setEmailStatus(errs.length
        ? { type:'warning', msg:`Saved. Email errors: ${errs.join('; ')}` }
        : { type:'success', msg:'Booking saved & emails sent ✓' })
    } else {
      setEmailStatus({ type:'info', msg:'Booking saved (configure Resend in Settings to enable emails)' })
    }
    setSubmitting(false)
  }

  return (
    <div style={{ maxWidth:640, margin:'0 auto' }}>
      {emailStatus && (
        <div style={{ marginBottom:20, padding:'12px 16px', borderRadius:8,
          background: emailStatus.type==='success' ? 'rgba(200,245,200,0.1)' : emailStatus.type==='warning' ? 'rgba(255,193,7,0.1)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${emailStatus.type==='success'?'#4CAF50':emailStatus.type==='warning'?'#FFC107':'#333'}`,
          fontSize:13, color: emailStatus.type==='success'?'#4CAF50':emailStatus.type==='warning'?'#FFC107':'#888'
        }}>{emailStatus.msg}</div>
      )}
      <p style={{ color:'#888', fontSize:14, margin:'0 0 28px' }}>Fill in your details and the team will be notified. You'll receive confirmation once accepted.</p>
      <div style={{ display:'grid', gap:20 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div><span style={LBL}>Your Name *</span><input style={INP} value={form.clientName} onChange={e=>setForm(f=>({...f,clientName:e.target.value}))} placeholder="Full name" /></div>
          <div><span style={LBL}>Phone</span><input style={INP} value={form.clientPhone} onChange={e=>setForm(f=>({...f,clientPhone:e.target.value}))} placeholder="+44..." /></div>
        </div>
        <div><span style={LBL}>Email *</span><input style={INP} type="email" value={form.clientEmail} onChange={e=>setForm(f=>({...f,clientEmail:e.target.value}))} placeholder="your@email.com" /></div>
        <div>
          <span style={LBL}>Studio Room *</span>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
            {ROOMS.map(r => (
              <div key={r.id} onClick={()=>setForm(f=>({...f,room:r.id}))} style={{
                padding:'14px 12px', borderRadius:10, cursor:'pointer',
                border: form.room===r.id ? '1.5px solid #C8A96E' : '1px solid #2a2a2a',
                background: form.room===r.id ? 'rgba(200,169,110,0.08)' : '#111', transition:'all 0.15s'
              }}>
                <div style={{ fontWeight:700, fontSize:13, color:form.room===r.id?'#C8A96E':'#F0EDE8' }}>{r.label}</div>
                <div style={{ fontSize:11, color:'#666', marginTop:4, lineHeight:1.4 }}>{r.desc}</div>
                <div style={{ fontSize:13, color:'#C8A96E', marginTop:8, fontWeight:600, fontFamily:'DM Mono, monospace' }}>£{r.rate}/hr</div>
              </div>
            ))}
          </div>
        </div>
        <div><span style={LBL}>Service Type *</span>
          <select style={{...INP,appearance:'none'}} value={form.service} onChange={e=>setForm(f=>({...f,service:e.target.value}))}>
            {SERVICES.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16 }}>
          <div><span style={LBL}>Date *</span><input style={INP} type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} min={new Date().toISOString().split('T')[0]} /></div>
          <div><span style={LBL}>Start Time</span><input style={INP} type="time" value={form.startTime} onChange={e=>setForm(f=>({...f,startTime:e.target.value}))} /></div>
          <div><span style={LBL}>Duration</span>
            <select style={{...INP,appearance:'none'}} value={form.hours} onChange={e=>setForm(f=>({...f,hours:Number(e.target.value)}))}>
              {[1,2,3,4,5,6,7,8,10,12].map(h=><option key={h} value={h}>{h}hr{h>1?'s':''}</option>)}
            </select>
          </div>
        </div>
        <div>
          <span style={LBL}>Request Engineer / Producer</span>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {STAFF.map(s => (
              <div key={s.id} onClick={()=>toggleStaff(s.id)} style={{
                padding:'10px 16px', borderRadius:8, cursor:'pointer',
                border: form.staffNeeded.includes(s.id) ? '1.5px solid #C8A96E' : '1px solid #2a2a2a',
                background: form.staffNeeded.includes(s.id) ? 'rgba(200,169,110,0.08)' : '#111', transition:'all 0.15s'
              }}>
                <div style={{ fontSize:13, fontWeight:600, color:form.staffNeeded.includes(s.id)?'#C8A96E':'#F0EDE8' }}>{s.name}</div>
                <div style={{ fontSize:11, color:'#666' }}>{s.role}</div>
              </div>
            ))}
          </div>
        </div>
        <div><span style={LBL}>Project Notes</span>
          <textarea style={{...INP,height:80,resize:'vertical'}} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Artist name, genre, what you're working on..." />
        </div>
        <div style={{ borderTop:'1px solid #1e1e1e', paddingTop:20, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:11, color:'#888', fontFamily:'DM Mono, monospace', letterSpacing:'0.06em', textTransform:'uppercase' }}>Estimated Total</div>
            <div style={{ fontSize:28, fontWeight:700, color:'#C8A96E', marginTop:2 }}>£{total.toLocaleString()}</div>
            <div style={{ fontSize:11, color:'#666' }}>{form.hours}hr × £{room?.rate}/hr · subject to confirmation</div>
          </div>
          <button onClick={handleSubmit} disabled={submitting||!form.clientName||!form.clientEmail||!form.date} style={{
            padding:'14px 32px', borderRadius:10, border:'none', cursor:'pointer',
            background:(!form.clientName||!form.clientEmail||!form.date)?'#2a2a2a':'#C8A96E',
            color:(!form.clientName||!form.clientEmail||!form.date)?'#555':'#0D0D0D',
            fontWeight:700, fontSize:15, transition:'all 0.15s'
          }}>{submitting?'Sending…':'Send Booking Request →'}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Staff Invite Card ─────────────────────────────────────────────────────
function StaffInviteView({ booking, onRespond, currentStaff }) {
  const room = ROOMS.find(r => r.id === booking.room)
  const myResponse = booking.staffResponses[currentStaff.id]
  const total = room ? room.rate * booking.hours : 0
  const dateStr = new Date(booking.date).toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
  return (
    <div style={{ background:'#111', border:'1px solid #222', borderRadius:14, padding:28, maxWidth:520, margin:'0 auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
        <div>
          <div style={{ fontSize:11, color:'#888', fontFamily:'DM Mono, monospace', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:4 }}>Request · #{booking.id}</div>
          <div style={{ fontSize:22, fontWeight:700, color:'#F0EDE8' }}>{booking.clientName}</div>
          <div style={{ fontSize:13, color:'#888' }}>{booking.clientEmail}{booking.clientPhone?` · ${booking.clientPhone}`:''}</div>
        </div>
        <Badge status={booking.status} />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
        {[['Room',room?.label],['Service',booking.service],['Date',dateStr],['Time',`${booking.startTime} · ${booking.hours}hr`],['Fee',`£${total.toLocaleString()}`],['Received',new Date(booking.createdAt).toLocaleDateString('en-GB')]].map(([k,v])=>(
          <div key={k} style={{ background:'#0D0D0D', borderRadius:8, padding:'10px 14px' }}>
            <div style={{ fontSize:10, color:'#666', fontFamily:'DM Mono, monospace', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:3 }}>{k}</div>
            <div style={{ fontSize:13, color:'#F0EDE8', fontWeight:600 }}>{v}</div>
          </div>
        ))}
      </div>
      {booking.notes && (
        <div style={{ background:'#0D0D0D', borderRadius:8, padding:'12px 14px', marginBottom:20 }}>
          <div style={{ fontSize:10, color:'#666', fontFamily:'DM Mono, monospace', textTransform:'uppercase', marginBottom:4 }}>Notes</div>
          <div style={{ fontSize:13, color:'#ccc', lineHeight:1.5 }}>{booking.notes}</div>
        </div>
      )}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:10, color:'#666', fontFamily:'DM Mono, monospace', textTransform:'uppercase', marginBottom:10 }}>Team Responses</div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {Object.entries(booking.staffResponses).map(([sid,resp])=>{
            const s = STAFF.find(x=>x.id===sid)
            const col = resp==='accepted'?'#4CAF50':resp==='declined'?'#EF5350':'#555'
            return <span key={sid} style={{ fontSize:11, color:col, fontFamily:'DM Mono, monospace', background:'#0D0D0D', padding:'4px 10px', borderRadius:20 }}>{s?.name}: {resp}</span>
          })}
        </div>
      </div>
      {myResponse==='pending' && booking.status==='pending' ? (
        <div style={{ display:'flex', gap:12 }}>
          <button onClick={()=>onRespond(booking.id,currentStaff.id,'accepted')} style={{ flex:1, padding:'14px 0', borderRadius:10, border:'1.5px solid #4CAF50', background:'rgba(76,175,80,0.08)', color:'#4CAF50', fontWeight:700, fontSize:15, cursor:'pointer' }}>✓ Accept Booking</button>
          <button onClick={()=>onRespond(booking.id,currentStaff.id,'declined')} style={{ flex:1, padding:'14px 0', borderRadius:10, border:'1.5px solid #EF5350', background:'rgba(239,83,80,0.08)', color:'#EF5350', fontWeight:700, fontSize:15, cursor:'pointer' }}>✕ Decline</button>
        </div>
      ) : (
        <div style={{ textAlign:'center', padding:16, background:'#0D0D0D', borderRadius:10, fontSize:13, color:'#888' }}>
          {myResponse==='accepted'?'✓ You accepted this booking':myResponse==='declined'?'✕ You declined this booking':`Booking is ${booking.status}`}
        </div>
      )}
    </div>
  )
}

// ─── Dashboard ─────────────────────────────────────────────────────────────
function Dashboard({ bookings, onRespond, onCancel, viewAs }) {
  const [filter, setFilter] = useState('all')
  const filtered = bookings.filter(b => filter==='all' || b.status===filter)
  const counts = {
    all:bookings.length,
    pending:bookings.filter(b=>b.status==='pending').length,
    confirmed:bookings.filter(b=>b.status==='confirmed').length,
    declined:bookings.filter(b=>b.status==='declined').length,
  }
  const upcoming = bookings.filter(b=>b.status==='confirmed'&&new Date(b.date)>=new Date()).sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(0,5)

  return (
    <div>
      {upcoming.length>0 && (
        <div style={{ marginBottom:32 }}>
          <div style={{ fontSize:11, color:'#666', fontFamily:'DM Mono, monospace', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:12 }}>Upcoming Confirmed Sessions</div>
          <div style={{ display:'flex', gap:10, overflowX:'auto', paddingBottom:4 }}>
            {upcoming.map(b=>{
              const room=ROOMS.find(r=>r.id===b.room); const d=new Date(b.date)
              return (
                <div key={b.id} style={{ minWidth:140, background:'#111', border:'1px solid rgba(200,169,110,0.25)', borderRadius:10, padding:'14px 16px', flexShrink:0 }}>
                  <div style={{ fontSize:22, fontWeight:800, color:'#C8A96E', lineHeight:1 }}>{d.getDate()}</div>
                  <div style={{ fontSize:11, color:'#888', fontFamily:'DM Mono, monospace', marginBottom:8 }}>{d.toLocaleDateString('en-GB',{month:'short',year:'numeric'})}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:'#F0EDE8' }}>{b.clientName}</div>
                  <div style={{ fontSize:11, color:'#666' }}>{room?.label} · {b.startTime}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      <div style={{ display:'flex', gap:8, marginBottom:24, flexWrap:'wrap' }}>
        {[['all','All'],['pending','Pending'],['confirmed','Confirmed'],['declined','Declined']].map(([val,label])=>(
          <button key={val} onClick={()=>setFilter(val)} style={{
            padding:'8px 18px', borderRadius:20, border:'1px solid',
            borderColor:filter===val?'#C8A96E':'#2a2a2a',
            background:filter===val?'rgba(200,169,110,0.1)':'transparent',
            color:filter===val?'#C8A96E':'#888',
            fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'DM Mono, monospace'
          }}>{label} <span style={{opacity:0.6}}>({counts[val]})</span></button>
        ))}
      </div>
      {filtered.length===0 ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:'#555', fontSize:14 }}>No {filter==='all'?'':filter} bookings yet</div>
      ) : (
        <div style={{ display:'grid', gap:12 }}>
          {filtered.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).map(b=>{
            const room=ROOMS.find(r=>r.id===b.room)
            const canAct=viewAs&&b.staffResponses?.[viewAs.id]==='pending'&&b.status==='pending'
            return (
              <div key={b.id} style={{ background:'#111', border:`1px solid ${b.status==='confirmed'?'rgba(76,175,80,0.3)':b.status==='declined'?'rgba(239,83,80,0.15)':'#1e1e1e'}`, borderRadius:12, padding:'20px 24px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10 }}>
                  <div style={{flex:1}}>
                    <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:6, flexWrap:'wrap' }}>
                      <span style={{ fontWeight:700, fontSize:16, color:'#F0EDE8' }}>{b.clientName}</span>
                      <Badge status={b.status} />
                      <span style={{ fontSize:11, color:'#555', fontFamily:'DM Mono, monospace' }}>#{b.id}</span>
                    </div>
                    <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                      {[room?.label,b.service,new Date(b.date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}),`${b.startTime} · ${b.hours}hr`,`£${(room?.rate*b.hours).toLocaleString()}`].map((item,i)=>(
                        <span key={i} style={{ fontSize:12, color:'#888' }}>{item}</span>
                      ))}
                    </div>
                    <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }}>
                      {Object.entries(b.staffResponses||{}).map(([sid,resp])=>{
                        const s=STAFF.find(x=>x.id===sid)
                        return <span key={sid} style={{ fontSize:11, color:resp==='accepted'?'#4CAF50':resp==='declined'?'#EF5350':'#555', fontFamily:'DM Mono, monospace' }}>{s?.name}: {resp}</span>
                      })}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    {canAct && <>
                      <button onClick={()=>onRespond(b.id,viewAs.id,'accepted')} style={{ padding:'8px 16px', borderRadius:8, border:'1px solid #4CAF50', background:'transparent', color:'#4CAF50', fontWeight:600, fontSize:12, cursor:'pointer' }}>✓ Accept</button>
                      <button onClick={()=>onRespond(b.id,viewAs.id,'declined')} style={{ padding:'8px 16px', borderRadius:8, border:'1px solid #EF5350', background:'transparent', color:'#EF5350', fontWeight:600, fontSize:12, cursor:'pointer' }}>✕ Decline</button>
                    </>}
                    {b.status==='confirmed' && <button onClick={()=>onCancel(b.id)} style={{ padding:'8px 16px', borderRadius:8, border:'1px solid #555', background:'transparent', color:'#888', fontWeight:600, fontSize:12, cursor:'pointer' }}>Cancel</button>}
                  </div>
                </div>
                {b.notes && <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid #1a1a1a', fontSize:12, color:'#666' }}>{b.notes}</div>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main App ──────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState('book')
  const [bookings, setBookings] = useState([])
  const [settings, setSettings] = useState({ notifyStaffOnNew:true, notifyClientOnReceive:true, notifyClientOnConfirm:true, notifyClientOnDecline:true })
  const [toast, setToast] = useState(null)
  const [viewAs, setViewAs] = useState(STAFF[0])
  const [successBooking, setSuccessBooking] = useState(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    Promise.all([loadBookings(), loadSettings()]).then(([b, s]) => {
      setBookings(b); setSettings(prev => ({ ...prev, ...s })); setLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (!loaded) return
    const params = new URLSearchParams(window.location.search)
    const action = params.get('action'), bookingId = params.get('booking')
    const staffId = params.get('staff'), token = params.get('token')
    if (action && bookingId && staffId && token) {
      loadBookings().then(bks => {
        const booking = bks.find(b => b.id === bookingId)
        if (!booking || booking.tokens?.[staffId] !== token) return
        if (booking.staffResponses[staffId] !== 'pending') return
        handleRespond(bookingId, staffId, action === 'accept' ? 'accepted' : 'declined', bks)
        setTab('invite')
        setViewAs(STAFF.find(s => s.id === staffId) || STAFF[0])
        window.history.replaceState({}, '', window.location.pathname)
      })
    }
  }, [loaded])

  async function handleNewBooking(booking) {
    const updated = [...bookings, booking]
    setBookings(updated); await saveBookings(updated)
    setSuccessBooking(booking)
    setToast({ message:'Booking request sent', type:'success' })
  }

  async function handleRespond(bookingId, staffId, response, bkList) {
    const source = bkList || bookings
    const updated = source.map(b => {
      if (b.id !== bookingId) return b
      const staffResponses = { ...b.staffResponses, [staffId]: response }
      const all = Object.keys(staffResponses)
      const status = all.every(id => staffResponses[id]==='accepted') ? 'confirmed'
        : all.some(id => staffResponses[id]==='declined') ? 'declined' : b.status
      return { ...b, staffResponses, status }
    })
    setBookings(updated); await saveBookings(updated)
    const final = updated.find(x => x.id === bookingId)
    const { resendApiKey: apiKey, fromEmail } = settings
    if (apiKey && fromEmail) {
      try {
        if (final?.status === 'confirmed' && settings.notifyClientOnConfirm) {
          await sendClientConfirmEmail({ apiKey, fromEmail, booking: final, rooms: ROOMS })
          setToast({ message:'Confirmed — client notified ✓', type:'success' })
        } else if (final?.status === 'declined' && settings.notifyClientOnDecline) {
          await sendClientDeclineEmail({ apiKey, fromEmail, booking: final, rooms: ROOMS })
          setToast({ message:'Declined — client notified', type:'info' })
        } else {
          setToast({ message:'Response recorded', type:'info' })
        }
      } catch { setToast({ message:'Response saved — email failed, check settings', type:'warning' }) }
    } else {
      setToast({ message: final?.status==='confirmed' ? 'Booking confirmed ✓' : 'Response recorded', type: final?.status==='confirmed' ? 'success' : 'info' })
    }
  }

  async function handleCancel(bookingId) {
    const updated = bookings.map(b => b.id===bookingId ? {...b, status:'cancelled'} : b)
    setBookings(updated); await saveBookings(updated)
    setToast({ message:'Booking cancelled', type:'info' })
  }

  async function handleSaveSettings(s) {
    setSettings(s); await saveSettings(s)
    setToast({ message:'Settings saved ✓', type:'success' })
  }

  if (!loaded) return (
    <div style={{ background:'#0D0D0D', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:'#555', fontSize:14 }}>Loading…</div>
    </div>
  )

  const hasEmail = !!(settings.resendApiKey && settings.fromEmail)
  const navItems = [
    { id:'book',      label:'Book a Session' },
    { id:'dashboard', label:'Dashboard'      },
    { id:'invite',    label:'Staff Invites'  },
    { id:'settings',  label: hasEmail ? '⚙ Settings' : '⚙ Setup Email' },
  ]

  return (
    <div style={{ background:'#0D0D0D', minHeight:'100vh', color:'#F0EDE8', fontFamily:'DM Sans, sans-serif' }}>
      <div style={{ borderBottom:'1px solid #1a1a1a', padding:'0 32px' }}>
        <div style={{ maxWidth:960, margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center', height:64 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:32, height:32, background:'#C8A96E', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:900, color:'#0D0D0D', letterSpacing:'-0.03em' }}>CH</div>
            <div>
              <div style={{ fontWeight:800, fontSize:15, letterSpacing:'-0.02em', lineHeight:1 }}>Coach House Music</div>
              <div style={{ fontSize:10, color:'#666', fontFamily:'DM Mono, monospace', letterSpacing:'0.06em' }}>STUDIO BOOKING SYSTEM</div>
            </div>
          </div>
          <nav style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
            {navItems.map(n => (
              <button key={n.id} onClick={()=>{setTab(n.id);setSuccessBooking(null)}} style={{
                padding:'8px 16px', borderRadius:8, border:'none',
                background:tab===n.id?'#1a1a1a':'transparent',
                color:tab===n.id?'#F0EDE8':n.id==='settings'&&!hasEmail?'#C8A96E':'#666',
                fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'DM Sans, sans-serif'
              }}>{n.label}</button>
            ))}
          </nav>
        </div>
      </div>

      {!hasEmail && tab!=='settings' && (
        <div style={{ background:'rgba(200,169,110,0.08)', borderBottom:'1px solid rgba(200,169,110,0.2)', padding:'10px 32px' }}>
          <div style={{ maxWidth:960, margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:13, color:'#C8A96E' }}>⚡ Email notifications not configured — bookings save locally only</span>
            <button onClick={()=>setTab('settings')} style={{ fontSize:12, color:'#C8A96E', background:'transparent', border:'1px solid rgba(200,169,110,0.4)', padding:'5px 14px', borderRadius:6, cursor:'pointer', fontWeight:600 }}>Set up Resend →</button>
          </div>
        </div>
      )}

      <div style={{ maxWidth:960, margin:'0 auto', padding:'40px 32px' }}>
        {tab==='book' && (
          successBooking ? (
            <div style={{ maxWidth:480, margin:'0 auto', textAlign:'center' }}>
              <div style={{ fontSize:48, marginBottom:16 }}>✓</div>
              <div style={{ fontWeight:800, fontSize:24, marginBottom:8 }}>Request Sent</div>
              <div style={{ color:'#888', fontSize:14, marginBottom:24, lineHeight:1.6 }}>
                Booking #{successBooking.id} sent to the team.{hasEmail?' Emails sent to staff and client.':' Add Resend in Settings to enable emails.'}
              </div>
              <div style={{ background:'#111', border:'1px solid #222', borderRadius:12, padding:20, marginBottom:24, textAlign:'left' }}>
                {[['Room',ROOMS.find(r=>r.id===successBooking.room)?.label],['Date',new Date(successBooking.date).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})],['Time',`${successBooking.startTime} · ${successBooking.hours}hr`],['Service',successBooking.service]].map(([k,v])=>(
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'6px 0', borderBottom:'1px solid #1a1a1a' }}>
                    <span style={{color:'#666'}}>{k}</span><span style={{color:'#F0EDE8',fontWeight:600}}>{v}</span>
                  </div>
                ))}
              </div>
              <button onClick={()=>setSuccessBooking(null)} style={{ padding:'12px 28px', borderRadius:10, border:'1px solid #2a2a2a', background:'transparent', color:'#888', fontWeight:600, fontSize:14, cursor:'pointer' }}>Make another booking</button>
            </div>
          ) : (
            <>
              <h1 style={{ fontSize:28, fontWeight:800, margin:'0 0 36px', letterSpacing:'-0.03em' }}>Book a Session</h1>
              <BookingForm onSubmit={handleNewBooking} settings={settings} />
            </>
          )
        )}

        {tab==='dashboard' && (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:28, flexWrap:'wrap', gap:12 }}>
              <h1 style={{ fontSize:28, fontWeight:800, margin:0, letterSpacing:'-0.03em' }}>Booking Dashboard</h1>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:11, color:'#666', fontFamily:'DM Mono, monospace', letterSpacing:'0.06em' }}>VIEW AS</span>
                <div style={{ display:'flex', gap:6 }}>
                  {STAFF.map(s=>(
                    <button key={s.id} onClick={()=>setViewAs(s)} style={{
                      padding:'6px 14px', borderRadius:20, border:'1px solid',
                      borderColor:viewAs?.id===s.id?'#C8A96E':'#2a2a2a',
                      background:viewAs?.id===s.id?'rgba(200,169,110,0.1)':'transparent',
                      color:viewAs?.id===s.id?'#C8A96E':'#666',
                      fontWeight:600, fontSize:12, cursor:'pointer'
                    }}>{s.name}</button>
                  ))}
                </div>
              </div>
            </div>
            <Dashboard bookings={bookings} onRespond={handleRespond} onCancel={handleCancel} viewAs={viewAs} />
          </>
        )}

        {tab==='invite' && (
          <>
            <div style={{ marginBottom:32 }}>
              <h1 style={{ fontSize:28, fontWeight:800, margin:'0 0 4px', letterSpacing:'-0.03em' }}>Staff Invites</h1>
              <p style={{ color:'#888', fontSize:14, margin:0 }}>Accept or decline booking requests. Staff also receive these via email.</p>
            </div>
            <div style={{ display:'flex', gap:8, marginBottom:28, flexWrap:'wrap' }}>
              {STAFF.map(s=>{
                const pending=bookings.filter(b=>b.staffResponses?.[s.id]==='pending'&&b.status==='pending').length
                return (
                  <button key={s.id} onClick={()=>setViewAs(s)} style={{
                    padding:'10px 20px', borderRadius:10, border:'1px solid',
                    borderColor:viewAs?.id===s.id?'#C8A96E':'#2a2a2a',
                    background:viewAs?.id===s.id?'rgba(200,169,110,0.08)':'#111',
                    color:viewAs?.id===s.id?'#C8A96E':'#888',
                    fontWeight:700, fontSize:13, cursor:'pointer', position:'relative'
                  }}>
                    {s.name}
                    {pending>0&&<span style={{ position:'absolute', top:-6, right:-6, width:18, height:18, background:'#EF5350', borderRadius:'50%', fontSize:10, fontWeight:800, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>{pending}</span>}
                    <span style={{ display:'block', fontSize:10, fontWeight:400, color:viewAs?.id===s.id?'#9A7940':'#555', fontFamily:'DM Mono, monospace', marginTop:2 }}>{s.role}</span>
                  </button>
                )
              })}
            </div>
            {(()=>{
              const invites=bookings.filter(b=>Object.prototype.hasOwnProperty.call(b.staffResponses||{},viewAs.id)&&b.status!=='cancelled')
              if(!invites.length) return <div style={{ textAlign:'center', padding:'60px 0', color:'#555', fontSize:14 }}>No invites for {viewAs.name} yet</div>
              return <div style={{ display:'grid', gap:20 }}>{invites.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).map(b=><StaffInviteView key={b.id} booking={b} onRespond={handleRespond} currentStaff={viewAs} />)}</div>
            })()}
          </>
        )}

        {tab==='settings' && <SettingsPanel settings={settings} onSave={handleSaveSettings} />}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onDone={()=>setToast(null)} />}
    </div>
  )
}
