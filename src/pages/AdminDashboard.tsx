// ─── src/pages/AdminDashboard.tsx ─────────────────────────────────────────────
// Changes:
//   • Booking cards have a Delete button (with confirm step)
//   • deleteBooking from useAdmin removes from Firestore + local state
//   • Revenue auto-recalculates from remaining bookings immediately
//   • CompleteModal surcharge preview uses live policy (reflects 30 min grace)
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import { createPortal }           from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Users, Clock, CheckCircle2, RefreshCw, ChevronDown,
  Receipt, X, MapPin, Navigation, Calendar, Route, Timer,
  Shield, ShieldAlert, ShieldOff, Trash2, AlertCircle,
  Loader2, Phone, Mail, UserCheck, Ban, Zap, Settings,
  PlayCircle, FlagTriangleRight,
} from 'lucide-react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db }                        from '../firebase';
import { GlassCard }                 from '../components/GlassCard';
import { useAdmin }                  from '../hooks/useAdmin';
import { AdminFareManager }          from '../components/admin/AdminFareManager';
import { AdminBookingSettings }      from '../components/admin/AdminBookingSettings';
import { getBookingPolicy }          from '../services/bookingPolicyService';
import type { Booking, BookingStatus, AppUser, UserRole } from '../types';

type DateFilter = 'day' | 'week' | 'month' | 'all';
const DATE_FILTERS: { key: DateFilter; label: string }[] = [
  { key:'day',label:'Today' },{ key:'week',label:'This Week' },
  { key:'month',label:'This Month' },{ key:'all',label:'All Time' },
];
function applyDateFilter(bookings: Booking[], filter: DateFilter): Booking[] {
  if (filter === 'all') return bookings;
  const start = new Date();
  if (filter === 'day')  { start.setHours(0,0,0,0); }
  else if (filter === 'week') { start.setDate(start.getDate()-start.getDay()); start.setHours(0,0,0,0); }
  else { start.setDate(1); start.setHours(0,0,0,0); }
  return bookings.filter((b) => new Date(b.createdAt) >= start);
}

const ALL_STATUSES: BookingStatus[] = ['pending','confirmed','ongoing','completed','cancelled'];
const STATUS_STYLE: Record<BookingStatus, string> = {
  pending:   'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  confirmed: 'text-blue-400   bg-blue-400/10   border-blue-400/30',
  ongoing:   'text-brand-red  bg-brand-red/10  border-brand-red/30',
  completed: 'text-green-400  bg-green-400/10  border-green-400/30',
  cancelled: 'text-red-400    bg-red-400/10    border-red-400/30',
};
const NEXT_STATUSES: Record<BookingStatus, BookingStatus[]> = {
  pending:   ['confirmed','cancelled'], confirmed: ['ongoing','cancelled'],
  ongoing:   ['completed','cancelled'], completed: [], cancelled: [],
};
const TRANSITION_LABELS: Partial<Record<BookingStatus, string>> = {
  confirmed: '✓ Confirm Booking',  ongoing:   '▶ Start Trip — Start Timer',
  completed: '⚑ Complete & Finalise Fare', cancelled: '✕ Cancel',
};

