import { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy,
  addDoc,
  serverTimestamp,
  where
} from 'firebase/firestore';
import { Plus, Trash2, Scissors, Calculator, ChevronRight, Save, Layout, Download, Printer } from 'lucide-react';
import { cn } from '../lib/utils';
import { optimizeCuts, DemandPiece, StockPiece, OptimizedSolution } from '../lib/optimizer';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

export default function Optimizer() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [stock, setStock] = useState<any[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [bladeWidth, setBladeWidth] = useState('4');
  
  // Demands for current session
  const [demands, setDemands] = useState<DemandPiece[]>([]);
  const [newLength, setNewLength] = useState('');
  const [newQty, setNewQty] = useState('1');
  const [newLabel, setNewLabel] = useState('');

  // Results
  const [solution, setSolution] = useState<OptimizedSolution | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const qProfiles = query(
        collection(db, 'profiles'), 
        where('ownerId', '==', auth.currentUser.uid),
        orderBy('name')
    );
    const unsubscribeProfiles = onSnapshot(qProfiles, (snapshot) => {
      setProfiles(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'profiles'));

    const qStock = query(
        collection(db, 'stock'),
        where('ownerId', '==', auth.currentUser.uid)
    );
    const unsubscribeStock = onSnapshot(qStock, (snapshot) => {
      setStock(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'stock'));

    return () => {
      unsubscribeProfiles();
      unsubscribeStock();
    };
  }, []);

  const addDemand = () => {
    if (!newLength || !newQty) return;
    const qty = parseInt(newQty);
    const newDemands = [...demands];
    for (let i = 0; i < qty; i++) {
      newDemands.push({
        id: Math.random().toString(36).substr(2, 9),
        length: parseFloat(newLength),
        label: newLabel || `Corte ${demands.length + 1 + i}`
      });
    }
    setDemands(newDemands);
    setNewLength('');
    setNewQty('1');
    setNewLabel('');
  };

  const removeDemand = (id: string) => {
    setDemands(demands.filter(d => d.id !== id));
  };

  const handleOptimize = () => {
    if (!selectedProfileId || demands.length === 0) return;
    
    // Filter stock for selected profile
    const availableStock: StockPiece[] = stock
      .filter(s => s.profileId === selectedProfileId)
      .flatMap(s => {
        const pieces = [];
        for (let i = 0; i < s.quantity; i++) {
          pieces.push({ id: `${s.id}-${i}`, length: s.length });
        }
        return pieces;
      });

    if (availableStock.length === 0) {
      alert("No hay stock disponible para este perfil.");
      return;
    }

    const res = optimizeCuts(availableStock, demands, parseFloat(bladeWidth));
    setSolution(res);
  };

  const exportToCSV = () => {
    if (!solution) return;
    
    let csv = "Stock ID,Stock Length,Cut Label,Cut Length,Remnant\n";
    solution.bins.forEach(bin => {
      bin.cuts.forEach(cut => {
        csv += `${bin.stockId},${bin.stockLength},${cut.label},${cut.length},${bin.remnant}\n`;
      });
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `Plan_Corte_${projectName || 'Sin_Nombre'}.csv`);
    a.click();
  };

  const handlePrint = () => {
    window.print();
  };

  const saveProject = async () => {
    if (!solution || !projectName || !auth.currentUser) return;
    
    try {
      const jobRef = await addDoc(collection(db, 'jobs'), {
        name: projectName,
        profileId: selectedProfileId,
        bladeWidth: parseFloat(bladeWidth),
        totalWaste: solution.totalWaste,
        utilization: solution.utilization,
        status: 'completed',
        ownerId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      });

      // Save results
      for (const bin of solution.bins) {
        const path = `jobs/${jobRef.id}/results`;
        try {
            await addDoc(collection(db, path), {
                stockId: bin.stockId,
                stockLength: bin.stockLength,
                cuts: bin.cuts,
                remnantLength: bin.remnant,
                ownerId: auth.currentUser.uid,
                createdAt: serverTimestamp(),
            });
        } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, path);
        }
      }

      alert("Proyecto guardado con éxito.");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'jobs');
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
      {/* Input Section */}
      <div className="xl:col-span-4 space-y-8 print:hidden">
        <div className="bg-white border border-[#141414] p-6 shadow-[6px_6px_0px_0px_rgba(20,20,20,1)]">
          <h3 className="font-bold uppercase tracking-widest text-xs mb-6 flex items-center gap-2 border-b border-[#141414] pb-2">
            <Layout size={14} /> Configuración del Proyecto
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase opacity-50 block mb-1">Nombre del Proyecto</label>
              <input 
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Ej. Ventanas Residencia Ortiz"
                className="w-full border-b border-[#141414] py-2 focus:outline-none font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase opacity-50 block mb-1">Perfil a Utilizar</label>
              <select 
                value={selectedProfileId}
                onChange={(e) => {
                  setSelectedProfileId(e.target.value);
                  setSolution(null);
                }}
                className="w-full border-b border-[#141414] py-2 focus:outline-none font-bold bg-transparent"
              >
                <option value="">Seleccionar Perfil...</option>
                {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase opacity-50 block mb-1">Espesor de Corte (mm)</label>
              <input 
                type="number"
                value={bladeWidth}
                onChange={(e) => setBladeWidth(e.target.value)}
                className="w-full border-b border-[#141414] py-2 focus:outline-none font-bold"
              />
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#141414] p-6 shadow-[6px_6px_0px_0px_rgba(20,20,20,1)]">
          <h3 className="font-bold uppercase tracking-widest text-xs mb-6 flex items-center gap-2 border-b border-[#141414] pb-2">
            <Plus size={14} /> Requerimientos de Corte
          </h3>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="col-span-2">
              <label className="text-[10px] font-bold uppercase opacity-50 block mb-1">Longitud (mm)</label>
              <input 
                type="number"
                value={newLength}
                onChange={(e) => setNewLength(e.target.value)}
                placeholder="1200"
                className="w-full border-b border-[#141414] py-2 focus:outline-none font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase opacity-50 block mb-1">Cant.</label>
              <input 
                type="number"
                value={newQty}
                onChange={(e) => setNewQty(e.target.value)}
                className="w-full border-b border-[#141414] py-2 focus:outline-none font-bold"
              />
            </div>
            <div className="col-span-3">
              <label className="text-[10px] font-bold uppercase opacity-50 block mb-1">Etiqueta (opcional)</label>
              <input 
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Marco Sup."
                className="w-full border-b border-[#141414] py-2 focus:outline-none font-bold"
              />
            </div>
          </div>
          <button 
            onClick={addDemand}
            className="w-full py-3 bg-[#141414] text-white font-bold uppercase text-[10px] tracking-widest hover:invert transition-all"
          >
            Añadir a la Lista
          </button>
        </div>

        <div className="bg-white border border-[#141414] shadow-[6px_6px_0px_0px_rgba(20,20,20,1)] max-h-[400px] overflow-y-auto">
          <div className="sticky top-0 bg-[#141414] text-white p-3 text-[10px] font-bold uppercase tracking-widest flex justify-between">
            <span>Lista de Cortes ({demands.length})</span>
            <button onClick={() => setDemands([])} className="hover:underline">Limpiar Todo</button>
          </div>
          <div className="divide-y divide-[#141414]/10">
            {demands.map((d, idx) => (
              <div key={d.id} className="p-3 flex justify-between items-center hover:bg-gray-50">
                <div>
                  <span className="text-[10px] font-mono opacity-40 mr-2">#{(idx + 1).toString().padStart(2, '0')}</span>
                  <span className="font-bold text-sm">{d.length}mm</span>
                  <span className="text-[10px] uppercase opacity-60 ml-2 italic">{d.label}</span>
                </div>
                <button onClick={() => removeDemand(d.id)} className="text-red-500 opacity-30 hover:opacity-100">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {demands.length === 0 && (
              <div className="p-12 text-center opacity-20 italic text-xs">Lista vacía</div>
            )}
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="xl:col-span-8 space-y-8">
        {solution && (
          <div className="flex gap-4 print:hidden">
              <button 
                  onClick={handleOptimize}
                  disabled={!selectedProfileId || demands.length === 0}
                  className="flex-1 py-4 bg-blue-600 text-white font-bold uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-blue-700 disabled:opacity-30 transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)]"
              >
                  <Calculator size={20} /> Recalcular
              </button>
              <button 
                  onClick={exportToCSV}
                  className="py-4 px-6 border-2 border-[#141414] font-bold uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-[#141414] hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
              >
                  <Download size={20} /> CSV
              </button>
              <button 
                  onClick={handlePrint}
                  className="py-4 px-6 border-2 border-[#141414] font-bold uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-[#141414] hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
              >
                  <Layout size={20} /> Imprimir
              </button>
              <button 
                  onClick={saveProject}
                  className="py-4 px-8 bg-[#141414] text-white font-bold uppercase tracking-widest flex items-center justify-center gap-3 hover:invert transition-all shadow-[6px_6px_0px_0px_rgba(20,20,20,1)]"
              >
                  <Save size={20} /> Guardar
              </button>
          </div>
        )}

        {!solution && (
          <button 
              onClick={handleOptimize}
              disabled={!selectedProfileId || demands.length === 0}
              className="w-full py-4 bg-blue-600 text-white font-bold uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-blue-700 disabled:opacity-30 transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)]"
          >
              <Calculator size={20} /> Calcular Optimización
          </button>
        )}

        {solution ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-[#141414] p-6 shadow-[6px_6px_0px_0px_rgba(20,20,20,1)]">
                    <p className="text-[10px] font-bold uppercase opacity-40 mb-2">Piezas de Stock</p>
                    <p className="text-3xl font-bold tracking-tighter italic">{solution.bins.length}</p>
                </div>
                <div className="bg-white border border-[#141414] p-6 shadow-[6px_6px_0px_0px_rgba(20,20,20,1)]">
                    <p className="text-[10px] font-bold uppercase opacity-40 mb-2">Aprovechamiento</p>
                    <p className="text-3xl font-bold tracking-tighter italic">{solution.utilization.toFixed(1)}%</p>
                </div>
                <div className="bg-white border border-[#141414] p-6 shadow-[6px_6px_0px_0px_rgba(20,20,20,1)]">
                    <p className="text-[10px] font-bold uppercase opacity-40 mb-2">Desperdicio Total</p>
                    <p className="text-3xl font-bold tracking-tighter italic">{(solution.totalWaste / 1000).toFixed(2)}m</p>
                </div>
            </div>

            <div className="space-y-6">
                <h3 className="font-bold uppercase tracking-tight italic border-l-4 border-orange-500 pl-4">Plan de Corte Detallado</h3>
                {solution.bins.map((bin, bIdx) => (
                    <div key={bIdx} className="bg-white border border-[#141414] p-6 shadow-[6px_6px_0px_0px_rgba(20,20,20,1)]">
                        <div className="flex justify-between items-end mb-4">
                            <div>
                                <span className="text-[10px] font-mono opacity-40 uppercase">Stock Piece #{bIdx + 1}</span>
                                <h4 className="font-bold text-lg">Perfil {bin.stockLength}mm</h4>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] font-mono opacity-40 uppercase">Remanente</span>
                                <p className="font-bold font-mono">{bin.remnant}mm</p>
                            </div>
                        </div>

                        {/* Visual Bar */}
                        <div className="h-10 w-full bg-gray-100 border border-[#141414] flex overflow-hidden font-mono text-[9px] font-bold">
                            {bin.cuts.map((cut, cIdx) => {
                                const widthPercent = (cut.length / bin.stockLength) * 100;
                                const kerfPercent = (parseFloat(bladeWidth) / bin.stockLength) * 100;
                                return (
                                    <div key={cIdx} className="h-full flex shrink-0" style={{ width: `${widthPercent + kerfPercent}%` }}>
                                        <div 
                                            className="h-full bg-blue-500/20 border-r border-[#141414] flex items-center justify-center truncate px-1"
                                            style={{ width: `${(cut.length / (cut.length + parseFloat(bladeWidth))) * 100}%` }}
                                        >
                                            {cut.length}
                                        </div>
                                        <div className="h-full bg-red-500" style={{ width: `${(parseFloat(bladeWidth) / (cut.length + parseFloat(bladeWidth))) * 100}%` }} title="Kerf" />
                                    </div>
                                );
                            })}
                            <div className="h-full bg-orange-100 flex items-center justify-center opacity-60 border-l border-[#141414] border-dashed flex-1">
                                {bin.remnant}
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                             {bin.cuts.map((cut, cIdx) => (
                                 <div key={cIdx} className="bg-[#F0F0EE] p-2 flex items-center gap-2">
                                     <div className="w-2 h-2 bg-blue-500" />
                                     <span className="text-[10px] font-bold">{cut.label}: {cut.length}mm</span>
                                 </div>
                             ))}
                             <div className="bg-orange-50 p-2 flex items-center gap-2">
                                 <div className="w-2 h-2 bg-orange-500" />
                                 <span className="text-[10px] font-bold">Rem: {bin.remnant}mm</span>
                             </div>
                        </div>
                    </div>
                ))}
            </div>
          </div>
        ) : (
          <div className="h-[600px] bg-white border border-[#141414]/10 border-dashed flex flex-col items-center justify-center text-center p-12 opacity-30">
            <Calculator size={64} className="mb-4" />
            <h4 className="font-bold uppercase tracking-widest">Esperando Parámetros</h4>
            <p className="text-sm mt-2">Configura el proyecto y añade cortes para generar el plan óptimo.</p>
          </div>
        )}
      </div>
    </div>
  );
}
