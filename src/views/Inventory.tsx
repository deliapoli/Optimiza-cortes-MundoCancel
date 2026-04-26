import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { db, auth } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  orderBy,
  where
} from 'firebase/firestore';
import { Plus, Trash2, Box, Info } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Inventory() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [stock, setStock] = useState<any[]>([]);
  const [isAddingProfile, setIsAddingProfile] = useState(false);
  const [isAddingStock, setIsAddingStock] = useState(false);

  // New Profile Form
  const [profileName, setProfileName] = useState('');
  const [profileSeries, setProfileSeries] = useState('');
  const [profileColor, setProfileColor] = useState('');

  // New Stock Form
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [stockLength, setStockLength] = useState('');
  const [stockQuantity, setStockQuantity] = useState('1');

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>, type: 'profiles' | 'stock') => {
    const file = event.target.files?.[0];
    if (!file || !auth.currentUser) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const rows = text.split('\n').filter(row => row.trim());
      
      // Basic CSV parsing (skip header if present)
      const dataRows = rows[0].toLowerCase().includes('name') || rows[0].toLowerCase().includes('perfil') 
        ? rows.slice(1) 
        : rows;

      try {
        if (type === 'profiles') {
          for (const row of dataRows) {
            const [name, series, color] = row.split(',').map(s => s?.trim());
            if (name && series) {
              await addDoc(collection(db, 'profiles'), {
                name,
                series,
                color: color || '',
                ownerId: auth.currentUser?.uid,
                createdAt: serverTimestamp(),
              });
            }
          }
        } else {
          for (const row of dataRows) {
            const [pName, length, qty] = row.split(',').map(s => s?.trim());
            const profile = profiles.find(p => p.name.toLowerCase() === pName?.toLowerCase());
            if (profile && length && qty) {
              await addDoc(collection(db, 'stock'), {
                profileId: profile.id,
                length: parseFloat(length),
                quantity: parseInt(qty),
                isRemnant: false,
                ownerId: auth.currentUser?.uid,
                createdAt: serverTimestamp(),
              });
            }
          }
        }
        alert('Importación completada con éxito.');
      } catch (err) {
        console.error("Error importing:", err);
        alert('Error al importar. Revisa el formato del archivo.');
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
  };

  useEffect(() => {
    if (!auth.currentUser) return;

    const qProfiles = query(
      collection(db, 'profiles'), 
      where('ownerId', '==', auth.currentUser.uid),
      orderBy('name')
    );
    const unsubscribeProfiles = onSnapshot(qProfiles, (snapshot) => {
      setProfiles(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qStock = query(
      collection(db, 'stock'), 
      where('ownerId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeStock = onSnapshot(qStock, (snapshot) => {
      setStock(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubscribeProfiles();
      unsubscribeStock();
    };
  }, []);

  const handleAddProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!profileName || !profileSeries) return;

    try {
      await addDoc(collection(db, 'profiles'), {
        name: profileName,
        series: profileSeries,
        color: profileColor,
        ownerId: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
      });
      setProfileName('');
      setProfileSeries('');
      setProfileColor('');
      setIsAddingProfile(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddStock = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedProfileId || !stockLength || !stockQuantity) return;

    try {
      await addDoc(collection(db, 'stock'), {
        profileId: selectedProfileId,
        length: parseFloat(stockLength),
        quantity: parseInt(stockQuantity),
        isRemnant: false,
        ownerId: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
      });
      setStockLength('');
      setStockQuantity('1');
      setIsAddingStock(false);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteItem = async (col: string, id: string) => {
    if (confirm('¿Estás seguro de eliminar este elemento?')) {
      await deleteDoc(doc(db, col, id));
    }
  };

  return (
    <div className="space-y-12">
      {/* Profiles Section */}
      <section>
        <div className="flex justify-between items-end mb-6 border-l-4 border-[#141414] pl-4">
          <div>
            <h3 className="text-xl font-bold uppercase tracking-tight italic">Tipos de Perfiles</h3>
            <p className="text-xs font-mono opacity-50 uppercase mt-1">Catálogo de materiales base</p>
          </div>
          <div className="flex gap-2">
            <label className="flex items-center gap-2 bg-white border border-[#141414] px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-gray-50 cursor-pointer shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
              <Plus size={16} />
              Importar CSV
              <input type="file" accept=".csv" className="hidden" onChange={(e) => handleFileUpload(e, 'profiles')} />
            </label>
            <button 
              onClick={() => setIsAddingProfile(!isAddingProfile)}
              className="flex items-center gap-2 bg-[#141414] text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:invert transition-all"
            >
              <Plus size={16} />
              {isAddingProfile ? 'Cerrar' : 'Nuevo Perfil'}
            </button>
          </div>
        </div>

        {isAddingProfile && (
          <form onSubmit={handleAddProfile} className="bg-white border border-[#141414] p-6 mb-8 shadow-[6px_6px_0px_0px_rgba(20,20,20,1)] grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-50">Nombre / Modelo</label>
              <input 
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full border-b border-[#141414] py-2 focus:outline-none focus:border-blue-500 font-bold"
                placeholder="Ej. Batiente 2.5''"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-50">Serie</label>
              <input 
                value={profileSeries}
                onChange={(e) => setProfileSeries(e.target.value)}
                className="w-full border-b border-[#141414] py-2 focus:outline-none focus:border-blue-500 font-bold"
                placeholder="Ej. Línea Española"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-50">Color / Acabado</label>
              <input 
                value={profileColor}
                onChange={(e) => setProfileColor(e.target.value)}
                className="w-full border-b border-[#141414] py-2 focus:outline-none focus:border-blue-500 font-bold"
                placeholder="Ej. Blanco Mate"
              />
            </div>
            <button type="submit" className="bg-[#141414] text-white py-3 font-bold uppercase text-[10px] tracking-widest hover:invert">
              Guardar Perfil
            </button>
          </form>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.map(p => (
            <div key={p.id} className="bg-white border border-[#141414] p-4 flex justify-between items-start hover:shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] transition-all">
              <div>
                <h4 className="font-bold uppercase tracking-tight truncate max-w-[180px]">{p.name}</h4>
                <p className="text-[10px] font-mono opacity-50 uppercase mt-1">{p.series} // {p.color || 'N/A'}</p>
              </div>
              <button onClick={() => deleteItem('profiles', p.id)} className="opacity-20 hover:opacity-100 text-red-600 transition-all p-1">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {profiles.length === 0 && !isAddingProfile && (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-[#141414]/10 opacity-30">
              <p className="font-mono text-xs uppercase font-bold">No hay perfiles registrados</p>
            </div>
          )}
        </div>
      </section>

      {/* Stock Section */}
      <section>
        <div className="flex justify-between items-end mb-6 border-l-4 border-blue-600 pl-4">
          <div>
            <h3 className="text-xl font-bold uppercase tracking-tight italic">Inventario de Stock</h3>
            <p className="text-xs font-mono opacity-50 uppercase mt-1">Material disponible para corte</p>
          </div>
          <div className="flex gap-2">
            <label className="flex items-center gap-2 bg-white border border-[#141414] px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-gray-50 cursor-pointer shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
              <Plus size={16} />
              Importar Stock CSV
              <input type="file" accept=".csv" className="hidden" onChange={(e) => handleFileUpload(e, 'stock')} />
            </label>
            <button 
                onClick={() => setIsAddingStock(!isAddingStock)}
                className="flex items-center gap-2 bg-[#141414] text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:invert transition-all"
            >
                <Plus size={16} />
                {isAddingStock ? 'Cerrar' : 'Agregar Material'}
            </button>
          </div>
        </div>

        {isAddingStock && (
          <form onSubmit={handleAddStock} className="bg-white border border-[#141414] p-6 mb-8 shadow-[6px_6px_0px_0px_rgba(20,20,20,1)] grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-50">Perfil</label>
              <select 
                value={selectedProfileId}
                onChange={(e) => setSelectedProfileId(e.target.value)}
                className="w-full border-b border-[#141414] py-2 focus:outline-none font-bold bg-transparent"
                required
              >
                <option value="">Seleccionar...</option>
                {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-50">Longitud (mm)</label>
              <input 
                type="number"
                value={stockLength}
                onChange={(e) => setStockLength(e.target.value)}
                className="w-full border-b border-[#141414] py-2 focus:outline-none font-bold"
                placeholder="6100"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-50">Cantidad</label>
              <input 
                type="number"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                className="w-full border-b border-[#141414] py-2 focus:outline-none font-bold"
                placeholder="10"
                required
              />
            </div>
            <button type="submit" className="bg-[#141414] text-white py-3 font-bold uppercase text-[10px] tracking-widest hover:invert">
              Añadir al Stock
            </button>
          </form>
        )}

        <div className="bg-white border border-[#141414] overflow-hidden shadow-[8px_8px_0px_0px_rgba(20,20,20,1)]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#141414] text-white text-[10px] font-mono uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4 border-r border-white/10">Perfil</th>
                <th className="px-6 py-4 border-r border-white/10">Longitud</th>
                <th className="px-6 py-4 border-r border-white/10">Cantidad</th>
                <th className="px-6 py-4 border-r border-white/10">Tipo</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-xs font-mono">
              {stock.map(s => {
                const profile = profiles.find(p => p.id === s.profileId);
                return (
                  <tr key={s.id} className="border-b border-[#141414]/10 hover:bg-[#F9F9F8]">
                    <td className="px-6 py-4 border-r border-[#141414]/10 font-bold uppercase">{profile?.name || '---'}</td>
                    <td className="px-6 py-4 border-r border-[#141414]/10">{s.length} mm</td>
                    <td className="px-6 py-4 border-r border-[#141414]/10">x{s.quantity}</td>
                    <td className="px-6 py-4 border-r border-[#141414]/10 uppercase text-[10px]">
                      {s.isRemnant ? (
                        <span className="bg-orange-100 text-orange-800 px-2 py-0.5 border border-orange-200">Remanente</span>
                      ) : (
                        <span className="bg-green-100 text-green-800 px-2 py-0.5 border border-green-200">Stock Nuevo</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => deleteItem('stock', s.id)} className="text-red-500 hover:text-red-700 opacity-30 hover:opacity-100">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {stock.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center opacity-30 italic">No hay stock disponible en el sistema</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