function fmtDuration(mins?: number): string {
  if (!mins) return '—';
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins/60)}h ${mins%60}m`;
}

// ── Complete modal ────────────────────────────────────────────────────────────

const CompleteModal: React.FC<{
  booking: Booking; onConfirm: () => void; onCancel: () => void; loading: boolean;
}> = ({ booking, onConfirm, onCancel, loading }) => {
  const [policy,      setPolicy]      = useState<import('../types').BookingPolicy | null>(null);
  const [policyError, setPolicyError] = useState(false);
  useEffect(() => { getBookingPolicy().then(setPolicy).catch(() => setPolicyError(true)); }, []);

  const isDistance = booking.serviceType === 'Distance';
  const elapsedMins = booking.actualStartTime
    ? Math.round((Date.now() - new Date(booking.actualStartTime).getTime()) / 60_000)
    : 0;

  let previewSurcharge = 0, previewFinalFare = booking.fare, extraMins = 0, billableMins = 0;
  if (isDistance && booking.estimatedDurationMins && policy) {
    extraMins    = Math.max(0, elapsedMins - booking.estimatedDurationMins);
    billableMins = Math.max(0, extraMins - policy.freeWaitingMins);
    const blocks = billableMins > 0 ? Math.ceil(billableMins / policy.waitingIntervalMins) : 0;
    previewSurcharge = blocks * policy.waitingChargePerInterval;
    previewFinalFare = booking.fare + previewSurcharge;
  }
  const hasSurcharge = previewSurcharge > 0;

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.div initial={{ opacity:0, scale:0.96, y:16 }} animate={{ opacity:1, scale:1, y:0 }}
        exit={{ opacity:0, scale:0.96, y:16 }} transition={{ type:'spring', damping:28, stiffness:380 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-background-card border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-10">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FlagTriangleRight className="w-4 h-4 text-green-400" /> Complete & Finalise Fare
          </h2>
          <button onClick={onCancel} className="p-1.5 rounded-lg text-text-sub hover:text-white hover:bg-white/10 transition-all"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-text-sub">Trip end time will be recorded as now and the final fare calculated.</p>
          <div className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-2.5 text-sm">
            <div className="flex justify-between"><span className="text-text-sub">Estimated fare</span><span className="text-white font-medium">LKR {booking.fare.toLocaleString()}</span></div>
            {booking.estimatedDurationMins && <div className="flex justify-between"><span className="text-text-sub">Est. duration</span><span className="text-white">{fmtDuration(booking.estimatedDurationMins)}</span></div>}
            {booking.actualStartTime && (
              <>
                <div className="flex justify-between"><span className="text-text-sub">Trip started</span><span className="text-white">{new Date(booking.actualStartTime).toLocaleTimeString('en-LK',{hour:'2-digit',minute:'2-digit'})}</span></div>
                <div className="flex justify-between"><span className="text-text-sub">Elapsed so far</span>
                  <span className={`font-medium ${elapsedMins>(booking.estimatedDurationMins??0)?'text-amber-400':'text-white'}`}>{fmtDuration(elapsedMins)}</span>
                </div>
              </>
            )}
            {isDistance && policy && (
              <div className="border-t border-white/8 pt-2 mt-1 space-y-2">
                {extraMins > 0 ? (
                  <>
                    <div className="flex justify-between"><span className="text-text-sub">Over estimate</span><span className="text-amber-400">{fmtDuration(extraMins)}</span></div>
                    <div className="flex justify-between"><span className="text-text-sub">Free grace period</span><span className="text-green-400">−{fmtDuration(policy.freeWaitingMins)}</span></div>
                    {billableMins > 0 ? (
                      <>
                        <div className="flex justify-between"><span className="text-text-sub">Billable</span><span className="text-white">{fmtDuration(billableMins)}</span></div>
                        <div className="flex justify-between">
                          <span className="text-text-sub">Surcharge ({Math.ceil(billableMins/policy.waitingIntervalMins)} × LKR {policy.waitingChargePerInterval})</span>
                          <span className="text-amber-400 font-medium">+LKR {previewSurcharge.toLocaleString()}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between"><span className="text-text-sub">Within grace period</span><span className="text-green-400">No surcharge</span></div>
                    )}
                  </>
                ) : (
                  <div className="flex justify-between"><span className="text-text-sub">Waiting surcharge</span><span className="text-green-400">None — within estimate</span></div>
                )}
              </div>
            )}
            <div className={`flex justify-between pt-2 border-t font-semibold text-base ${hasSurcharge?'border-amber-500/30':'border-white/10'}`}>
              <span className="text-white">Final Fare</span>
              <span className={hasSurcharge?'text-amber-400':'text-green-400'}>LKR {previewFinalFare.toLocaleString()}</span>
            </div>
            {!policy && !policyError && <div className="flex items-center gap-2 text-xs text-text-sub pt-1"><Loader2 className="w-3 h-3 animate-spin" /> Loading policy…</div>}
            {policyError && <div className="flex items-center gap-2 text-xs text-yellow-400 pt-1"><AlertCircle className="w-3 h-3" /> Could not load policy — surcharge defaults to 0</div>}
            {!isDistance && <p className="text-xs text-text-sub pt-1">{booking.serviceType} / {booking.bookingType} — no surcharge.</p>}
          </div>
          <div className="flex gap-3">
            <button onClick={onConfirm} disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500/20 border border-green-500/40 text-green-400 text-sm font-semibold hover:bg-green-500/30 transition-all disabled:opacity-50">
              {loading?<><Loader2 className="w-4 h-4 animate-spin"/>Finalising…</>:<><FlagTriangleRight className="w-4 h-4"/>Confirm & Complete</>}
            </button>
            <button onClick={onCancel} disabled={loading} className="px-5 py-2.5 rounded-xl border border-white/10 text-text-sub text-sm hover:bg-white/5 hover:text-white transition-all">Cancel</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Delete confirm modal ──────────────────────────────────────────────────────

const DeleteBookingModal: React.FC<{
  booking: Booking; onConfirm: () => Promise<void>; onCancel: () => void;
}> = ({ booking, onConfirm, onCancel }) => {
  const [deleting, setDeleting] = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const handle = async () => {
    setDeleting(true); setError(null);
    try { await onConfirm(); }
    catch (e: unknown) { setError((e as Error).message ?? 'Delete failed'); setDeleting(false); }
  };
  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.div initial={{ opacity:0, scale:0.96, y:16 }} animate={{ opacity:1, scale:1, y:0 }}
        exit={{ opacity:0, scale:0.96, y:16 }} transition={{ type:'spring', damping:28, stiffness:380 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm bg-background-card border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-10">
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-500/15 rounded-xl"><Trash2 className="w-5 h-5 text-red-400" /></div>
            <div>
              <h2 className="text-base font-bold text-white">Delete Booking?</h2>
              <p className="text-xs text-text-sub">#{booking.id.slice(0,12).toUpperCase()}</p>
            </div>
          </div>
          <p className="text-sm text-text-sub leading-relaxed">
            This will permanently remove the booking from Firestore.
            Revenue totals will update instantly. <span className="text-white">This cannot be undone.</span>
          </p>
          {error && <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</div>}
          <div className="flex gap-3">
            <button onClick={handle} disabled={deleting}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 text-sm font-semibold hover:bg-red-500/30 transition-all disabled:opacity-50">
              {deleting?<><Loader2 className="w-4 h-4 animate-spin"/>Deleting…</>:<><Trash2 className="w-4 h-4"/>Delete Permanently</>}
            </button>
            <button onClick={onCancel} disabled={deleting} className="px-5 py-2.5 rounded-xl border border-white/10 text-text-sub text-sm hover:bg-white/5 hover:text-white transition-all">Cancel</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Status updater ────────────────────────────────────────────────────────────

const StatusUpdater: React.FC<{ booking: Booking; onUpdate: (id: string, status: BookingStatus) => Promise<void>; }> = ({ booking, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<BookingStatus | null>(null);
  const nexts = NEXT_STATUSES[booking.status];
  if (nexts.length === 0) return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${STATUS_STYLE[booking.status]}`}>{booking.status}</span>;
  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as BookingStatus;
    if (!next) return;
    if (next === 'completed') { setPending('completed'); } else { doUpdate(next); }
  };
  const doUpdate = async (status: BookingStatus) => { setLoading(true); setPending(null); try { await onUpdate(booking.id, status); } finally { setLoading(false); } };
  return (
    <>
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${STATUS_STYLE[booking.status]}`}>{booking.status}</span>
        <div className="relative">
          <select onChange={handleSelect} disabled={loading} defaultValue="" key={booking.status}
            className="appearance-none text-xs bg-white/5 border border-white/15 rounded-lg pl-2 pr-6 py-1 text-text-sub hover:bg-white/10 cursor-pointer disabled:opacity-50 outline-none">
            <option value="" disabled>Move to…</option>
            {nexts.map((s) => <option key={s} value={s} className="bg-background">{TRANSITION_LABELS[s]??s}</option>)}
          </select>
          <ChevronDown className="absolute right-1 top-1.5 w-3 h-3 text-text-sub pointer-events-none" />
        </div>
        {loading && <RefreshCw className="w-3 h-3 text-text-sub animate-spin" />}
      </div>
      {createPortal(
        <AnimatePresence>
          {pending === 'completed' && (
            <CompleteModal booking={booking} loading={loading} onConfirm={() => doUpdate('completed')} onCancel={() => setPending(null)} />
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
};

// ── Fare badge ────────────────────────────────────────────────────────────────

const FareBadge: React.FC<{ booking: Booking }> = ({ booking }) => {
  const finalFare   = booking.finalFare;
  const surcharge   = booking.waitingSurcharge ?? 0;
  const displayFare = finalFare ?? booking.fare;
  const isCompleted = booking.status === 'completed';
  return (
    <div className="text-right flex-shrink-0">
      {surcharge > 0 ? (
        <>
          <p className="text-lg font-bold text-white">LKR {displayFare.toLocaleString()}</p>
          <p className="text-xs text-amber-400">+LKR {surcharge.toLocaleString()} waiting</p>
          <p className="text-xs text-text-sub line-through">LKR {booking.fare.toLocaleString()} est.</p>
        </>
      ) : (
        <>
          <p className={`text-lg font-bold ${isCompleted && finalFare ? 'text-green-400' : 'text-white'}`}>
            LKR {displayFare.toLocaleString()}
          </p>
          {isCompleted && finalFare && <p className="text-xs text-green-400/70">Final fare</p>}
        </>
      )}
      <p className="text-xs text-text-sub mt-0.5">{new Date(booking.createdAt).toLocaleDateString('en-LK')}</p>
    </div>
  );
};

// ── StatCard ──────────────────────────────────────────────────────────────────

const StatCard: React.FC<{ label: string; value: number|string; icon: React.ReactNode; color: string; }> = ({ label, value, icon, color }) => (
  <GlassCard className="p-5"><div className="flex items-center gap-4"><div className={`p-3 rounded-xl ${color}`}>{icon}</div><div><p className="text-sm text-text-sub">{label}</p><p className="text-2xl font-bold text-white">{value}</p></div></div></GlassCard>
);

// ── UserModal ─────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<UserRole, string> = { user:'Customer', driver:'Driver', admin:'Admin', superAdmin:'Super Admin' };

const UserModal: React.FC<{ user: AppUser; onClose: ()=>void; onUpdated: (uid:string,c:Partial<AppUser>)=>void; onDeleted: (uid:string)=>void; }> = ({ user, onClose, onUpdated, onDeleted }) => {
  const [saving,setSaving]=useState(false); const [confirmDel,setConfirmDel]=useState(false);
  const [err,setErr]=useState<string|null>(null); const [ok,setOk]=useState<string|null>(null);
  React.useEffect(()=>{ const h=(e:KeyboardEvent)=>{ if(e.key==='Escape')onClose(); }; document.addEventListener('keydown',h); return()=>document.removeEventListener('keydown',h); },[onClose]);
  const flash=(m:string)=>{ setOk(m); setTimeout(()=>setOk(null),3000); };
  const apply=async(c:Partial<AppUser>)=>{ setSaving(true);setErr(null);try{ await updateDoc(doc(db,'users',user.uid),c);onUpdated(user.uid,c);flash('Updated.'); }catch(e:unknown){ setErr((e as Error).message); }finally{ setSaving(false); } };
  const del=async()=>{ setSaving(true);try{ await deleteDoc(doc(db,'users',user.uid));onDeleted(user.uid);onClose(); }catch(e:unknown){ setErr((e as Error).message);setSaving(false);setConfirmDel(false); } };
  const suspended=!!(user as AppUser&{suspended?:boolean}).suspended;
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"/>
      <motion.div initial={{opacity:0,y:40,scale:0.97}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:40,scale:0.97}} transition={{type:'spring',damping:28,stiffness:380}} onClick={e=>e.stopPropagation()} className="relative w-full max-w-lg bg-background-card border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-10">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8"><h2 className="text-lg font-bold text-white">User Details</h2><button onClick={onClose} className="p-1.5 rounded-lg text-text-sub hover:text-white hover:bg-white/10 transition-all"><X className="w-5 h-5"/></button></div>
        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-brand-red/20 border border-brand-red/30 flex items-center justify-center overflow-hidden flex-shrink-0">{user.photoURL?<img src={user.photoURL} alt="" className="w-full h-full object-cover"/>:<span className="text-2xl font-bold text-brand-red">{user.name?.charAt(0)?.toUpperCase()??'?'}</span>}</div>
            <div className="min-w-0"><p className="text-white font-semibold text-lg truncate">{user.name}</p><div className="flex items-center gap-2 flex-wrap mt-0.5"><span className="text-xs px-2 py-0.5 bg-white/10 text-text-sub rounded-full">{ROLE_LABELS[user.role??'user']}</span>{user.vehicleRegistered&&<span className="text-xs px-2 py-0.5 bg-green-400/10 text-green-400 rounded-full border border-green-400/20">verified</span>}{suspended&&<span className="text-xs px-2 py-0.5 bg-red-400/10 text-red-400 rounded-full border border-red-400/20">suspended</span>}</div></div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm"><Mail className="w-4 h-4 text-text-sub flex-shrink-0"/><span className="text-white">{user.email}</span></div>
            <div className="flex items-center gap-3 text-sm"><Phone className="w-4 h-4 text-text-sub flex-shrink-0"/><span className={user.phone?'text-white':'text-yellow-400'}>{user.phone||'No phone on file'}</span></div>
            <div className="flex items-center gap-3 text-sm"><Calendar className="w-4 h-4 text-text-sub flex-shrink-0"/><span className="text-text-sub">Joined {new Date(user.createdAt).toLocaleDateString('en-LK',{year:'numeric',month:'long',day:'numeric'})}</span></div>
          </div>
          {ok&&<div className="flex items-center gap-2 text-sm text-green-400 bg-green-400/10 border border-green-400/20 rounded-xl px-4 py-3"><CheckCircle2 className="w-4 h-4"/>{ok}</div>}
          {err&&<div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3"><AlertCircle className="w-4 h-4"/>{err}</div>}
          <div><p className="text-xs text-text-sub uppercase tracking-wide mb-3">Account Actions</p><div className="grid grid-cols-2 gap-2">
            <button onClick={()=>apply({vehicleRegistered:!user.vehicleRegistered})} disabled={saving} className="flex items-center gap-2 py-2.5 px-3 rounded-xl border border-white/10 text-sm text-text-sub hover:bg-white/5 hover:text-white transition-all disabled:opacity-50"><UserCheck className="w-4 h-4 text-blue-400"/>{user.vehicleRegistered?'Unverify':'Verify'}</button>
            <button onClick={()=>apply({suspended:!suspended} as Partial<AppUser>)} disabled={saving} className="flex items-center gap-2 py-2.5 px-3 rounded-xl border border-white/10 text-sm text-text-sub hover:bg-white/5 hover:text-white transition-all disabled:opacity-50"><ShieldAlert className="w-4 h-4 text-yellow-400"/>{suspended?'Unsuspend':'Suspend'}</button>
            {user.role!=='superAdmin'&&<button onClick={()=>apply({role:user.role==='admin'?'user':'admin'})} disabled={saving} className="flex items-center gap-2 py-2.5 px-3 rounded-xl border border-white/10 text-sm text-text-sub hover:bg-white/5 hover:text-white transition-all disabled:opacity-50">{user.role==='admin'?<><ShieldOff className="w-4 h-4 text-orange-400"/>Remove Admin</>:<><Shield className="w-4 h-4 text-green-400"/>Make Admin</>}</button>}
            <button onClick={()=>apply({suspended:true,role:'user'} as Partial<AppUser>)} disabled={saving||user.role==='superAdmin'} className="flex items-center gap-2 py-2.5 px-3 rounded-xl border border-red-500/20 text-sm text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"><Ban className="w-4 h-4"/>Ban</button>
          </div></div>
          <div className="border border-red-500/20 rounded-xl p-4"><p className="text-xs text-red-400 font-semibold uppercase tracking-wide mb-2">Danger Zone</p>
            {!confirmDel?<button onClick={()=>setConfirmDel(true)} className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors"><Trash2 className="w-4 h-4"/>Delete Account</button>
            :<div className="space-y-2"><p className="text-xs text-red-300">Permanently deletes the Firestore profile.</p><div className="flex gap-2">
              <button onClick={del} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-medium hover:bg-red-500/30 disabled:opacity-50">{saving?<><Loader2 className="w-3 h-3 animate-spin"/>Deleting…</>:'Yes, delete permanently'}</button>
              <button onClick={()=>setConfirmDel(false)} className="px-3 py-1.5 rounded-lg border border-white/10 text-text-sub text-xs hover:bg-white/5 transition-all">Cancel</button>
            </div></div>}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────

type ActiveTab = 'bookings' | 'users' | 'fares' | 'settings';
const TABS: { key: ActiveTab; label: string; icon: React.ReactNode }[] = [
  { key:'bookings', label:'Bookings',        icon:<Activity className="w-4 h-4"/> },
  { key:'users',    label:'Users',           icon:<Users className="w-4 h-4"/> },
  { key:'fares',    label:'Fare Management', icon:<Receipt className="w-4 h-4"/> },
  { key:'settings', label:'Settings',        icon:<Settings className="w-4 h-4"/> },
];

export const AdminDashboard: React.FC = () => {
  const { bookings, users, isLoading, error, updateStatus, deleteBooking, refresh } = useAdmin();
  const [activeTab,      setActiveTab]      = useState<ActiveTab>('bookings');
  const [statusFilter,   setStatusFilter]   = useState<BookingStatus | 'all'>('all');
  const [dateFilter,     setDateFilter]     = useState<DateFilter>('all');
  const [selectedUser,   setSelectedUser]   = useState<AppUser | null>(null);
  const [localUsers,     setLocalUsers]     = useState<AppUser[]>([]);
  const [deletingId,     setDeletingId]     = useState<string | null>(null);
  const [bookingToDelete,setBookingToDelete]= useState<Booking | null>(null);

  React.useEffect(() => { setLocalUsers(users); }, [users]);

  const dated  = applyDateFilter(bookings, dateFilter);
  const listed = statusFilter === 'all' ? dated : dated.filter(b=>b.status===statusFilter);
  const revenue = dated.filter(b=>b.status==='completed').reduce((s,b)=>s+(b.finalFare??b.fare),0);
  const stats = {
    total:     dated.length,
    pending:   dated.filter(b=>b.status==='pending').length,
    ongoing:   dated.filter(b=>b.status==='ongoing').length,
    completed: dated.filter(b=>b.status==='completed').length,
  };

  const handleDeleteConfirm = async () => {
    if (!bookingToDelete) return;
    setDeletingId(bookingToDelete.id);
    try { await deleteBooking(bookingToDelete.id); setBookingToDelete(null); }
    finally { setDeletingId(null); }
  };

  const handleUserUpdated = (uid:string,c:Partial<AppUser>) => {
    setLocalUsers(p=>p.map(u=>u.uid===uid?{...u,...c}:u));
    if (selectedUser?.uid===uid) setSelectedUser(p=>p?{...p,...c}:null);
  };
  const handleUserDeleted = (uid:string) => { setLocalUsers(p=>p.filter(u=>u.uid!==uid)); setSelectedUser(null); };

  return (
    <div className="min-h-[calc(100vh-80px)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-end justify-between">
          <div><h1 className="text-3xl font-bold text-white mb-1">Admin Dashboard</h1><p className="text-text-sub">Manage bookings, users, pricing and settings</p></div>
          {activeTab!=='fares'&&activeTab!=='settings'&&<button onClick={refresh} disabled={isLoading} className="flex items-center gap-2 text-sm text-text-sub hover:text-white transition-colors"><RefreshCw className={`w-4 h-4 ${isLoading?'animate-spin':''}`}/>Refresh</button>}
        </div>

        {error&&<div className="mb-6 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">{error}</div>}

        {activeTab==='bookings'&&(
          <>
            <div className="flex gap-2 mb-5 flex-wrap">
              {DATE_FILTERS.map(({key,label})=>(<button key={key} onClick={()=>setDateFilter(key)} className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-all ${dateFilter===key?'bg-brand-red/20 border-brand-red text-brand-red':'bg-white/5 border-white/10 text-text-sub hover:bg-white/10 hover:text-white'}`}>{label}</button>))}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard label="Total"     value={stats.total}     icon={<Activity className="w-5 h-5 text-brand-red"/>}     color="bg-brand-red/20"/>
              <StatCard label="Pending"   value={stats.pending}   icon={<Clock className="w-5 h-5 text-yellow-400"/>}       color="bg-yellow-400/20"/>
              <StatCard label="Ongoing"   value={stats.ongoing}   icon={<PlayCircle className="w-5 h-5 text-blue-400"/>}    color="bg-blue-400/20"/>
              <StatCard label="Completed" value={stats.completed} icon={<CheckCircle2 className="w-5 h-5 text-green-400"/>} color="bg-green-400/20"/>
            </div>
            <GlassCard className="mb-6 p-5">
              <p className="text-sm text-text-sub mb-1">Revenue · {DATE_FILTERS.find(f=>f.key===dateFilter)?.label}</p>
              <p className="text-3xl font-bold text-white">LKR {revenue.toLocaleString()}</p>
              <p className="text-xs text-text-sub mt-1">Completed bookings · final fare · updates instantly on deletion</p>
            </GlassCard>
          </>
        )}

        <div className="flex gap-1 mb-6 bg-white/5 rounded-xl p-1 w-fit flex-wrap">
          {TABS.map(({key,label,icon})=>(<button key={key} onClick={()=>setActiveTab(key)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab===key?'bg-brand-red/20 text-brand-red':'text-text-sub hover:text-white'}`}>{icon} {label}</button>))}
        </div>

        {activeTab==='bookings'&&(
          <div>
            <div className="flex gap-2 flex-wrap mb-5">
              {(['all',...ALL_STATUSES] as const).map(s=>(<button key={s} onClick={()=>setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize ${statusFilter===s?'bg-brand-red/20 border-brand-red text-brand-red':'bg-white/5 border-white/10 text-text-sub hover:bg-white/10'}`}>{s}<span className="ml-1.5 opacity-60">({s==='all'?dated.length:dated.filter(b=>b.status===s).length})</span></button>))}
            </div>
            {isLoading?(<div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin"/></div>)
            :listed.length===0?(<GlassCard><p className="text-center text-text-sub py-12">No bookings match this filter.</p></GlassCard>)
            :(
              <div className="space-y-3">
                {listed.map(b=>(
                  <motion.div key={b.id} initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} layout>
                    <GlassCard className="p-5">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="text-xs font-mono text-text-sub">{b.id.slice(0,12)}…</span>
                            <StatusUpdater booking={b} onUpdate={updateStatus}/>
                            {b.bookingType==='immediate'&&<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-400/10 text-amber-400 border border-amber-400/20"><Zap className="w-3 h-3"/>Immediate</span>}
                          </div>
                          <p className="text-white font-medium">{b.userName}</p>
                          <div className="flex items-start gap-1.5 mt-1"><MapPin className="w-3.5 h-3.5 text-brand-red flex-shrink-0 mt-0.5"/><p className="text-sm text-text-sub truncate">{b.pickupLocation}</p></div>
                          <div className="flex items-start gap-1.5"><Navigation className="w-3.5 h-3.5 text-text-sub flex-shrink-0 mt-0.5"/><p className="text-sm text-text-sub truncate">{b.dropLocation}</p></div>
                          <div className="flex gap-3 mt-2 text-xs text-text-sub flex-wrap">
                            <span className="flex items-center gap-1"><Route className="w-3 h-3"/>{b.distance} km</span>
                            {b.estimatedDurationMins&&<span className="flex items-center gap-1"><Timer className="w-3 h-3"/>Est. {fmtDuration(b.estimatedDurationMins)}</span>}
                            {b.actualDurationMins&&<span className="flex items-center gap-1 text-green-400"><Timer className="w-3 h-3"/>Actual {fmtDuration(b.actualDurationMins)}</span>}
                            {b.actualStartTime&&<span className="flex items-center gap-1 text-blue-400"><PlayCircle className="w-3 h-3"/>Trip started {new Date(b.actualStartTime).toLocaleTimeString('en-LK',{hour:'2-digit',minute:'2-digit'})}</span>}
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/>{b.scheduledDate} {b.scheduledTime}</span>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <FareBadge booking={b}/>
                          {/* Delete button */}
                          <button
                            onClick={() => setBookingToDelete(b)}
                            disabled={!!deletingId}
                            title="Delete booking"
                            className="p-1.5 rounded-lg text-text-sub hover:text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-30 flex-shrink-0 mt-1"
                          >
                            {deletingId === b.id
                              ? <Loader2 className="w-4 h-4 animate-spin text-red-400"/>
                              : <Trash2 className="w-4 h-4"/>
                            }
                          </button>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab==='users'&&(
          <div className="space-y-3">
            {isLoading?<div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin"/></div>
            :localUsers.length===0?<GlassCard><p className="text-center text-text-sub py-12">No users found.</p></GlassCard>
            :localUsers.map(u=>(
              <motion.button key={u.uid} onClick={()=>setSelectedUser(u)} className="w-full text-left" initial={{opacity:0,y:4}} animate={{opacity:1,y:0}}>
                <GlassCard className="p-5 hover:border-white/25 hover:bg-white/5 transition-all cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-brand-red/20 flex items-center justify-center flex-shrink-0 overflow-hidden border border-brand-red/20">{u.photoURL?<img src={u.photoURL} alt="" className="w-10 h-10 rounded-full object-cover"/>:<span className="text-sm font-bold text-brand-red">{u.name?.charAt(0)?.toUpperCase()??'?'}</span>}</div>
                    <div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><p className="text-white font-medium truncate">{u.name}</p>{(u.role==='admin'||u.role==='superAdmin')&&<span className="text-xs px-2 py-0.5 bg-brand-red/20 text-brand-red rounded-full border border-brand-red/30">{ROLE_LABELS[u.role]}</span>}{u.vehicleRegistered&&<span className="text-xs px-2 py-0.5 bg-green-400/10 text-green-400 rounded-full border border-green-400/20">verified</span>}</div><p className="text-sm text-text-sub truncate">{u.email}</p></div>
                    <div className="text-right text-xs text-text-sub flex-shrink-0"><p>Joined</p><p>{new Date(u.createdAt).toLocaleDateString('en-LK')}</p></div>
                  </div>
                </GlassCard>
              </motion.button>
            ))}
          </div>
        )}

        {activeTab==='fares'    && <AdminFareManager/>}
        {activeTab==='settings' && <AdminBookingSettings/>}
      </div>

      <AnimatePresence>
        {selectedUser && <UserModal user={selectedUser} onClose={()=>setSelectedUser(null)} onUpdated={handleUserUpdated} onDeleted={handleUserDeleted}/>}
      </AnimatePresence>

      {/* Booking delete confirmation */}
      {createPortal(
        <AnimatePresence>
          {bookingToDelete && (
            <DeleteBookingModal
              booking={bookingToDelete}
              onConfirm={handleDeleteConfirm}
              onCancel={() => setBookingToDelete(null)}
            />
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
};