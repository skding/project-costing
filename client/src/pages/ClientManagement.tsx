import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Users, Building, Edit2, Search } from 'lucide-react';
import api from '../lib/api';

interface Client {
    id: string;
    name: string;
    company: string | null;
    createdAt: string;
    _count?: {
        projects: number;
    };
}

const ClientManagement: React.FC = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        company: ''
    });

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            const res = await api.get('/clients');
            setClients(res.data);
        } catch (error) {
            console.error('Error fetching clients', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingClient) {
                await api.put(`/clients/${editingClient.id}`, formData);
            } else {
                await api.post('/clients', formData);
            }
            setIsModalOpen(false);
            fetchClients();
            setFormData({ name: '', company: '' });
            setEditingClient(null);
        } catch (error) {
            alert('Error saving client');
        }
    };

    const deleteClient = async (id: string, projectCount: number) => {
        if (projectCount > 0) {
            alert(`Cannot delete client with ${projectCount} active projects. Reassign projects first.`);
            return;
        }
        if (!confirm('Are you sure you want to delete this client?')) return;
        try {
            await api.delete(`/clients/${id}`);
            fetchClients();
        } catch (error) {
            alert('Error deleting client');
        }
    };

    const openEdit = (client: Client) => {
        setEditingClient(client);
        setFormData({
            name: client.name,
            company: client.company || ''
        });
        setIsModalOpen(true);
    };

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.company || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">Client Directory</h2>
                    <p className="text-slate-500 mt-2 font-medium">Manage your customer relationships and project assignments</p>
                </div>
                <button
                    onClick={() => {
                        setEditingClient(null);
                        setFormData({ name: '', company: '' });
                        setIsModalOpen(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-bold transition-all shadow-lg shadow-blue-100 active:scale-95"
                >
                    <Plus size={20} />
                    Register Client
                </button>
            </div>

            {/* Search and Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                    <Search size={20} className="text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by name, company..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 bg-transparent border-none outline-none text-slate-700 font-medium"
                    />
                </div>
                <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-lg flex flex-col justify-center items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Clients</span>
                    <span className="text-2xl font-black">{clients.length}</span>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20 text-slate-400 font-bold animate-pulse">Loading directory...</div>
            ) : filteredClients.length === 0 ? (
                <div className="text-center py-32 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
                    <Users size={64} className="mx-auto text-slate-200 mb-6" />
                    <h3 className="text-xl font-black text-slate-900">No clients registered</h3>
                    <p className="text-slate-500 mt-2">Get started by onboarding your first partner.</p>
                </div>
            ) : (
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Client Identity</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Affiliation</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Portfolio</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredClients.map((client) => (
                                <tr key={client.id} className="hover:bg-blue-50/30 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                <Users size={18} />
                                            </div>
                                            <div>
                                                <div className="font-black text-slate-900">{client.name}</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registered {new Date(client.createdAt).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2 text-slate-600 font-bold">
                                            <Building size={14} className="text-slate-300" />
                                            <span>{client.company || 'Private Entity'}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <span className="inline-block px-4 py-1.5 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest">
                                            {client._count?.projects || 0} Projects
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => openEdit(client)}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                title="Edit Details"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => deleteClient(client.id, client._count?.projects || 0)}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                title="Remove Client"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 animate-in zoom-in-95 duration-200">
                        <h3 className="text-3xl font-black text-slate-900 mb-8 tracking-tight">
                            {editingClient ? 'Update Profile' : 'New Client'}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Contact Person</label>
                                <input
                                    required
                                    autoFocus
                                    type="text"
                                    placeholder="Full Name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-100 focus:bg-white rounded-2xl px-5 py-4 outline-none font-bold text-slate-900 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Organization / Company</label>
                                <input
                                    type="text"
                                    placeholder="Company Legal Name"
                                    value={formData.company}
                                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                    className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-100 focus:bg-white rounded-2xl px-5 py-4 outline-none font-bold text-slate-900 transition-all"
                                />
                            </div>
                            <div className="flex gap-4 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-blue-600 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                                >
                                    {editingClient ? 'Save Changes' : 'Confirm Registration'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientManagement;
