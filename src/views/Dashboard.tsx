import { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy,
  limit,
  where
} from 'firebase/firestore';
import { 
  TrendingDown, 
  TrendingUp, 
  Box, 
  Scissors, 
  AlertCircle,
  Clock
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

export default function Dashboard() {
  const [profilesCount, setProfilesCount] = useState(0);
  const [stockTotal, setStockTotal] = useState(0);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    // Count profiles
    const unsubscribeProfiles = onSnapshot(
        query(collection(db, 'profiles'), where('ownerId', '==', uid)), 
        (snapshot) => {
            setProfilesCount(snapshot.size);
        }
    );

    // Sum stock
    const unsubscribeStock = onSnapshot(
        query(collection(db, 'stock'), where('ownerId', '==', uid)), 
        (snapshot) => {
            let total = 0;
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                total += (data.length * data.quantity);
            });
            setStockTotal(total);
        }
    );

    // Recent jobs
    const qJobs = query(
        collection(db, 'jobs'), 
        where('ownerId', '==', uid),
        orderBy('createdAt', 'desc'), 
        limit(5)
    );
    const unsubscribeJobs = onSnapshot(qJobs, (snapshot) => {
      setRecentJobs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubscribeProfiles();
      unsubscribeStock();
      unsubscribeJobs();
    };
  }, []);

  const stats = [
    { label: 'Tipos de Perfiles', value: profilesCount, icon: Box, color: 'bg-blue-500' },
    { label: 'Stock Total (m)', value: (stockTotal / 1000).toFixed(1), icon: TrendingUp, color: 'bg-green-500' },
    { label: 'Proyectos Realizados', value: recentJobs.length, icon: Scissors, color: 'bg-indigo-500' },
    { label: 'Desperdicio Prom.', value: '12%', icon: TrendingDown, color: 'bg-orange-500', trend: '-2.4%' },
  ];

  return (
    <div className="space-y-12">
      {/* Intro */}
      <section>
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-[10px] font-mono font-bold uppercase opacity-30 tracking-widest">Resumen de Operaciones //</p>
            <h1 className="text-4xl font-bold tracking-tighter uppercase italic">Control Central</h1>
          </div>
          <div className="hidden md:flex items-center gap-4 bg-white border border-[#141414] px-4 py-2 shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
            <Clock size={16} />
            <span className="text-xs font-mono font-bold">{new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white border border-[#141414] p-6 shadow-[8px_8px_0px_0px_rgba(20,20,20,1)] relative overflow-hidden group hover:-translate-y-1 transition-transform"
          >
            <div className={cn("absolute right-[-10px] top-[-10px] w-20 h-20 opacity-5 rotate-12 group-hover:rotate-45 transition-transform", stat.color)}>
              <stat.icon size={60} />
            </div>
            <p className="text-[10px] font-bold uppercase opacity-40 mb-2">{stat.label}</p>
            <div className="flex items-end gap-3">
              <p className="text-3xl font-bold tracking-tighter italic">{stat.value}</p>
              {stat.trend && (
                <span className="text-[10px] font-bold text-green-600 mb-1">{stat.trend}</span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-4 border-l-4 border-indigo-600 pl-4">
            <h3 className="text-xl font-bold uppercase tracking-tight italic">Proyectos Recientes</h3>
          </div>
          <div className="bg-white border border-[#141414] shadow-[8px_8px_0px_0px_rgba(20,20,20,1)] overflow-hidden">
            <div className="divide-y divide-[#141414]/10">
              {recentJobs.map(job => (
                <div key={job.id} className="p-6 flex justify-between items-center hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#141414] text-white flex items-center justify-center font-bold italic rotate-6">
                      {job.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold uppercase tracking-tight">{job.name}</h4>
                      <p className="text-[10px] font-mono opacity-50 uppercase">
                        {job.createdAt?.toDate().toLocaleDateString() || 'Recién creado'} // {job.utilization?.toFixed(1)}% Eficiencia
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold uppercase opacity-40">Desperdicio</span>
                    <span className="text-sm font-bold font-mono">{(job.totalWaste / 1000).toFixed(2)}m</span>
                  </div>
                </div>
              ))}
              {recentJobs.length === 0 && (
                <div className="p-12 text-center opacity-30 italic">No hay proyectos registrados aún.</div>
              )}
            </div>
          </div>
        </div>

        {/* System Health / Alerts */}
        <div className="space-y-6">
          <div className="flex items-center gap-4 border-l-4 border-red-500 pl-4">
            <h3 className="text-xl font-bold uppercase tracking-tight italic">Alertas de Stock</h3>
          </div>
          <div className="space-y-4">
            <div className="bg-white border border-[#141414] p-4 flex gap-4 items-start shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] border-l-4 border-l-red-500">
              <AlertCircle className="text-red-500 shrink-0" size={20} />
              <div>
                <p className="text-[10px] font-bold uppercase">Bajo Stock</p>
                <p className="text-sm font-medium mt-1 uppercase tracking-tight">Batiente 3" Blanco</p>
                <p className="text-[10px] opacity-50 mt-2">Sólo quedan 2 piezas de 6m.</p>
              </div>
            </div>
            <div className="bg-white border border-[#141414] p-4 flex gap-4 items-start shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] border-l-4 border-l-orange-500">
                <AlertCircle className="text-orange-500 shrink-0" size={20} />
                <div>
                  <p className="text-[10px] font-bold uppercase">Remanentes Críticos</p>
                  <p className="text-sm font-medium mt-1 uppercase tracking-tight">Jamba Superior Negro</p>
                  <p className="text-[10px] opacity-50 mt-2">Muchos cortes menores a 1m acumulados.</p>
                </div>
              </div>
          </div>

          <div className="bg-[#141414] text-white p-6 shadow-[8px_8px_0px_0px_rgba(30,30,30,0.2)]">
            <h4 className="font-bold uppercase tracking-widest text-[10px] mb-4">Consejo de Optimización</h4>
            <p className="text-xs leading-relaxed opacity-80">
              "Agrupa trabajos con el mismo perfil para utilizar remanentes de manera más efectiva. El algoritmo FFD prioriza piezas grandes primero."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
