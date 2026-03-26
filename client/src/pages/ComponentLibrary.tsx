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
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    const [newComp, setNewComp] = useState({
        model: '',
        description: '',
        brand: '',
        listPrice: 0,
        category: 'PLC',
        ioSpecs: { DI: 0, DO: 0, AI: 0, AO: 0, RTD: 0, HLI: 0 }
    });

    const defaultCategories = ['PLC', 'HMI', 'NETWORK', 'SCADA', 'SITE', 'HARDWARE', 'ENGINEERING'];
    const [availableCategories, setAvailableCategories] = useState<string[]>(defaultCategories);

    useEffect(() => {
        fetchComponents();
    }, []);

    const fetchComponents = async () => {
        try {
            const res = await api.get('/components');
            setComponents(res.data);

            // Extract unique categories and merge with defaults
            const uniqueCats = Array.from(new Set([
                ...defaultCategories,
                ...res.data.map((c: Component) => c.category)
            ])).filter(Boolean).sort();
            setAvailableCategories(uniqueCats);
        } catch (error) {
            console.error('Error fetching components', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredComponents = components.filter(comp => {
        const matchesSearch =
            comp.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
            comp.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
            comp.description.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCategory = selectedCategory === 'All' || comp.category === selectedCategory;

        return matchesSearch && matchesCategory;
    });

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
            const finalComp = { ...newComp };
            if (isAddingNewCategory && newCategoryName.trim()) {
                finalComp.category = newCategoryName.trim();
            }

            if (editingId) {
                await api.put(`/components/${editingId}`, finalComp);
            } else {
                await api.post('/components', finalComp);
            }
            setIsAdding(false);
            setEditingId(null);
            setIsAddingNewCategory(false);
            setNewCategoryName('');
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

            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center bg-white p-4 rounded-xl border shadow-sm">
                <div className="relative flex-1 w-full">
                    <input
                        type="text"
                        placeholder="Search by model, brand, or description..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-4 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Filter:</span>
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="border rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
                    >
                        <option value="All">All Categories</option>
                        {availableCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
                <div className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-2 rounded-lg">
                    {filteredComponents.length} {filteredComponents.length === 1 ? 'Item' : 'Items'} Found
                </div>
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
                            <div className="flex gap-2">
                                {!isAddingNewCategory ? (
                                    <>
                                        <select
                                            value={newComp.category}
                                            onChange={e => setNewComp({ ...newComp, category: e.target.value })}
                                            className="w-full border rounded-md px-3 py-2"
                                        >
                                            {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => setIsAddingNewCategory(true)}
                                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-xs font-bold whitespace-nowrap"
                                        >
                                            + New
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <input
                                            autoFocus
                                            placeholder="Enter category name..."
                                            value={newCategoryName}
                                            onChange={e => setNewCategoryName(e.target.value)}
                                            className="w-full border rounded-md px-3 py-2"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsAddingNewCategory(false);
                                                setNewCategoryName('');
                                            }}
                                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-xs font-bold"
                                        >
                                            Cancel
                                        </button>
                                    </>
                                )}
                            </div>
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
                            {filteredComponents.map((comp) => (
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
                            {filteredComponents.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                                        {components.length === 0 ? 'Catalog is empty. Add components to begin.' : 'No components match your search/filter.'}
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
