import { useState, useEffect, MouseEvent } from 'react';
import { db, auth } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy,
  deleteDoc,
  doc,
  collectionGroup,
  getDocs,
  where
} from 'firebase/firestore';
import { Trash2, ExternalLink, FileText, ChevronRight, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

export default function History() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [jobResults, setJobResults] = useState<any[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const qJobs = query(
        collection(db, 'jobs'), 
        where('ownerId', '==', auth.currentUser.uid),
        orderBy('createdAt', 'desc')
    );
    const unsubscribeJobs = onSnapshot(qJobs, (snapshot) => {
      setJobs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'jobs'));
    return () => unsubscribeJobs();
  }, []);

  const fetchJobDetails = async (job: any) => {
    setSelectedJob(job);
    const qResults = query(collection(db, `jobs/${job.id}/results`));
    const snapshot = await getDocs(qResults);
    setJobResults(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const deleteJob = async (id: string, e: MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Eliminar este proyecto y sus resultados?')) {
      await deleteDoc(doc(db, 'jobs', id));
      if (selectedJob?.id === id) {
        setSelectedJob(null);
        setJobResults([]);
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
      {/* Jobs List */}
      <div className={cn("lg:col-span-5 space-y-4", selectedJob ? "hidden lg:block" : "block")}>
        <div className="flex items-center gap-2 border-b border-[#141414] pb-2 mb-6">
            <span className="text-[10px] font-bold uppercase opacity-30 tracking-widest">Listado Histórico //</span>
        </div>
        <div className="space-y-4">
          {jobs.map(job => (
            <div 
              key={job.id} 
              onClick={() => fetchJobDetails(job)}
              className={cn(
                "bg-white border border-[#141414] p-6 shadow-[6px_6px_0px_0px_rgba(20,20,20,1)] cursor-pointer transition-all hover:-translate-y-1",
                selectedJob?.id === job.id ? "bg-[#F9F9F8] border-blue-600 ring-1 ring-blue-600" : ""
              )}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-bold uppercase tracking-tight italic">{job.name}</h4>
                  <p className="text-[10px] font-mono opacity-50 uppercase mt-1">
                    {job.createdAt?.toDate().toLocaleString()}
                  </p>
                </div>
                <button onClick={(e) => deleteJob(job.id, e)} className="text-red-500 opacity-20 hover:opacity-100 p-1">
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                <div className="flex flex-col">
                  <span className="opacity-40">Aprovechamiento</span>
                  <span className="text-sm font-bold italic">{job.utilization?.toFixed(1)}%</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="opacity-40">Desperdicio</span>
                  <span className="text-sm font-bold italic">{(job.totalWaste / 1000).toFixed(2)}m</span>
                </div>
              </div>
            </div>
          ))}
          {jobs.length === 0 && (
            <div className="py-20 text-center opacity-20 italic">No hay proyectos guardados.</div>
          )}
        </div>
      </div>

      {/* Job Details */}
      <div className={cn("lg:col-span-7", selectedJob ? "block" : "hidden lg:block")}>
        {selectedJob ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-white border border-[#141414] p-8 shadow-[8px_8px_0px_0px_rgba(20,20,20,1)]">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <button onClick={() => setSelectedJob(null)} className="lg:hidden text-[10px] font-bold uppercase underline mb-4 opacity-50">← Volver</button>
                        <h3 className="text-2xl font-bold uppercase tracking-tight italic">{selectedJob.name}</h3>
                        <p className="text-xs font-mono opacity-50 mt-1 uppercase">Resultados de Optimización Registrados</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10 pb-6 border-b border-[#141414]/10">
                    <div>
                        <p className="text-[10px] font-bold uppercase opacity-40">Piezas Stock</p>
                        <p className="font-bold font-mono">{jobResults.length}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase opacity-40">Utilización</p>
                        <p className="font-bold font-mono">{selectedJob.utilization?.toFixed(1)}%</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase opacity-40">Hoja Corte</p>
                        <p className="font-bold font-mono">{selectedJob.bladeWidth}mm</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold uppercase opacity-40">Fecha</p>
                        <p className="font-bold font-mono text-[10px]">{selectedJob.createdAt?.toDate().toLocaleDateString()}</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {jobResults.map((result, idx) => (
                        <div key={result.id} className="border-b border-[#141414]/10 pb-6 last:border-0">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-[10px] font-bold uppercase tracking-widest bg-[#141414] text-white px-2 py-0.5">Perfil #{idx + 1}</span>
                                <span className="text-[10px] font-mono opacity-50">{result.stockLength}mm Total</span>
                            </div>
                            
                            {/* Visual Representation */}
                            <div className="h-6 w-full bg-gray-100 flex overflow-hidden border border-[#141414]">
                                {result.cuts.map((cut: any, cIdx: number) => (
                                    <div 
                                        key={cIdx} 
                                        className="h-full bg-blue-600 border-r border-[#141414]/20 flex items-center justify-center text-[8px] text-white font-bold truncate"
                                        style={{ width: `${(cut.length / result.stockLength) * 100}%` }}
                                    >
                                        {cut.length}
                                    </div>
                                ))}
                                <div className="h-full bg-orange-200 grow flex items-center justify-center text-[8px] font-bold opacity-60">
                                    {result.remnantLength}
                                </div>
                            </div>
                            
                            <div className="mt-3 flex flex-wrap gap-2">
                                {result.cuts.map((cut: any, cIdx: number) => (
                                    <span key={cIdx} className="text-[9px] font-bold bg-gray-100 px-2 py-1 uppercase">{cut.label}: {cut.length}mm</span>
                                ))}
                                <span className="text-[9px] font-bold bg-orange-100 px-2 py-1 uppercase text-orange-800">Sobrante: {result.remnantLength}mm</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-12 opacity-10 border-2 border-dashed border-[#141414]">
            <FileText size={64} className="mb-4" />
            <h4 className="font-bold uppercase tracking-widest italic">Selecciona un proyecto</h4>
            <p className="text-sm mt-2">Para visualizar el plan de corte detallado.</p>
          </div>
        )}
      </div>
    </div>
  );
}
