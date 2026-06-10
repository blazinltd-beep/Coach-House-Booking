import { useState, useEffect } from 'react'
import { STAFF, ROOMS, SERVICES, genId, genToken } from './data.js'
import { loadBookings, createBooking, updateBooking } from './storage.js'

// Staff PIN — change this to whatever you want
const STAFF_PIN = '1985'
const PIN_KEY = 'chms_staff_auth'

// Valid email action tokens bypass the PIN gate
function hasActionToken() {
  const p = new URLSearchParams(window.location.search)
  return !!(p.get('action') && p.get('booking') && p.get('staff') && p.get('token'))
}

async function sendEmailEvent(type, booking) {
  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, booking }),
    })
    return res.ok
  } catch { return false }
}

// ─── UI Primitives ─────────────────────────────────────────────────────────
function Toast({ message, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 4000); return () => clearTimeout(t) }, [])
  const s = { success:{bg:'#C8F5C8',color:'#0A3D0A',border:'1px solid #7CCC7C'}, error:{bg:'#FFD0D0',color:'#5C0000',border:'1px solid #FF8A8A'}, warning:{bg:'#FFF3CD',color:'#7A5200',border:'1px solid #FFC107'}, info:{bg:'#1a1a1a',color:'#fff',border:'none'} }[type] || {bg:'#1a1a1a',color:'#fff',border:'none'}
  return <div style={{position:'fixed',bottom:28,left:'50%',transform:'translateX(-50%)',background:s.bg,color:s.color,border:s.border,padding:'12px 24px',borderRadius:8,fontSize:14,fontWeight:500,zIndex:9999,boxShadow:'0 4px 24px rgba(0,0,0,0.18)',whiteSpace:'nowrap',maxWidth:'90vw'}}>{message}</div>
}

function Badge({ status }) {
  const m = {pending:{bg:'#FFF3CD',color:'#7A5200',label:'Pending'},confirmed:{bg:'#C8F5C8',color:'#0A3D0A',label:'Confirmed'},declined:{bg:'#FFE0E0',color:'#7A0000',label:'Declined'},cancelled:{bg:'#E8E8E8',color:'#555',label:'Cancelled'}}[status]||{bg:'#FFF3CD',color:'#7A5200',label:'Pending'}
  return <span style={{background:m.bg,color:m.color,padding:'3px 10px',borderRadius:20,fontSize:12,fontWeight:600,letterSpacing:'0.04em',textTransform:'uppercase',fontFamily:'DM Mono, monospace'}}>{m.label}</span>
}

const INP = {width:'100%',padding:'10px 14px',borderRadius:8,border:'1px solid #2a2a2a',background:'#111',color:'#F0EDE8',fontSize:14,outline:'none',boxSizing:'border-box'}
const LBL = {display:'block',fontSize:11,fontWeight:600,color:'#888',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:6,fontFamily:'DM Mono, monospace'}

// ─── PIN Gate ──────────────────────────────────────────────────────────────
function PinGate({ onUnlock }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)

  function handleKey(digit) {
    if (pin.length >= 4) return
    const next = pin + digit
    setPin(next)
    if (next.length === 4) {
      if (next === STAFF_PIN) {
        sessionStorage.setItem(PIN_KEY, '1')
        onUnlock()
      } else {
        setShake(true)
        setError(true)
        setTimeout(() => { setPin(''); setShake(false); setError(false) }, 800)
      }
    }
  }

  function handleDelete() { setPin(p => p.slice(0,-1)); setError(false) }

  return (
    <div style={{minHeight:'100vh',background:'#0D0D0D',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'DM Sans, sans-serif'}}>
      <div style={{textAlign:'center',padding:40}}>
        <div style={{width:40,height:40,background:'#C8A96E',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:900,color:'#0D0D0D',margin:'0 auto 24px'}}>CH</div>
        <div style={{fontWeight:800,fontSize:22,color:'#F0EDE8',marginBottom:4}}>Staff Portal</div>
        <div style={{fontSize:13,color:'#666',marginBottom:36,fontFamily:'DM Mono, monospace',letterSpacing:'0.04em'}}>COACH HOUSE MUSIC STUDIOS</div>

        {/* PIN dots */}
        <div style={{display:'flex',gap:14,justifyContent:'center',marginBottom:36,animation:shake?'shake 0.4s ease':'none'}}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{width:16,height:16,borderRadius:'50%',background:pin.length>i?(error?'#EF5350':'#C8A96E'):'#2a2a2a',transition:'background 0.15s',border:`2px solid ${pin.length>i?(error?'#EF5350':'#C8A96E'):'#3a3a3a'}`}} />
          ))}
        </div>

        {/* Keypad */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,72px)',gap:12,justifyContent:'center'}}>
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k,i) => (
            <button key={i} onClick={() => k==='⌫' ? handleDelete() : k ? handleKey(k) : null}
              disabled={!k}
              style={{width:72,height:72,borderRadius:12,border:'1px solid #2a2a2a',background:k?'#111':'transparent',color:k==='⌫'?'#888':'#F0EDE8',fontSize:k==='⌫'?20:22,fontWeight:600,cursor:k?'pointer':'default',fontFamily:'DM Sans, sans-serif',transition:'all 0.1s',opacity:k?1:0}}>
              {k}
            </button>
          ))}
        </div>

        {error && <div style={{marginTop:20,fontSize:13,color:'#EF5350',fontFamily:'DM Mono, monospace'}}>Incorrect PIN</div>}
      </div>
      <style>{`@keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-8px)} 40%,80%{transform:translateX(8px)} }`}</style>
    </div>
  )
}

