import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Box, Cpu, Monitor, Network, HardHat } from 'lucide-react';
import api from '../lib/api';

interface Component {
    id: string;
    model: string;
    description: string;
    brand: string;
    listPrice: number;
    category: string;
    ioSpecs: any;
}

const ComponentLibrary: React.FC = () => {
    const [components, setComponents] = useState<Component[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newComp, setNewComp] = useState({
        model: '',
        description: '',
        brand: '',
        listPrice: 0,
        category: 'PLC',
        ioSpecs: { DI: 0, DO: 0, AI: 0, AO: 0, RTD: 0, HLI: 0 }
    });

    const categories = ['PLC', 'HMI', 'NETWORK', 'SCADA', 'SITE', 'HARDWARE', 'ENGINEERING'];

    useEffect(() => {
        fetchComponents();
    }, []);

    const fetchComponents = async () => {
        try {
            const res = await api.get('/components');
            setComponents(res.data);
        } catch (error) {
            console.error('Error fetching components', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (comp: Component) => {
        setEditingId(comp.id);
        setNewComp({
            model: comp.model,
            description: comp.description,
            brand: comp.brand,
            listPrice: comp.listPrice,
            category: comp.category,
            ioSpecs: comp.ioSpecs || { DI: 0, DO: 0, AI: 0, AO: 0, RTD: 0, HLI: 0 }
        });
        setIsAdding(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`/components/${editingId}`, newComp);
            } else {
                await api.post('/components', newComp);
            }
            setIsAdding(false);
            setEditingId(null);
            fetchComponents();
            setNewComp({
                model: '',
                description: '',
                brand: '',
                listPrice: 0,
                category: 'PLC',
                ioSpecs: { DI: 0, DO: 0, AI: 0, AO: 0, RTD: 0, HLI: 0 }
            });
        } catch (error) {
            alert('Error saving component');
        }
    };

    const deleteComponent = async (id: string) => {
        if (!confirm('Delete this component?')) return;
        try {
            await api.delete(`/components/${id}`);
            fetchComponents();
        } catch (error) {
            alert('Error deleting');
        }
    };

    const getCategoryIcon = (cat: string) => {
        switch (cat) {
            case 'PLC': return <Cpu size={20} />;
            case 'HMI': case 'SCADA': return <Monitor size={20} />;
            case 'NETWORK': return <Network size={20} />;
            case 'SITE': case 'ENGINEERING': return <HardHat size={20} />;
            case 'HARDWARE': return <Box size={20} />;
            default: return <Box size={20} />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900">Component Library</h2>
                    <p className="text-slate-500 mt-1">Manage global hardware catalog and pricing</p>
                </div>
                <button
                    onClick={() => {
                        setEditingId(null);
                        setNewComp({
                            model: '',
                            description: '',
                            brand: '',
                            listPrice: 0,
                            category: 'PLC',
                            ioSpecs: { DI: 0, DO: 0, AI: 0, AO: 0, RTD: 0, HLI: 0 }
                        });
                        setIsAdding(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium"
                >
                    <Plus size={18} />
                    Add Component
                </button>
            </div>

            {isAdding && (
                <div className="bg-white p-6 rounded-xl border border-blue-200 shadow-lg animate-in fade-in zoom-in duration-200">
                    <h3 className="text-lg font-bold mb-4">{editingId ? 'Edit Hardware Component' : 'New Hardware Component'}</h3>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Model Number</label>
                            <input required value={newComp.model} onChange={e => setNewComp({ ...newComp, model: e.target.value })} className="w-full border rounded-md px-3 py-2" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Brand</label>
                            <input required value={newComp.brand} onChange={e => setNewComp({ ...newComp, brand: e.target.value })} className="w-full border rounded-md px-3 py-2" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium">Description</label>
                            <input required value={newComp.description} onChange={e => setNewComp({ ...newComp, description: e.target.value })} className="w-full border rounded-md px-3 py-2" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Category</label>
                            <select value={newComp.category} onChange={e => setNewComp({ ...newComp, category: e.target.value })} className="w-full border rounded-md px-3 py-2">
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">List Price (RM)</label>
                            <input type="number" step="0.01" required value={newComp.listPrice} onChange={e => setNewComp({ ...newComp, listPrice: parseFloat(e.target.value) })} className="w-full border rounded-md px-3 py-2" />
                        </div>

                        {newComp.category === 'PLC' && (
                            <div className="md:col-span-2 border-t pt-4 mt-2">
                                <label className="text-xs font-bold uppercase text-slate-500 mb-2 block">Available IO Specs</label>
                                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                                    {['DI', 'DO', 'AI', 'AO', 'RTD', 'HLI'].map(io => (
                                        <div key={io}>
                                            <label className="text-[10px] font-bold block mb-1">{io}</label>
                                            <input
                                                type="number"
                                                value={(newComp.ioSpecs as any)[io]}
                                                onChange={e => setNewComp({ ...newComp, ioSpecs: { ...newComp.ioSpecs, [io]: parseInt(e.target.value) || 0 } })}
                                                className="w-full border rounded px-2 py-1 text-sm text-center"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                            <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md">Cancel</button>
                            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-md font-medium">
                                {editingId ? 'Update Component' : 'Save Component'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="p-12 text-center text-slate-400">Loading library...</div>
            ) : (
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b">
                            <tr>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Model</th>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Category</th>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Brand</th>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Price</th>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {components.map((comp) => (
                                <tr key={comp.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-slate-900">{comp.model}</div>
                                        <div className="text-xs text-slate-500">{comp.description}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <span className="p-1.5 bg-slate-100 rounded-md group-hover:bg-white transition-colors">
                                                {getCategoryIcon(comp.category)}
                                            </span>
                                            {comp.category}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{comp.brand}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-slate-900">RM{comp.listPrice.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(comp)}
                                                className="text-blue-600 hover:text-blue-800 font-medium text-sm px-2 py-1"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => deleteComponent(comp.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {components.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                                        Catalog is empty. Add components to begin.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ComponentLibrary;
