/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Box, 
  Scissors, 
  Settings, 
  History,
  LayoutDashboard,
  PlusCircle,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import Dashboard from './views/Dashboard';
import Inventory from './views/Inventory';
import Optimizer from './views/Optimizer';
import HistoryView from './views/History';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';

type View = 'dashboard' | 'inventory' | 'optimizer' | 'history';

export default function App() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#E4E3E0] flex items-center justify-center font-mono">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 border-2 border-[#141414] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs uppercase tracking-widest opacity-50 font-bold">MUNDOCANCEL • CARGANDO</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#E4E3E0] flex flex-col items-center justify-center p-6 text-[#141414]">
        <div className="max-w-md w-full bg-white border border-[#141414] p-8 shadow-[8px_8px_0px_0px_rgba(20,20,20,1)]">
          <div className="mb-8 space-y-2">
            <h1 className="text-4xl font-bold tracking-tighter uppercase italic">MundoCancel</h1>
            <p className="text-sm font-mono opacity-60">Linear Cut Optimization System v1.0</p>
          </div>
          <p className="mb-10 text-sm leading-relaxed">
            Optimiza tus cortes de aluminio, gestiona inventario de remanentes y reduce el desperdicio industrial.
          </p>
          <button 
            onClick={handleLogin}
            className="w-full py-4 bg-[#141414] text-white font-bold uppercase tracking-widest text-sm hover:invert transition-all flex items-center justify-center gap-3"
          >
            Acceder con Google
          </button>
        </div>
        <footer className="mt-8 text-[10px] font-mono opacity-40 uppercase tracking-widest">
          © 2026 MundoCancel Industrial Systems
        </footer>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'optimizer', label: 'Optimizador', icon: Scissors },
    { id: 'inventory', label: 'Inventario', icon: Box },
    { id: 'history', label: 'Historial', icon: History },
  ];

  return (
    <div className="min-h-screen bg-[#F0F0EE] text-[#141414] flex">
      {/* Mobile Menu Button */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 bg-white border border-[#141414] shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] print:hidden"
      >
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-[#141414] transition-transform duration-300 transform lg:translate-x-0 lg:static flex flex-col print:hidden",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-8 border-bottom border-[#141414]">
          <h1 className="text-2xl font-bold tracking-tighter uppercase italic mb-1">MundoCancel</h1>
          <p className="text-[10px] font-mono opacity-50 uppercase font-bold tracking-wider">Cut Optimizer</p>
        </div>

        <nav className="flex-1 py-6">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveView(item.id as View);
                setIsSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-4 px-8 py-4 text-sm font-bold uppercase tracking-widest transition-all border-y border-transparent -my-px",
                activeView === item.id 
                  ? "bg-[#141414] text-white border-[#141414]" 
                  : "hover:bg-[#E4E3E0] opacity-60 hover:opacity-100"
              )}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-8 border-t border-[#141414]">
          <div className="flex items-center gap-3 mb-6">
            <img src={user.photoURL || ''} className="w-8 h-8 rounded-full border border-[#141414]" alt="Avatar" />
            <div>
              <p className="text-[10px] font-bold uppercase truncate max-w-[120px]">{user.displayName}</p>
              <button 
                onClick={() => auth.signOut()}
                className="text-[9px] font-mono uppercase underline opacity-50 hover:opacity-100"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
          <p className="text-[9px] font-mono opacity-30 uppercase tracking-tighter">By AI Studio Build v1.0</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto">
        <header className="sticky top-0 z-30 bg-[#F0F0EE]/80 backdrop-blur-md border-b border-[#141414]/10 px-8 py-6 flex justify-between items-center print:hidden">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-mono opacity-30 uppercase tracking-widest">Vista Actual //</span>
            <h2 className="text-lg font-bold uppercase tracking-tight italic">
              {navItems.find(i => i.id === activeView)?.label}
            </h2>
          </div>
          <div className="flex gap-4">
             {/* Global Actions could go here */}
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto print:p-0 print:max-w-none">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeView === 'dashboard' && <Dashboard />}
              {activeView === 'optimizer' && <Optimizer />}
              {activeView === 'inventory' && <Inventory />}
              {activeView === 'history' && <HistoryView />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