// ─── Booking Form (Public) ─────────────────────────────────────────────────
function BookingForm({ onSubmit }) {
  const [form, setForm] = useState({clientName:'',clientEmail:'',clientPhone:'',room:'a',service:'Recording Session',date:'',startTime:'10:00',hours:4,notes:'',staffNeeded:['blaze']})
  const [submitting, setSubmitting] = useState(false)
  const room = ROOMS.find(r => r.id === form.room)
  const total = room ? room.rate * form.hours : 0

  function toggleStaff(id) {
    setForm(f => ({...f, staffNeeded: f.staffNeeded.includes(id) ? f.staffNeeded.filter(s=>s!==id) : [...f.staffNeeded,id]}))
  }

  async function handleSubmit() {
    if (!form.clientName||!form.clientEmail||!form.date) return
    setSubmitting(true)
    const tokens = form.staffNeeded.reduce((acc,id)=>({...acc,[id]:genToken()}),{})
    const booking = {...form,id:genId(),status:'pending',createdAt:new Date().toISOString(),staffResponses:form.staffNeeded.reduce((acc,id)=>({...acc,[id]:'pending'}),{}),tokens}
    await onSubmit(booking)
    setSubmitting(false)
  }

  return (
    <div style={{maxWidth:640,margin:'0 auto'}}>
      <p style={{color:'#888',fontSize:14,margin:'0 0 28px'}}>Fill in your details and the team will be notified. You'll receive confirmation once accepted.</p>
      <div style={{display:'grid',gap:20}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div><span style={LBL}>Your Name *</span><input style={INP} value={form.clientName} onChange={e=>setForm(f=>({...f,clientName:e.target.value}))} placeholder="Full name" /></div>
          <div><span style={LBL}>Phone</span><input style={INP} value={form.clientPhone} onChange={e=>setForm(f=>({...f,clientPhone:e.target.value}))} placeholder="+44..." /></div>
        </div>
        <div><span style={LBL}>Email *</span><input style={INP} type="email" value={form.clientEmail} onChange={e=>setForm(f=>({...f,clientEmail:e.target.value}))} placeholder="your@email.com" /></div>
        <div>
          <span style={LBL}>Studio Room *</span>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
            {ROOMS.map(r=>(
              <div key={r.id} onClick={()=>setForm(f=>({...f,room:r.id}))} style={{padding:'14px 12px',borderRadius:10,cursor:'pointer',border:form.room===r.id?'1.5px solid #C8A96E':'1px solid #2a2a2a',background:form.room===r.id?'rgba(200,169,110,0.08)':'#111',transition:'all 0.15s'}}>
                <div style={{fontWeight:700,fontSize:13,color:form.room===r.id?'#C8A96E':'#F0EDE8'}}>{r.label}</div>
                <div style={{fontSize:11,color:'#666',marginTop:4,lineHeight:1.4}}>{r.desc}</div>
                <div style={{fontSize:13,color:'#C8A96E',marginTop:8,fontWeight:600,fontFamily:'DM Mono, monospace'}}>£{r.rate}/hr</div>
              </div>
            ))}
          </div>
        </div>
        <div><span style={LBL}>Service *</span><select style={{...INP,appearance:'none'}} value={form.service} onChange={e=>setForm(f=>({...f,service:e.target.value}))}>{SERVICES.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16}}>
          <div><span style={LBL}>Date *</span><input style={INP} type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} min={new Date().toISOString().split('T')[0]} /></div>
          <div><span style={LBL}>Start Time</span><input style={INP} type="time" value={form.startTime} onChange={e=>setForm(f=>({...f,startTime:e.target.value}))} /></div>
          <div><span style={LBL}>Duration</span><select style={{...INP,appearance:'none'}} value={form.hours} onChange={e=>setForm(f=>({...f,hours:Number(e.target.value)}))}>{[1,2,3,4,5,6,7,8,10,12].map(h=><option key={h} value={h}>{h}hr{h>1?'s':''}</option>)}</select></div>
        </div>
        <div>
          <span style={LBL}>Request Staff</span>
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            {STAFF.map(s=>(
              <div key={s.id} onClick={()=>toggleStaff(s.id)} style={{padding:'10px 16px',borderRadius:8,cursor:'pointer',border:form.staffNeeded.includes(s.id)?'1.5px solid #C8A96E':'1px solid #2a2a2a',background:form.staffNeeded.includes(s.id)?'rgba(200,169,110,0.08)':'#111',transition:'all 0.15s'}}>
                <div style={{fontSize:13,fontWeight:600,color:form.staffNeeded.includes(s.id)?'#C8A96E':'#F0EDE8'}}>{s.name}</div>
                <div style={{fontSize:11,color:'#666'}}>{s.role}</div>
              </div>
            ))}
          </div>
        </div>
        <div><span style={LBL}>Project Notes</span><textarea style={{...INP,height:80,resize:'vertical'}} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Artist name, genre, what you're working on..." /></div>
        <div style={{borderTop:'1px solid #1e1e1e',paddingTop:20,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:16}}>
          <div>
            <div style={{fontSize:11,color:'#888',fontFamily:'DM Mono, monospace',letterSpacing:'0.06em',textTransform:'uppercase'}}>Estimated Total</div>
            <div style={{fontSize:28,fontWeight:700,color:'#C8A96E',marginTop:2}}>£{total.toLocaleString()}</div>
            <div style={{fontSize:11,color:'#666'}}>{form.hours}hr × £{room?.rate}/hr · subject to confirmation</div>
          </div>
          <button onClick={handleSubmit} disabled={submitting||!form.clientName||!form.clientEmail||!form.date} style={{padding:'14px 32px',borderRadius:10,border:'none',cursor:'pointer',background:(!form.clientName||!form.clientEmail||!form.date)?'#2a2a2a':'#C8A96E',color:(!form.clientName||!form.clientEmail||!form.date)?'#555':'#0D0D0D',fontWeight:700,fontSize:15,transition:'all 0.15s'}}>{submitting?'Sending…':'Send Booking Request →'}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Staff Invite Card ─────────────────────────────────────────────────────
function StaffInviteView({ booking, onRespond, currentStaff }) {
  const room = ROOMS.find(r=>r.id===booking.room)
  const myResp = booking.staffResponses[currentStaff.id]
  const total = room ? room.rate * booking.hours : 0
  const dateStr = new Date(booking.date).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
  return (
    <div style={{background:'#111',border:'1px solid #222',borderRadius:14,padding:28,maxWidth:540,margin:'0 auto'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
        <div>
          <div style={{fontSize:11,color:'#888',fontFamily:'DM Mono, monospace',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:4}}>Request · #{booking.id}</div>
          <div style={{fontSize:22,fontWeight:700,color:'#F0EDE8'}}>{booking.clientName}</div>
          <div style={{fontSize:13,color:'#888'}}>{booking.clientEmail}{booking.clientPhone?` · ${booking.clientPhone}`:''}</div>
        </div>
        <Badge status={booking.status} />
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:20}}>
        {[['Room',room?.label],['Service',booking.service],['Date',dateStr],['Time',`${booking.startTime} · ${booking.hours}hr`],['Fee',`£${total.toLocaleString()}`],['Received',new Date(booking.createdAt).toLocaleDateString('en-GB')]].map(([k,v])=>(
          <div key={k} style={{background:'#0D0D0D',borderRadius:8,padding:'10px 14px'}}>
            <div style={{fontSize:10,color:'#666',fontFamily:'DM Mono, monospace',textTransform:'uppercase',marginBottom:3}}>{k}</div>
            <div style={{fontSize:13,color:'#F0EDE8',fontWeight:600}}>{v}</div>
          </div>
        ))}
      </div>
      {booking.notes&&<div style={{background:'#0D0D0D',borderRadius:8,padding:'12px 14px',marginBottom:20}}><div style={{fontSize:10,color:'#666',fontFamily:'DM Mono, monospace',textTransform:'uppercase',marginBottom:4}}>Notes</div><div style={{fontSize:13,color:'#ccc',lineHeight:1.5}}>{booking.notes}</div></div>}
      <div style={{marginBottom:20}}>
        <div style={{fontSize:10,color:'#666',fontFamily:'DM Mono, monospace',textTransform:'uppercase',marginBottom:10}}>Team Responses</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {Object.entries(booking.staffResponses).map(([sid,resp])=>{const s=STAFF.find(x=>x.id===sid);return <span key={sid} style={{fontSize:11,color:resp==='accepted'?'#4CAF50':resp==='declined'?'#EF5350':'#555',fontFamily:'DM Mono, monospace',background:'#0D0D0D',padding:'4px 10px',borderRadius:20}}>{s?.name}: {resp}</span>;})}
        </div>
      </div>
      {myResp==='pending'&&booking.status==='pending'?(
        <div style={{display:'flex',gap:12}}>
          <button onClick={()=>onRespond(booking.id,currentStaff.id,'accepted')} style={{flex:1,padding:'14px 0',borderRadius:10,border:'1.5px solid #4CAF50',background:'rgba(76,175,80,0.08)',color:'#4CAF50',fontWeight:700,fontSize:15,cursor:'pointer'}}>✓ Accept Booking</button>
          <button onClick={()=>onRespond(booking.id,currentStaff.id,'declined')} style={{flex:1,padding:'14px 0',borderRadius:10,border:'1.5px solid #EF5350',background:'rgba(239,83,80,0.08)',color:'#EF5350',fontWeight:700,fontSize:15,cursor:'pointer'}}>✕ Decline</button>
        </div>
      ):(
        <div style={{textAlign:'center',padding:16,background:'#0D0D0D',borderRadius:10,fontSize:13,color:'#888'}}>{myResp==='accepted'?'✓ You accepted':myResp==='declined'?'✕ You declined':`Booking is ${booking.status}`}</div>
      )}
    </div>
  )
}

// ─── Dashboard ─────────────────────────────────────────────────────────────
function Dashboard({ bookings, onRespond, onCancel, viewAs }) {
  const [filter, setFilter] = useState('all')
  const filtered = bookings.filter(b=>filter==='all'||b.status===filter)
  const counts = {all:bookings.length,pending:bookings.filter(b=>b.status==='pending').length,confirmed:bookings.filter(b=>b.status==='confirmed').length,declined:bookings.filter(b=>b.status==='declined').length}
  const upcoming = bookings.filter(b=>b.status==='confirmed'&&new Date(b.date)>=new Date()).sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(0,5)
  return (
    <div>
      {upcoming.length>0&&(
        <div style={{marginBottom:32}}>
          <div style={{fontSize:11,color:'#666',fontFamily:'DM Mono, monospace',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:12}}>Upcoming Sessions</div>
          <div style={{display:'flex',gap:10,overflowX:'auto',paddingBottom:4}}>
            {upcoming.map(b=>{const room=ROOMS.find(r=>r.id===b.room);const d=new Date(b.date);return(<div key={b.id} style={{minWidth:140,background:'#111',border:'1px solid rgba(200,169,110,0.25)',borderRadius:10,padding:'14px 16px',flexShrink:0}}><div style={{fontSize:22,fontWeight:800,color:'#C8A96E',lineHeight:1}}>{d.getDate()}</div><div style={{fontSize:11,color:'#888',fontFamily:'DM Mono, monospace',marginBottom:8}}>{d.toLocaleDateString('en-GB',{month:'short',year:'numeric'})}</div><div style={{fontSize:13,fontWeight:600,color:'#F0EDE8'}}>{b.clientName}</div><div style={{fontSize:11,color:'#666'}}>{room?.label} · {b.startTime}</div></div>);})}
          </div>
        </div>
      )}
      <div style={{display:'flex',gap:8,marginBottom:24,flexWrap:'wrap'}}>
        {[['all','All'],['pending','Pending'],['confirmed','Confirmed'],['declined','Declined']].map(([val,label])=>(
          <button key={val} onClick={()=>setFilter(val)} style={{padding:'8px 18px',borderRadius:20,border:'1px solid',borderColor:filter===val?'#C8A96E':'#2a2a2a',background:filter===val?'rgba(200,169,110,0.1)':'transparent',color:filter===val?'#C8A96E':'#888',fontWeight:600,fontSize:13,cursor:'pointer',fontFamily:'DM Mono, monospace'}}>{label} <span style={{opacity:0.6}}>({counts[val]})</span></button>
        ))}
      </div>
      {filtered.length===0?<div style={{textAlign:'center',padding:'60px 0',color:'#555',fontSize:14}}>No {filter==='all'?'':filter} bookings yet</div>:(
        <div style={{display:'grid',gap:12}}>
          {filtered.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).map(b=>{
            const room=ROOMS.find(r=>r.id===b.room)
            const canAct=viewAs&&b.staffResponses?.[viewAs.id]==='pending'&&b.status==='pending'
            return(
              <div key={b.id} style={{background:'#111',border:`1px solid ${b.status==='confirmed'?'rgba(76,175,80,0.3)':b.status==='declined'?'rgba(239,83,80,0.15)':'#1e1e1e'}`,borderRadius:12,padding:'20px 24px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:10}}>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:6,flexWrap:'wrap'}}>
                      <span style={{fontWeight:700,fontSize:16,color:'#F0EDE8'}}>{b.clientName}</span>
                      <Badge status={b.status} />
                      <span style={{fontSize:11,color:'#555',fontFamily:'DM Mono, monospace'}}>#{b.id}</span>
                    </div>
                    <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
                      {[room?.label,b.service,new Date(b.date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}),`${b.startTime} · ${b.hours}hr`,`£${(room?.rate*b.hours).toLocaleString()}`].map((item,i)=><span key={i} style={{fontSize:12,color:'#888'}}>{item}</span>)}
                    </div>
                    <div style={{display:'flex',gap:6,marginTop:10,flexWrap:'wrap'}}>
                      {Object.entries(b.staffResponses||{}).map(([sid,resp])=>{const s=STAFF.find(x=>x.id===sid);return <span key={sid} style={{fontSize:11,color:resp==='accepted'?'#4CAF50':resp==='declined'?'#EF5350':'#555',fontFamily:'DM Mono, monospace'}}>{s?.name}: {resp}</span>;})}
                    </div>
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    {canAct&&<><button onClick={()=>onRespond(b.id,viewAs.id,'accepted')} style={{padding:'8px 16px',borderRadius:8,border:'1px solid #4CAF50',background:'transparent',color:'#4CAF50',fontWeight:600,fontSize:12,cursor:'pointer'}}>✓ Accept</button><button onClick={()=>onRespond(b.id,viewAs.id,'declined')} style={{padding:'8px 16px',borderRadius:8,border:'1px solid #EF5350',background:'transparent',color:'#EF5350',fontWeight:600,fontSize:12,cursor:'pointer'}}>✕ Decline</button></>}
                    {b.status==='confirmed'&&<button onClick={()=>onCancel(b.id)} style={{padding:'8px 16px',borderRadius:8,border:'1px solid #555',background:'transparent',color:'#888',fontWeight:600,fontSize:12,cursor:'pointer'}}>Cancel</button>}
                  </div>
                </div>
                {b.notes&&<div style={{marginTop:10,paddingTop:10,borderTop:'1px solid #1a1a1a',fontSize:12,color:'#666'}}>{b.notes}</div>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Staff Portal ──────────────────────────────────────────────────────────
function StaffPortal({ bookings, onRespond, onCancel }) {
  const [tab, setTab] = useState('invites')
  const [viewAs, setViewAs] = useState(STAFF[0])

  const pendingTotal = bookings.filter(b=>b.status==='pending').length

  return (
    <div style={{background:'#0D0D0D',minHeight:'100vh',color:'#F0EDE8',fontFamily:'DM Sans, sans-serif'}}>
      <div style={{borderBottom:'1px solid #1a1a1a',padding:'0 20px'}}>
        <div style={{maxWidth:960,margin:'0 auto',display:'flex',justifyContent:'space-between',alignItems:'center',height:64,flexWrap:'wrap',gap:8}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:32,height:32,background:'#C8A96E',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:900,color:'#0D0D0D',flexShrink:0}}>CH</div>
            <div>
              <div style={{fontWeight:800,fontSize:15,letterSpacing:'-0.02em',lineHeight:1}}>Coach House Music</div>
              <div style={{fontSize:10,color:'#C8A96E',fontFamily:'DM Mono, monospace',letterSpacing:'0.06em'}}>STAFF PORTAL</div>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <nav style={{display:'flex',gap:2}}>
              {[['invites','Invites'],['dashboard','Dashboard']].map(([id,label])=>(
                <button key={id} onClick={()=>setTab(id)} style={{padding:'8px 14px',borderRadius:8,border:'none',background:tab===id?'#1a1a1a':'transparent',color:tab===id?'#F0EDE8':'#666',fontWeight:600,fontSize:13,cursor:'pointer',position:'relative'}}>
                  {label}
                  {id==='invites'&&pendingTotal>0&&<span style={{position:'absolute',top:2,right:2,width:16,height:16,background:'#EF5350',borderRadius:'50%',fontSize:9,fontWeight:800,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}}>{pendingTotal}</span>}
                </button>
              ))}
            </nav>
            <button onClick={()=>{sessionStorage.removeItem(PIN_KEY);window.location.reload()}} style={{padding:'6px 12px',borderRadius:8,border:'1px solid #2a2a2a',background:'transparent',color:'#555',fontSize:11,cursor:'pointer',fontFamily:'DM Mono, monospace'}}>Lock</button>
          </div>
        </div>
      </div>

      <div style={{maxWidth:960,margin:'0 auto',padding:'40px 20px'}}>
        {tab==='invites'&&(
          <>
            <div style={{marginBottom:32}}>
              <h1 style={{fontSize:28,fontWeight:800,margin:'0 0 4px',letterSpacing:'-0.03em'}}>Booking Invites</h1>
              <p style={{color:'#888',fontSize:14,margin:0}}>Accept or decline requests. Staff also receive one-click email links.</p>
            </div>
            <div style={{display:'flex',gap:8,marginBottom:28,flexWrap:'wrap'}}>
              {STAFF.map(s=>{
                const pending=bookings.filter(b=>b.staffResponses?.[s.id]==='pending'&&b.status==='pending').length
                return(
                  <button key={s.id} onClick={()=>setViewAs(s)} style={{padding:'10px 20px',borderRadius:10,border:'1px solid',borderColor:viewAs?.id===s.id?'#C8A96E':'#2a2a2a',background:viewAs?.id===s.id?'rgba(200,169,110,0.08)':'#111',color:viewAs?.id===s.id?'#C8A96E':'#888',fontWeight:700,fontSize:13,cursor:'pointer',position:'relative'}}>
                    {s.name}
                    {pending>0&&<span style={{position:'absolute',top:-6,right:-6,width:18,height:18,background:'#EF5350',borderRadius:'50%',fontSize:10,fontWeight:800,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}}>{pending}</span>}
                    <span style={{display:'block',fontSize:10,fontWeight:400,color:viewAs?.id===s.id?'#9A7940':'#555',fontFamily:'DM Mono, monospace',marginTop:2}}>{s.role}</span>
                  </button>
                )
              })}
            </div>
            {(()=>{
              const invites=bookings.filter(b=>Object.prototype.hasOwnProperty.call(b.staffResponses||{},viewAs.id)&&b.status!=='cancelled')
              if(!invites.length) return <div style={{textAlign:'center',padding:'60px 0',color:'#555',fontSize:14}}>No invites for {viewAs.name} yet</div>
              return <div style={{display:'grid',gap:20}}>{invites.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).map(b=><StaffInviteView key={b.id} booking={b} onRespond={onRespond} currentStaff={viewAs} />)}</div>
            })()}
          </>
        )}

        {tab==='dashboard'&&(
          <>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:28,flexWrap:'wrap',gap:12}}>
              <h1 style={{fontSize:28,fontWeight:800,margin:0,letterSpacing:'-0.03em'}}>All Bookings</h1>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:11,color:'#666',fontFamily:'DM Mono, monospace',letterSpacing:'0.06em'}}>VIEW AS</span>
                <div style={{display:'flex',gap:6}}>
                  {STAFF.map(s=><button key={s.id} onClick={()=>setViewAs(s)} style={{padding:'6px 14px',borderRadius:20,border:'1px solid',borderColor:viewAs?.id===s.id?'#C8A96E':'#2a2a2a',background:viewAs?.id===s.id?'rgba(200,169,110,0.1)':'transparent',color:viewAs?.id===s.id?'#C8A96E':'#666',fontWeight:600,fontSize:12,cursor:'pointer'}}>{s.name}</button>)}
                </div>
              </div>
            </div>
            <Dashboard bookings={bookings} onRespond={onRespond} onCancel={onCancel} viewAs={viewAs} />
          </>
        )}
      </div>
    </div>
  )
}

// ─── Public Booking Page ───────────────────────────────────────────────────
function PublicPage({ onSubmit, successBooking, onReset }) {
  return (
    <div style={{background:'#0D0D0D',minHeight:'100vh',color:'#F0EDE8',fontFamily:'DM Sans, sans-serif'}}>
      <div style={{borderBottom:'1px solid #1a1a1a',padding:'0 20px'}}>
        <div style={{maxWidth:960,margin:'0 auto',display:'flex',justifyContent:'space-between',alignItems:'center',height:64}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:32,height:32,background:'#C8A96E',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:900,color:'#0D0D0D',flexShrink:0}}>CH</div>
            <div>
              <div style={{fontWeight:800,fontSize:15,letterSpacing:'-0.02em',lineHeight:1}}>Coach House Music</div>
              <div style={{fontSize:10,color:'#666',fontFamily:'DM Mono, monospace',letterSpacing:'0.06em'}}>STUDIO BOOKING · LONDON</div>
            </div>
          </div>
        </div>
      </div>
      <div style={{maxWidth:960,margin:'0 auto',padding:'40px 20px'}}>
        {successBooking ? (
          <div style={{maxWidth:480,margin:'0 auto',textAlign:'center'}}>
            <div style={{fontSize:48,marginBottom:16}}>✓</div>
            <div style={{fontWeight:800,fontSize:24,marginBottom:8}}>Request Sent</div>
            <div style={{color:'#888',fontSize:14,marginBottom:24,lineHeight:1.6}}>Booking #{successBooking.id} has been sent to the team. You'll receive a confirmation email once accepted.</div>
            <div style={{background:'#111',border:'1px solid #222',borderRadius:12,padding:20,marginBottom:24,textAlign:'left'}}>
              {[['Room',ROOMS.find(r=>r.id===successBooking.room)?.label],['Date',new Date(successBooking.date).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})],['Time',`${successBooking.startTime} · ${successBooking.hours}hr`],['Service',successBooking.service]].map(([k,v])=>(
                <div key={k} style={{display:'flex',justifyContent:'space-between',fontSize:13,padding:'6px 0',borderBottom:'1px solid #1a1a1a'}}><span style={{color:'#666'}}>{k}</span><span style={{color:'#F0EDE8',fontWeight:600}}>{v}</span></div>
              ))}
            </div>
            <button onClick={onReset} style={{padding:'12px 28px',borderRadius:10,border:'1px solid #2a2a2a',background:'transparent',color:'#888',fontWeight:600,fontSize:14,cursor:'pointer'}}>Make another booking</button>
          </div>
        ) : (
          <>
            <h1 style={{fontSize:28,fontWeight:800,margin:'0 0 36px',letterSpacing:'-0.03em'}}>Book a Session</h1>
            <BookingForm onSubmit={onSubmit} />
          </>
        )}
      </div>
    </div>
  )
}

// ─── Root Router ───────────────────────────────────────────────────────────
export default function App() {
  const isStaff = window.location.pathname.startsWith('/staff')
  const [bookings, setBookings] = useState([])
  const [toast, setToast] = useState(null)
  const [successBooking, setSuccessBooking] = useState(null)
  const [pinVerified, setPinVerified] = useState(!!sessionStorage.getItem(PIN_KEY))

  useEffect(() => {
    // Load bookings from Supabase
    loadBookings().then(bks => {
      setBookings(bks)
      // Handle email action tokens after bookings are loaded
      const params = new URLSearchParams(window.location.search)
      const action=params.get('action'),bookingId=params.get('booking'),staffId=params.get('staff'),token=params.get('token')
      if (action&&bookingId&&staffId&&token) {
        const booking = bks.find(b=>b.id===bookingId)
        if (booking&&booking.tokens?.[staffId]===token&&booking.staffResponses[staffId]==='pending') {
          const response = action==='accept'?'accepted':'declined'
          const staffResponses={...booking.staffResponses,[staffId]:response}
          const all=Object.keys(staffResponses)
          const status=all.every(id=>staffResponses[id]==='accepted')?'confirmed':all.some(id=>staffResponses[id]==='declined')?'declined':booking.status
          updateBooking(bookingId, staffResponses, status).then(updated => {
            setBookings(prev=>prev.map(b=>b.id===bookingId?updated:b))
            window.history.replaceState({},'','/staff')
            if(status==='confirmed') sendEmailEvent('confirmed',updated).then(ok=>setToast({message:ok?'Confirmed — client notified ✓':'Confirmed (email failed)',type:ok?'success':'warning'}))
            else if(status==='declined') sendEmailEvent('declined',updated).then(()=>setToast({message:'Booking declined',type:'info'}))
          })
        }
      }
    })
  }, [])

  async function handleNewBooking(booking) {
    try {
      const saved = await createBooking(booking)
      setBookings(prev => [saved, ...prev])
      setSuccessBooking(saved)
      const ok = await sendEmailEvent('new_booking', saved)
      setToast({message:ok?'Booking sent — team notified ✓':'Booking saved (email failed)',type:ok?'success':'warning'})
    } catch(e) {
      setToast({message:'Failed to save booking — try again',type:'error'})
    }
  }

  async function handleRespond(bookingId, staffId, response) {
    const booking = bookings.find(b=>b.id===bookingId)
    if (!booking) return
    const staffResponses = {...booking.staffResponses,[staffId]:response}
    const all = Object.keys(staffResponses)
    const status = all.every(id=>staffResponses[id]==='accepted')?'confirmed':all.some(id=>staffResponses[id]==='declined')?'declined':booking.status
    try {
      const updated = await updateBooking(bookingId, staffResponses, status)
      setBookings(prev => prev.map(b=>b.id===bookingId?updated:b))
      if(status==='confirmed') sendEmailEvent('confirmed',updated).then(ok=>setToast({message:ok?'Confirmed — client notified ✓':'Confirmed (email failed)',type:ok?'success':'warning'}))
      else if(status==='declined') sendEmailEvent('declined',updated).then(()=>setToast({message:'Booking declined',type:'info'}))
      else setToast({message:'Response recorded',type:'info'})
    } catch(e) {
      setToast({message:'Failed to update — try again',type:'error'})
    }
  }

  async function handleCancel(bookingId) {
    const booking = bookings.find(b=>b.id===bookingId)
    if (!booking) return
    try {
      const updated = await updateBooking(bookingId, booking.staffResponses, 'cancelled')
      setBookings(prev => prev.map(b=>b.id===bookingId?updated:b))
      setToast({message:'Booking cancelled',type:'info'})
    } catch(e) {
      setToast({message:'Failed to cancel — try again',type:'error'})
    }
  }

  // Show action result page if arrived via email token link
  const params = new URLSearchParams(window.location.search)
  const emailAction = params.get('action')

  if (isStaff && emailAction && !pinVerified) {
    return (
      <div style={{background:'#0D0D0D',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'DM Sans, sans-serif'}}>
        <div style={{textAlign:'center',padding:40,maxWidth:400}}>
          <div style={{width:40,height:40,background:'#C8A96E',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:900,color:'#0D0D0D',margin:'0 auto 24px'}}>CH</div>
          {toast ? (
            <>
              <div style={{fontSize:40,marginBottom:16}}>{toast.type==='success'?'✓':'✕'}</div>
              <div style={{fontWeight:800,fontSize:22,color:'#F0EDE8',marginBottom:8}}>{toast.type==='success'?'Booking Confirmed':'Booking Declined'}</div>
              <div style={{fontSize:14,color:'#888',lineHeight:1.6,marginBottom:28}}>{toast.message}</div>
              <a href=/staff style={{display:'inline-block',padding:'12px 28px',borderRadius:10,background:'#C8A96E',color:'#0D0D0D',fontWeight:700,fontSize:14,textDecoration:'none'}}>Go to Staff Portal</a>
            </>
          ) : (
            <div style={{fontSize:14,color:'#666'}}>Processing...</div>
          )}
        </div>
        {toast&&<Toast message={toast.message} type={toast.type} onDone={()=>{}} />}
      </div>
    )
  }

  if (isStaff) {
    if (!pinVerified && !hasActionToken()) return <PinGate onUnlock={() => setPinVerified(true)} />
    return (
      <>
        <StaffPortal bookings={bookings} onRespond={handleRespond} onCancel={handleCancel} />
        {toast&&<Toast message={toast.message} type={toast.type} onDone={()=>setToast(null)} />}
      </>
    )
  }

  return (
    <>
      <PublicPage onSubmit={handleNewBooking} successBooking={successBooking} onReset={()=>setSuccessBooking(null)} />
      {toast&&<Toast message={toast.message} type={toast.type} onDone={()=>setToast(null)} />}
    </>
  )
}
