import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Box, Cpu, Monitor, Network, HardHat, Package, Edit2, Search, X } from 'lucide-react';
import api from '../lib/api';
import { cn } from '../lib/utils';

interface Component {
    id: string;
    model: string;
    description: string;
    brand: string;
    listPrice: number;
    category: string;
    ioSpecs: any;
}

interface PackageItem {
    id?: string;
    catalogId: string;
    quantity: number;
    catalog?: Component;
}

interface HardwarePackage {
    id: string;
    name: string;
    description: string;
    items: PackageItem[];
}

const ComponentLibrary: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'components' | 'packages'>('components');
    const [components, setComponents] = useState<Component[]>([]);
    const [packages, setPackages] = useState<HardwarePackage[]>([]);
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

    // Package editing state
    const [isAddingPkg, setIsAddingPkg] = useState(false);
    const [editingPkgId, setEditingPkgId] = useState<string | null>(null);
    const [newPkg, setNewPkg] = useState({
        name: '',
        description: '',
        items: [] as PackageItem[]
    });
    const [pkgSearchTerm, setPkgSearchTerm] = useState('');

    const defaultCategories = ['PLC', 'HMI', 'NETWORK', 'SCADA', 'SITE', 'HARDWARE', 'ENGINEERING'];
    const [availableCategories, setAvailableCategories] = useState<string[]>(defaultCategories);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [compRes, pkgRes] = await Promise.all([
                api.get('/components'),
                api.get('/packages')
            ]);
            setComponents(compRes.data);
            setPackages(pkgRes.data);

            const uniqueCats = Array.from(new Set([
                ...defaultCategories,
                ...compRes.data.map((c: Component) => c.category)
            ])).filter(Boolean).sort();
            setAvailableCategories(uniqueCats);
        } catch (error) {
            console.error('Error fetching data', error);
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

    const filteredPackages = packages.filter(pkg =>
        pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pkg.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
            fetchData();
            setNewComp({
                model: '', description: '', brand: '', listPrice: 0, category: 'PLC',
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
            fetchData();
        } catch (error) {
            alert('Error deleting');
        }
    };

    // Package Handlers
    const handleEditPkg = (pkg: HardwarePackage) => {
        setEditingPkgId(pkg.id);
        setNewPkg({
            name: pkg.name,
            description: pkg.description || '',
            items: pkg.items.map(i => ({ catalogId: i.catalogId, quantity: i.quantity, catalog: i.catalog }))
        });
        setIsAddingPkg(true);
    };

    const handlePkgSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPkg.items.length === 0) {
            alert("Please add at least one component to the package.");
            return;
        }
        try {
            if (editingPkgId) {
                await api.put(`/packages/${editingPkgId}`, newPkg);
            } else {
                await api.post('/packages', newPkg);
            }
            setIsAddingPkg(false);
            setEditingPkgId(null);
            fetchData();
            setNewPkg({ name: '', description: '', items: [] });
        } catch (error) {
            alert('Error saving package');
        }
    };

    const deletePackage = async (id: string) => {
        if (!confirm('Delete this package?')) return;
        try {
            await api.delete(`/packages/${id}`);
            fetchData();
        } catch (error) {
            alert('Error deleting package');
        }
    };

    const addPkgItem = (comp: Component) => {
        const exists = newPkg.items.find(i => i.catalogId === comp.id);
        if (exists) {
            setNewPkg({
                ...newPkg,
                items: newPkg.items.map(i => i.catalogId === comp.id ? { ...i, quantity: i.quantity + 1 } : i)
            });
        } else {
            setNewPkg({
                ...newPkg,
                items: [...newPkg.items, { catalogId: comp.id, quantity: 1, catalog: comp }]
            });
        }
    };

    const removePkgItem = (catalogId: string) => {
        setNewPkg({
            ...newPkg,
            items: newPkg.items.filter(i => i.catalogId !== catalogId)
        });
    };

    const updatePkgItemQty = (catalogId: string, qty: number) => {
        if (qty < 1) return;
        setNewPkg({
            ...newPkg,
            items: newPkg.items.map(i => i.catalogId === catalogId ? { ...i, quantity: qty } : i)
        });
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
                    <p className="text-slate-500 mt-1">Manage global hardware catalog, pricing, and packages</p>
                </div>
                {activeTab === 'components' ? (
                    <button
                        onClick={() => {
                            setEditingId(null);
                            setNewComp({
                                model: '', brand: '', description: '', listPrice: 0, category: 'PLC',
                                ioSpecs: { DI: 0, DO: 0, AI: 0, AO: 0, RTD: 0, HLI: 0 }
                            });
                            setIsAdding(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-blue-200 transition-all"
                    >
                        <Plus size={18} />
                        Add Component
                    </button>
                ) : (
                    <button
                        onClick={() => {
                            setEditingPkgId(null);
                            setNewPkg({ name: '', description: '', items: [] });
                            setIsAddingPkg(true);
                        }}
                        className="bg-slate-900 hover:bg-black text-white px-6 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-lg transition-all"
                    >
                        <Plus size={18} />
                        Create Package
                    </button>
                )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
                <button
                    onClick={() => setActiveTab('components')}
                    className={cn("px-6 py-2 rounded-xl text-sm font-bold transition-all",
                        activeTab === 'components' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                >
                    Hardware Components
                </button>
                <button
                    onClick={() => setActiveTab('packages')}
                    className={cn("px-6 py-2 rounded-xl text-sm font-bold transition-all",
                        activeTab === 'packages' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                >
                    Hardware Packages
                </button>
            </div>

            {activeTab === 'components' && (
                <>
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center bg-white p-4 rounded-2xl border shadow-sm">
                        <div className="relative flex-1 w-full">
                            <input
                                type="text"
                                placeholder="Search by model, brand, or description..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-4 pr-10 py-2.5 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50/50"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Filter:</span>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
                            >
                                <option value="All">All Categories</option>
                                {availableCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div className="text-[10px] font-black text-slate-400 bg-slate-100 px-4 py-2.5 rounded-xl uppercase tracking-widest">
                            {filteredComponents.length} Items Found
                        </div>
                    </div>

                    {isAdding && (
                        <div className="bg-white p-8 rounded-[2.5rem] border-2 border-blue-100 shadow-xl animate-in fade-in zoom-in-95 duration-300">
                            <h3 className="text-xl font-black mb-6 uppercase tracking-tight">{editingId ? 'Edit Hardware Component' : 'New Hardware Component'}</h3>
                            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Model Number</label>
                                    <input required value={newComp.model} onChange={e => setNewComp({ ...newComp, model: e.target.value })} className="w-full border-slate-100 bg-slate-50/50 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Brand</label>
                                    <input required value={newComp.brand} onChange={e => setNewComp({ ...newComp, brand: e.target.value })} className="w-full border-slate-100 bg-slate-50/50 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold" />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Description</label>
                                    <input required value={newComp.description} onChange={e => setNewComp({ ...newComp, description: e.target.value })} className="w-full border-slate-100 bg-slate-50/50 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Category</label>
                                    <div className="flex gap-3">
                                        {!isAddingNewCategory ? (
                                            <>
                                                <select
                                                    value={newComp.category}
                                                    onChange={e => setNewComp({ ...newComp, category: e.target.value })}
                                                    className="w-full border-slate-100 bg-slate-50/50 rounded-xl px-4 py-3 font-bold outline-none"
                                                >
                                                    {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsAddingNewCategory(true)}
                                                    className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest"
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
                                                    className="w-full border-slate-100 bg-slate-50/50 rounded-xl px-4 py-3 font-bold"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => { setIsAddingNewCategory(false); setNewCategoryName(''); }}
                                                    className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest"
                                                >
                                                    Cancel
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">List Price (RM)</label>
                                    <input type="number" step="0.01" required value={newComp.listPrice} onChange={e => setNewComp({ ...newComp, listPrice: parseFloat(e.target.value) })} className="w-full border-slate-100 bg-slate-50/50 rounded-xl px-4 py-3 font-bold" />
                                </div>

                                {newComp.category === 'PLC' && (
                                    <div className="md:col-span-2 border-t border-slate-100 pt-6 mt-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 block">Hardware IO Specifications</label>
                                        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                                            {['DI', 'DO', 'AI', 'AO', 'RTD', 'HLI'].map(io => (
                                                <div key={io}>
                                                    <label className="text-[9px] font-black uppercase tracking-widest block mb-2 text-slate-500 text-center">{io}</label>
                                                    <input
                                                        type="number"
                                                        value={(newComp.ioSpecs as any)[io]}
                                                        onChange={e => setNewComp({ ...newComp, ioSpecs: { ...newComp.ioSpecs, [io]: parseInt(e.target.value) || 0 } })}
                                                        className="w-full border-slate-100 bg-slate-50/50 rounded-lg px-2 py-2 text-xs text-center font-bold"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="md:col-span-2 flex justify-end gap-3 mt-6">
                                    <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl">Cancel</button>
                                    <button type="submit" className="px-10 py-3 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest shadow-lg shadow-blue-100">
                                        {editingId ? 'Update Component' : 'Save Component'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Model</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Brand</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Price</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredComponents.map((comp) => (
                                    <tr key={comp.id} className="hover:bg-slate-50/30 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="font-black text-slate-900 uppercase tracking-tight">{comp.model}</div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{comp.description}</div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3 text-xs font-black text-slate-600 uppercase tracking-widest">
                                                <span className="p-2 bg-white border border-slate-100 rounded-xl shadow-sm group-hover:border-blue-100 transition-colors">
                                                    {getCategoryIcon(comp.category)}
                                                </span>
                                                {comp.category}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest">{comp.brand}</td>
                                        <td className="px-8 py-5 text-sm font-black text-slate-900">RM{comp.listPrice.toLocaleString()}</td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex justify-end gap-3">
                                                <button
                                                    onClick={() => handleEdit(comp)}
                                                    className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => deleteComponent(comp.id)}
                                                    className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredComponents.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-20 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest">
                                            No components match your search...
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {activeTab === 'packages' && (
                <>
                    {isAddingPkg && (
                        <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-900 shadow-xl animate-in fade-in zoom-in-95 duration-300">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-xl font-black uppercase tracking-tight">{editingPkgId ? 'Edit Package' : 'Create New Hardware Package'}</h3>
                                <button onClick={() => setIsAddingPkg(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={24} /></button>
                            </div>
                            <form onSubmit={handlePkgSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Package Name</label>
                                        <input required placeholder="e.g. CCR Standard Setup" value={newPkg.name} onChange={e => setNewPkg({ ...newPkg, name: e.target.value })} className="w-full border-slate-100 bg-slate-50/50 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-slate-900 transition-all font-bold" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Description</label>
                                        <textarea value={newPkg.description} onChange={e => setNewPkg({ ...newPkg, description: e.target.value })} className="w-full border-slate-100 bg-slate-50/50 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-slate-900 transition-all font-bold min-h-[100px]" />
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">Package Contents ({newPkg.items.length})</h4>
                                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                            {newPkg.items.map(item => (
                                                <div key={item.catalogId} className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                    <div className="flex-1">
                                                        <div className="text-[10px] font-black text-slate-900 uppercase">{item.catalog?.model}</div>
                                                        <div className="text-[8px] font-bold text-slate-400 uppercase">{item.catalog?.brand}</div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex items-center gap-2 bg-white rounded-lg border p-1">
                                                            <button type="button" onClick={() => updatePkgItemQty(item.catalogId, item.quantity - 1)} className="px-2 font-bold">-</button>
                                                            <span className="w-6 text-center text-xs font-black">{item.quantity}</span>
                                                            <button type="button" onClick={() => updatePkgItemQty(item.catalogId, item.quantity + 1)} className="px-2 font-bold">+</button>
                                                        </div>
                                                        <button type="button" onClick={() => removePkgItem(item.catalogId)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={16} /></button>
                                                    </div>
                                                </div>
                                            ))}
                                            {newPkg.items.length === 0 && <div className="text-center py-10 text-[10px] font-black text-slate-300 uppercase tracking-widest border-2 border-dashed border-slate-100 rounded-2xl">No items added yet</div>}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6 flex flex-col h-full">
                                    <div className="relative">
                                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search components to add..."
                                            value={pkgSearchTerm}
                                            onChange={(e) => setPkgSearchTerm(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3 border-slate-100 bg-slate-50/50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                                        />
                                    </div>
                                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                                        {components.filter(c => c.model.toLowerCase().includes(pkgSearchTerm.toLowerCase()) || c.brand.toLowerCase().includes(pkgSearchTerm.toLowerCase())).map(comp => (
                                            <div key={comp.id} className="p-4 border border-slate-50 rounded-2xl hover:border-blue-200 hover:bg-blue-50/20 transition-all group cursor-pointer" onClick={() => addPkgItem(comp)}>
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <div className="text-[10px] font-black text-slate-900 uppercase group-hover:text-blue-600">{comp.model}</div>
                                                        <div className="text-[8px] font-bold text-slate-400 uppercase">{comp.brand} • {comp.category}</div>
                                                    </div>
                                                    <Plus size={16} className="text-slate-300 group-hover:text-blue-600" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all">
                                        {editingPkgId ? 'Update Package' : 'Save Package'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredPackages.map(pkg => (
                            <div key={pkg.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-lg transition-all group flex flex-col h-full">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-slate-900 rounded-2xl text-white shadow-lg shadow-slate-200">
                                        <Package size={24} />
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleEditPkg(pkg)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit2 size={18} /></button>
                                        <button onClick={() => deletePackage(pkg.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                                    </div>
                                </div>
                                <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">{pkg.name}</h4>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6 flex-1">{pkg.description || 'No description provided.'}</p>
                                
                                <div className="space-y-2 pt-4 border-t border-slate-50">
                                    <div className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-3">Package Contents</div>
                                    {pkg.items.slice(0, 3).map(item => (
                                        <div key={item.id} className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                                            <span>{item.catalog?.model}</span>
                                            <span>x{item.quantity}</span>
                                        </div>
                                    ))}
                                    {pkg.items.length > 3 && <div className="text-[9px] font-black text-blue-600 uppercase mt-2">+{pkg.items.length - 3} More Items</div>}
                                </div>
                            </div>
                        ))}
                        {filteredPackages.length === 0 && (
                            <div className="col-span-full py-20 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest border-2 border-dashed border-slate-100 rounded-[2.5rem]">
                                No hardware packages found...
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default ComponentLibrary;
