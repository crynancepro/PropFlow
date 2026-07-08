import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Globe, 
  Link as LinkIcon, 
  Trash2, 
  Plus, 
  Save, 
  Check, 
  TrendingUp, 
  AlertCircle, 
  X,
  FileText,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';
import { Language, TRANSLATIONS } from '../utils/i18n';
import { SessionAnalysis } from '../types';
import { playHighTechClick } from '../utils/soundEffects';
import { db, isConfigured, sanitizeFirestoreData, handleFirestoreError, OperationType } from '../firebase-setup';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

interface SessionAnalysisPageProps {
  userId: string;
  language: Language;
}

export default function SessionAnalysisPage({ userId, language }: SessionAnalysisPageProps) {
  const isFr = language === 'fr';

  // --- Date Math Utilities ---
  const todayStr = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  // State
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(new Date());
  
  // Form states
  const [tradingViewLinksInput, setTradingViewLinksInput] = useState<string>('');
  const [newsLink, setNewsLink] = useState<string>('');
  const [macroEvent, setMacroEvent] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [imageLink1, setImageLink1] = useState<string>('');
  const [imageLink2, setImageLink2] = useState<string>('');
  
  const [sessions, setSessions] = useState<SessionAnalysis[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  // Reset delete confirm state on date change
  useEffect(() => {
    setShowDeleteConfirm(false);
  }, [selectedDate]);

  // Parse list of links from input / existing links
  const linksList = useMemo(() => {
    if (!tradingViewLinksInput.trim()) return [];
    return tradingViewLinksInput
      .split(/[\n,]/)
      .map(link => link.trim())
      .filter(link => {
        try {
          return link.length > 0 && (link.startsWith('http://') || link.startsWith('https://'));
        } catch (_) {
          return false;
        }
      });
  }, [tradingViewLinksInput]);

  // Toast auto-clear
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load Sessions: real-time Firestore synchronization if configured and user is authenticated; fallback to local storage
  useEffect(() => {
    let unsubscribe = () => {};
    setLoading(true);

    if (isConfigured && db && userId && userId !== 'local') {
      const path = `users/${userId}/sessions_analysis`;
      try {
        const collRef = collection(db, 'users', userId, 'sessions_analysis');
        unsubscribe = onSnapshot(collRef, (snapshot) => {
          const fetched: SessionAnalysis[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            fetched.push({
              id: docSnap.id,
              userId: data.userId,
              date: data.date,
              tradingViewLinks: data.tradingViewLinks || '',
              newsLink: data.newsLink || '',
              macroEvent: data.macroEvent || '',
              notes: data.notes || '',
              imageLink1: data.imageLink1 || '',
              imageLink2: data.imageLink2 || '',
              createdAt: data.createdAt,
              updatedAt: data.updatedAt
            });
          });
          // Sort by date descending
          fetched.sort((a, b) => b.date.localeCompare(a.date));
          setSessions(fetched);
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, path);
          setLoading(false);
        });
      } catch (err) {
        console.error("Error setting up Firestore listener for sessions_analysis", err);
        setLoading(false);
      }
    } else {
      // Offline / Demo Local storage fallback
      const saved = localStorage.getItem(`propflow_local_sessions_${userId || 'local'}`);
      if (saved) {
        try {
          setSessions(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse local sessions_analysis", e);
        }
      }
      setLoading(false);
    }

    return () => unsubscribe();
  }, [userId]);

  // Sync to local storage when sessions change in local-only mode
  const saveLocalSessions = (newSessions: SessionAnalysis[]) => {
    localStorage.setItem(`propflow_local_sessions_${userId || 'local'}`, JSON.stringify(newSessions));
    setSessions(newSessions);
  };

  // Find existing session analysis for current selected date
  const activeSession = useMemo(() => {
    return sessions.find(s => s.date === selectedDate);
  }, [sessions, selectedDate]);

  // Load existing session analysis data into form fields when selectedDate changes
  useEffect(() => {
    if (activeSession) {
      setTradingViewLinksInput(activeSession.tradingViewLinks || '');
      setNewsLink(activeSession.newsLink || '');
      setMacroEvent(activeSession.macroEvent || '');
      setNotes(activeSession.notes || '');
      setImageLink1(activeSession.imageLink1 || '');
      setImageLink2(activeSession.imageLink2 || '');
    } else {
      setTradingViewLinksInput('');
      setNewsLink('');
      setMacroEvent('');
      setNotes('');
      setImageLink1('');
      setImageLink2('');
    }
  }, [selectedDate, activeSession]);

  // Format selected date nicely
  const formattedSelectedDate = useMemo(() => {
    if (!selectedDate) return '';
    const [year, month, day] = selectedDate.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const weekdayStr = dateObj.toLocaleDateString(isFr ? 'fr-FR' : 'en-US', { weekday: 'long' });
    const capitalizedWeekday = weekdayStr.charAt(0).toUpperCase() + weekdayStr.slice(1);
    const monthStr = dateObj.toLocaleDateString(isFr ? 'fr-FR' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    return `Analyse du ${capitalizedWeekday} ${monthStr}`;
  }, [selectedDate, isFr]);

  // Save / Update session
  const handleSaveSession = async () => {
    playHighTechClick();
    setIsSaving(true);
    
    const sessionId = activeSession?.id || `sess_${selectedDate}_${Date.now()}`;
    const payload: SessionAnalysis = {
      id: sessionId,
      userId: userId || 'local',
      date: selectedDate,
      tradingViewLinks: tradingViewLinksInput,
      newsLink,
      macroEvent,
      notes,
      imageLink1,
      imageLink2,
      createdAt: activeSession?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isConfigured && db && userId && userId !== 'local') {
      const path = `users/${userId}/sessions_analysis/${sessionId}`;
      try {
        const docRef = doc(db, 'users', userId, 'sessions_analysis', sessionId);
        await setDoc(docRef, sanitizeFirestoreData(payload));
        setToast({
          message: isFr ? "Session enregistrée avec succès dans le Cloud !" : "Session successfully saved in the Cloud!",
          type: 'success'
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
        setToast({
          message: isFr ? "Une erreur est survenue lors de la sauvegarde." : "An error occurred during save.",
          type: 'error'
        });
      } finally {
        setIsSaving(false);
      }
    } else {
      // Local mode
      let updatedSessions = [...sessions];
      const idx = updatedSessions.findIndex(s => s.id === sessionId || s.date === selectedDate);
      if (idx !== -1) {
        updatedSessions[idx] = payload;
      } else {
        updatedSessions.push(payload);
      }
      updatedSessions.sort((a, b) => b.date.localeCompare(a.date));
      saveLocalSessions(updatedSessions);
      setToast({
        message: isFr ? "Session sauvegardée localement (Local Isolé) !" : "Session saved locally (Isolated Local)!",
        type: 'success'
      });
      setIsSaving(false);
    }
  };

  // Delete session
  const handleDeleteSession = async () => {
    if (!activeSession) return;
    
    playHighTechClick();
    setIsSaving(true);

    if (isConfigured && db && userId && userId !== 'local') {
      const path = `users/${userId}/sessions_analysis/${activeSession.id}`;
      try {
        const docRef = doc(db, 'users', userId, 'sessions_analysis', activeSession.id);
        await deleteDoc(docRef);
        setToast({
          message: isFr ? "Session supprimée avec succès du Cloud." : "Session successfully deleted from Cloud.",
          type: 'success'
        });
        setShowDeleteConfirm(false);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
        setToast({
          message: isFr ? "Erreur lors de la suppression." : "Error during deletion.",
          type: 'error'
        });
      } finally {
        setIsSaving(false);
      }
    } else {
      const updated = sessions.filter(s => s.id !== activeSession.id);
      saveLocalSessions(updated);
      setToast({
        message: isFr ? "Session supprimée localement." : "Session deleted locally.",
        type: 'success'
      });
      setShowDeleteConfirm(false);
      setIsSaving(false);
    }
  };



  // --- Calendar Generation ---
  const calendarDays = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth(); // 0-indexed

    // First day of the month
    const firstDayInstance = new Date(year, month, 1);
    // Day of the week of first day (0 is Sun, 1 is Mon, etc.)
    // We adjust so Mon is 0, Sun is 6
    let startDayOfWeek = firstDayInstance.getDay();
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    // Number of days in the month
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Previous month filler
    const prevMonthDays = new Date(year, month, 0).getDate();
    const list: { dateStr: string; dayNum: number; isCurrentMonth: boolean; hasAnalysis: boolean }[] = [];

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const pDay = prevMonthDays - i;
      const pMonth = month === 0 ? 11 : month - 1;
      const pYear = month === 0 ? year - 1 : year;
      const dStr = `${pYear}-${String(pMonth + 1).padStart(2, '0')}-${String(pDay).padStart(2, '0')}`;
      list.push({
        dateStr: dStr,
        dayNum: pDay,
        isCurrentMonth: false,
        hasAnalysis: sessions.some(s => s.date === dStr)
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      list.push({
        dateStr: dStr,
        dayNum: day,
        isCurrentMonth: true,
        hasAnalysis: sessions.some(s => s.date === dStr)
      });
    }

    // Next month filler to complete the grid (multiples of 7)
    const remaining = 42 - list.length; // We do a standard 6-row (42 cells) grid for structural stability
    for (let i = 1; i <= remaining; i++) {
      const nMonth = month === 11 ? 0 : month + 1;
      const nYear = month === 11 ? year + 1 : year;
      const dStr = `${nYear}-${String(nMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      list.push({
        dateStr: dStr,
        dayNum: i,
        isCurrentMonth: false,
        hasAnalysis: sessions.some(s => s.date === dStr)
      });
    }

    return list;
  }, [currentCalendarDate, sessions]);

  // Navigation calendar months
  const nextMonth = () => {
    playHighTechClick();
    setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    playHighTechClick();
    setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1, 1));
  };

  const setCalendarToToday = () => {
    playHighTechClick();
    setCurrentCalendarDate(new Date());
    setSelectedDate(todayStr);
  };

  const monthLabel = useMemo(() => {
    return currentCalendarDate.toLocaleDateString(isFr ? 'fr-FR' : 'en-US', { month: 'long', year: 'numeric' });
  }, [currentCalendarDate, isFr]);

  return (
    <div className="space-y-6">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111622] border border-white/5 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/5 rounded-full blur-[50px] pointer-events-none" />
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wide">
              NOUVEAUTÉ
            </span>
            <span className="text-slate-500 text-xs font-mono font-medium">PropFlow Lab</span>
          </div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight font-sans">
            {isFr ? "Archivage & Sessions de Travail" : "Archiving & Work Sessions"}
          </h1>
          <p className="text-xs text-slate-400">
            {isFr 
              ? "Documentez et analysez vos sessions (passées, présentes, ou futures), votre backtesting et vos journées sans trade."
              : "Document and analyze your trading sessions (past, present, or future), your backtesting, and trade-free days."}
          </p>
        </div>

        <button
          onClick={setCalendarToToday}
          className="flex items-center gap-2 bg-[#1A2030] hover:bg-[#252E46] border border-white/10 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 transition-all cursor-pointer shadow-md self-start md:self-auto"
        >
          <CalendarIcon className="w-4 h-4 text-cyan-400" />
          {isFr ? "Aujourd'hui" : "Today"}
        </button>
      </div>

      {/* Grid Layout: Left Sidebar Calendar & Right/Center Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Monthly Calendar (4 cols) */}
        <div className="lg:col-span-5 bg-[#111622] border border-white/5 rounded-2xl p-4 md:p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <span className="font-bold text-slate-300 text-sm font-sans tracking-wide uppercase first-letter:capitalize">
              {monthLabel}
            </span>
            <div className="flex items-center gap-1">
              <button 
                onClick={prevMonth}
                className="p-1.5 hover:bg-white/5 rounded-lg border border-white/5 text-slate-400 hover:text-white transition-all cursor-pointer"
                title={isFr ? "Mois précédent" : "Previous month"}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={nextMonth}
                className="p-1.5 hover:bg-white/5 rounded-lg border border-white/5 text-slate-400 hover:text-white transition-all cursor-pointer"
                title={isFr ? "Mois suivant" : "Next month"}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="space-y-1">
            {/* Days of the Week Headers */}
            <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-500 font-mono py-1">
              {isFr 
                ? ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'].map(d => <div key={d}>{d}</div>)
                : ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(d => <div key={d}>{d}</div>)
              }
            </div>

            {/* Monthly grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((cell, idx) => {
                const isSelected = cell.dateStr === selectedDate;
                const isToday = cell.dateStr === todayStr;
                return (
                  <button
                    key={`${cell.dateStr}-${idx}`}
                    onClick={() => { playHighTechClick(); setSelectedDate(cell.dateStr); }}
                    className={`
                      relative aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-mono transition-all cursor-pointer border
                      ${cell.isCurrentMonth ? 'text-slate-200' : 'text-slate-600'}
                      ${isSelected 
                        ? 'bg-cyan-500/10 border-cyan-400 text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.15)] font-bold' 
                        : isToday 
                          ? 'border-white/20 bg-white/5 text-white font-bold' 
                          : 'border-transparent hover:bg-white/3'
                      }
                    `}
                  >
                    <span>{cell.dayNum}</span>

                    {/* Indicator: Blue breathing dot if analysis exists */}
                    {cell.hasAnalysis && (
                      <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-cyan-400' : 'bg-cyan-500 animate-pulse'}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend / Quick Summary */}
          <div className="border-t border-white/5 pt-3 flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-slate-400 font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
              <span>{isFr ? "Session Documentée" : "Documented Session"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-white/10 border border-white/20" />
              <span>{isFr ? "Aujourd'hui" : "Today"}</span>
            </div>
          </div>
          
          {/* Recent Archives Mini Feed */}
          {sessions.length > 0 && (
            <div className="pt-3 border-t border-white/5 space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                {isFr ? "Archives Récentes" : "Recent Archives"}
              </span>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 scroller-none">
                {sessions.slice(0, 5).map(sess => {
                  const [y, m, d] = sess.date.split('-').map(Number);
                  const dObj = new Date(y, m - 1, d);
                  const shortDate = dObj.toLocaleDateString(isFr ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
                  return (
                    <button
                      key={sess.id}
                      onClick={() => { playHighTechClick(); setSelectedDate(sess.date); }}
                      className={`w-full text-left p-2 rounded-lg border text-xs flex items-center justify-between transition-all cursor-pointer ${
                        sess.date === selectedDate 
                          ? 'bg-cyan-500/5 border-cyan-500/20 text-cyan-400' 
                          : 'bg-[#181F30]/40 border-white/5 text-slate-300 hover:bg-[#181F30]/75'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span className="font-mono text-[11px] truncate font-medium">{shortDate}</span>
                      </div>
                      {sess.macroEvent && sess.macroEvent.trim().toUpperCase() !== 'NONE' && (
                        <span className="bg-red-500/15 text-red-400 border border-red-500/25 px-1.5 py-0.2 rounded text-[8px] font-bold font-mono">
                          {sess.macroEvent}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Center/Right Panel: Form (7 cols) */}
        <div className="lg:col-span-7 bg-[#111622] border border-white/5 rounded-2xl p-5 md:p-6 shadow-xl space-y-5 relative">
          
          {/* Header block for form */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/5 pb-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 animate-spin" />
                {isFr ? "Détails de la Session" : "Session Details"}
              </span>
              <h2 className="text-lg font-black text-slate-100 tracking-tight font-sans">
                {formattedSelectedDate}
              </h2>
            </div>
            
            {activeSession && (
              <div className="flex items-center gap-1.5 self-start md:self-auto">
                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => { playHighTechClick(); setShowDeleteConfirm(true); }}
                    className="text-xs text-rose-400 hover:text-rose-300 border border-rose-500/20 hover:bg-rose-500/5 px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                    title={isFr ? "Supprimer cette session" : "Delete this session"}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {isFr ? "Supprimer" : "Delete"}
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 p-1 rounded-xl animate-fadeIn">
                    <span className="text-[10px] text-rose-300 font-bold px-2">
                      {isFr ? "Confirmer ?" : "Are you sure?"}
                    </span>
                    <button
                      type="button"
                      onClick={() => { playHighTechClick(); handleDeleteSession(); }}
                      className="bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-[10px] uppercase px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      {isFr ? "Oui" : "Yes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { playHighTechClick(); setShowDeleteConfirm(false); }}
                      className="bg-[#1A2030] hover:bg-[#252E46] text-slate-300 text-[10px] px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      {isFr ? "Non" : "No"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Form Content */}
          <div className="space-y-4">
            
            {/* Macro Selector - Manual Entry */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wide block">
                {isFr ? "1. Annonce Économique / Impact Macro" : "1. Economic Announcement / Macro Impact"}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={macroEvent}
                  onChange={(e) => setMacroEvent(e.target.value)}
                  placeholder={isFr 
                    ? "Saisissez l'événement macro (ex: NFP, CPI, FOMC, Discours Fed, Aucun...)" 
                    : "Enter the macro event (e.g. NFP, CPI, FOMC, Fed Speech, None...)"
                  }
                  className="w-full bg-[#181F30]/50 border border-white/5 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 font-sans transition-all"
                />
                <Globe className="absolute right-3.5 top-3.5 w-4.5 h-4.5 text-slate-500 pointer-events-none" />
              </div>
            </div>

            {/* Split Links Section */}
            <div className="space-y-3">
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wide block">
                {isFr ? "2. Liens de la Session" : "2. Session Links"}
              </label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* News Link Input */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    {isFr ? "Case A : Lien de l'Actualité / News" : "Box A: Economic News / Calendar Link"}
                  </span>
                  <div className="relative">
                    <input
                      type="url"
                      value={newsLink}
                      onChange={(e) => setNewsLink(e.target.value)}
                      placeholder={isFr 
                        ? "Collez le lien Investing, Myfxbook, ForexFactory..." 
                        : "Paste Investing, Myfxbook, ForexFactory link..."
                      }
                      className="w-full bg-[#181F30]/50 border border-white/5 rounded-xl pl-4 pr-10 py-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 font-mono transition-all"
                    />
                    {newsLink.trim().startsWith('http') ? (
                      <a 
                        href={newsLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="absolute right-3 top-3 p-0.5 hover:bg-white/5 rounded text-cyan-400 transition-colors"
                        title={isFr ? "Ouvrir le lien" : "Open link"}
                      >
                        <LinkIcon className="w-4.5 h-4.5" />
                      </a>
                    ) : (
                      <LinkIcon className="absolute right-3.5 top-3.5 w-4.5 h-4.5 text-slate-600 pointer-events-none" />
                    )}
                  </div>
                </div>

                {/* TradingView Screenshot Link Input */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    {isFr ? "Case B : Lien du Graphique TradingView" : "Box B: TradingView Chart Link"}
                  </span>
                  <div className="relative">
                    <input
                      type="url"
                      value={tradingViewLinksInput}
                      onChange={(e) => setTradingViewLinksInput(e.target.value)}
                      placeholder="https://www.tradingview.com/x/screenshot..."
                      className="w-full bg-[#181F30]/50 border border-white/5 rounded-xl pl-4 pr-10 py-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 font-mono transition-all"
                    />
                    {tradingViewLinksInput.trim().startsWith('http') ? (
                      <a 
                        href={tradingViewLinksInput} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="absolute right-3 top-3 p-0.5 hover:bg-white/5 rounded text-cyan-400 transition-colors"
                        title={isFr ? "Ouvrir le graphique" : "Open chart"}
                      >
                        <ImageIcon className="w-4.5 h-4.5" />
                      </a>
                    ) : (
                      <ImageIcon className="absolute right-3.5 top-3.5 w-4.5 h-4.5 text-slate-600 pointer-events-none" />
                    )}
                  </div>
                </div>

                {/* Image Link 1 */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    {isFr ? "Case C : Lien de l'Image 1" : "Box C: Image 1 Link"}
                  </span>
                  <div className="relative">
                    <input
                      type="url"
                      value={imageLink1}
                      onChange={(e) => setImageLink1(e.target.value)}
                      placeholder={isFr 
                        ? "Collez le lien de votre première image..." 
                        : "Paste link of your first image..."
                      }
                      className="w-full bg-[#181F30]/50 border border-white/5 rounded-xl pl-4 pr-10 py-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 font-mono transition-all"
                    />
                    {imageLink1.trim().startsWith('http') ? (
                      <a 
                        href={imageLink1} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="absolute right-3 top-3 p-0.5 hover:bg-white/5 rounded text-cyan-400 transition-colors"
                        title={isFr ? "Ouvrir l'image" : "Open image"}
                      >
                        <ImageIcon className="w-4.5 h-4.5" />
                      </a>
                    ) : (
                      <ImageIcon className="absolute right-3.5 top-3.5 w-4.5 h-4.5 text-slate-600 pointer-events-none" />
                    )}
                  </div>
                </div>

                {/* Image Link 2 */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    {isFr ? "Case D : Lien de l'Image 2" : "Box D: Image 2 Link"}
                  </span>
                  <div className="relative">
                    <input
                      type="url"
                      value={imageLink2}
                      onChange={(e) => setImageLink2(e.target.value)}
                      placeholder={isFr 
                        ? "Collez le lien de votre deuxième image..." 
                        : "Paste link of your second image..."
                      }
                      className="w-full bg-[#181F30]/50 border border-white/5 rounded-xl pl-4 pr-10 py-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 font-mono transition-all"
                    />
                    {imageLink2.trim().startsWith('http') ? (
                      <a 
                        href={imageLink2} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="absolute right-3 top-3 p-0.5 hover:bg-white/5 rounded text-cyan-400 transition-colors"
                        title={isFr ? "Ouvrir l'image" : "Open image"}
                      >
                        <ImageIcon className="w-4.5 h-4.5" />
                      </a>
                    ) : (
                      <ImageIcon className="absolute right-3.5 top-3.5 w-4.5 h-4.5 text-slate-600 pointer-events-none" />
                    )}
                  </div>
                </div>
              </div>

              {/* Dynamic Charts & Images Previews Grid */}
              {(tradingViewLinksInput.trim().startsWith('http') || imageLink1.trim().startsWith('http') || imageLink2.trim().startsWith('http')) && (
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                    {isFr ? "Aperçu des Graphiques & Images :" : "Charts & Images Preview:"}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* TradingView Preview */}
                    {tradingViewLinksInput.trim().startsWith('http') && (
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-500 font-bold uppercase font-mono block">TradingView (Case B)</span>
                        {(() => {
                          const url = tradingViewLinksInput.trim();
                          let displayUrl = url;
                          if (url.includes('tradingview.com/x/')) {
                            const parts = url.split('/x/');
                            if (parts[1]) {
                              displayUrl = `https://s3.tradingview.com/x/${parts[1].replace('/', '')}.png`;
                            }
                          }
                          return (
                            <a 
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group relative bg-[#0D1016] border border-white/5 rounded-xl aspect-video overflow-hidden flex flex-col items-center justify-center hover:border-cyan-500/20 transition-all shadow-md block"
                              title={isFr ? "Ouvrir l'image en grand" : "Open image in new tab"}
                            >
                              <img 
                                src={displayUrl} 
                                alt="TradingView screenshot"
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-[1.02] transition-all duration-300"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const placeholder = e.currentTarget.parentElement?.querySelector('.fallback-preview');
                                  if (placeholder) placeholder.classList.remove('hidden');
                                }}
                              />
                              <div className="fallback-preview hidden absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-[10px] text-slate-500 space-y-1">
                                <ImageIcon className="w-6 h-6 text-slate-600" />
                                <span className="truncate max-w-full font-mono">{isFr ? "Lien du graphique" : "Chart link"}</span>
                              </div>
                              <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-[10px] font-mono text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span>{isFr ? "Ouvrir ↗" : "Open ↗"}</span>
                              </div>
                            </a>
                          );
                        })()}
                      </div>
                    )}

                    {/* Image 1 Preview */}
                    {imageLink1.trim().startsWith('http') && (
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-500 font-bold uppercase font-mono block">{isFr ? "Image 1 (Case C)" : "Image 1 (Box C)"}</span>
                        <a 
                          href={imageLink1.trim()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative bg-[#0D1016] border border-white/5 rounded-xl aspect-video overflow-hidden flex flex-col items-center justify-center hover:border-cyan-500/20 transition-all shadow-md block"
                          title={isFr ? "Ouvrir l'image en grand" : "Open image in new tab"}
                        >
                          <img 
                            src={imageLink1.trim()} 
                            alt="Screenshot 1"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-[1.02] transition-all duration-300"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const placeholder = e.currentTarget.parentElement?.querySelector('.fallback-preview');
                              if (placeholder) placeholder.classList.remove('hidden');
                            }}
                          />
                          <div className="fallback-preview hidden absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-[10px] text-slate-500 space-y-1">
                            <ImageIcon className="w-6 h-6 text-slate-600" />
                            <span className="truncate max-w-full font-mono">{isFr ? "Image 1" : "Image 1"}</span>
                          </div>
                          <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-[10px] font-mono text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span>{isFr ? "Ouvrir ↗" : "Open ↗"}</span>
                          </div>
                        </a>
                      </div>
                    )}

                    {/* Image 2 Preview */}
                    {imageLink2.trim().startsWith('http') && (
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-500 font-bold uppercase font-mono block">{isFr ? "Image 2 (Case D)" : "Image 2 (Box D)"}</span>
                        <a 
                          href={imageLink2.trim()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative bg-[#0D1016] border border-white/5 rounded-xl aspect-video overflow-hidden flex flex-col items-center justify-center hover:border-cyan-500/20 transition-all shadow-md block"
                          title={isFr ? "Ouvrir l'image en grand" : "Open image in new tab"}
                        >
                          <img 
                            src={imageLink2.trim()} 
                            alt="Screenshot 2"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-[1.02] transition-all duration-300"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const placeholder = e.currentTarget.parentElement?.querySelector('.fallback-preview');
                              if (placeholder) placeholder.classList.remove('hidden');
                            }}
                          />
                          <div className="fallback-preview hidden absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-[10px] text-slate-500 space-y-1">
                            <ImageIcon className="w-6 h-6 text-slate-600" />
                            <span className="truncate max-w-full font-mono">{isFr ? "Image 2" : "Image 2"}</span>
                          </div>
                          <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-[10px] font-mono text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span>{isFr ? "Ouvrir ↗" : "Open ↗"}</span>
                          </div>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Session Notes Textarea */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wide block">
                {isFr ? "3. Notes de la Session & Journal" : "3. Session Notes & Journal"}
              </label>
              <textarea
                rows={8}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isFr 
                  ? "Rédigez le déroulement de votre session de trading, vos observations psychologiques, de backtesting, ce qu'il faut corriger ou retenir pour les prochaines fois..."
                  : "Write down how your session unfolded, your psychological thoughts, backtesting details, things to fix, or key takeaways for the next session..."
                }
                className="w-full bg-[#181F30]/50 border border-white/5 rounded-xl px-4 py-3.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 font-sans transition-all leading-relaxed"
              />
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-end pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={handleSaveSession}
                disabled={isSaving}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs tracking-wider uppercase px-6 py-3 rounded-xl transition-all shadow-lg hover:shadow-cyan-500/10 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    {isFr ? "Enregistrement..." : "Saving..."}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {isFr ? "Enregistrer la Session" : "Save Session"}
                  </>
                )}
              </button>
            </div>

          </div>

          {/* Feedback Toast */}
          {toast && (
            <div className={`absolute bottom-4 left-6 right-6 p-3 rounded-xl border flex items-center gap-2 text-xs font-bold animate-fadeInUp shadow-2xl z-30 ${
              toast.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' 
                : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
            }`}>
              {toast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{toast.message}</span>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
