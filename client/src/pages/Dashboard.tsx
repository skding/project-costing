import React, { useEffect, useState } from 'react';
import { Plus, FolderOpen, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../lib/api';

interface Client {
    id: string;
    name: string;
}

interface Project {
    id: string;
    name: string;
    location: string | null;
    client: Client | null;
    updatedAt: string;
    versions: { versionNumber: number; id: string; status: string }[];
}

const Dashboard: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClientFilter, setSelectedClientFilter] = useState<string>('all');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectClientId, setNewProjectClientId] = useState('');
    const [newProjectLocation, setNewProjectLocation] = useState('');

    useEffect(() => {
        fetchProjects();
        fetchClients();
    }, []);

    const fetchProjects = async () => {
        try {
            const response = await api.get('/projects');
            setProjects(response.data);
        } catch (error) {
            console.error('Failed to fetch projects', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchClients = async () => {
        try {
            const response = await api.get('/clients');
            setClients(response.data);
        } catch (error) {
            console.error('Failed to fetch clients', error);
        }
    };

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProjectName) return;

        let clientId = newProjectClientId;
        if (clientId === 'new') {
            const clientName = prompt('Enter New Client Name:');
            if (!clientName) return;
            try {
                const res = await api.post('/clients', { name: clientName });
                clientId = res.data.id;
                fetchClients();
            } catch (error) {
                alert('Failed to create client');
                return;
            }
        }

        try {
            await api.post('/projects', {
                name: newProjectName,
                clientId: clientId || null,
                location: newProjectLocation
            });
            setIsCreateModalOpen(false);
            setNewProjectName('');
            setNewProjectClientId('');
            setNewProjectLocation('');
            fetchProjects();
        } catch (error) {
            alert('Failed to create project');
        }
    };

    const filteredProjects = projects.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.client?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesClient = selectedClientFilter === 'all' || p.client?.id === selectedClientFilter;
        return matchesSearch && matchesClient;
    });

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">Projects</h2>
                    <p className="text-slate-500 mt-2 font-medium">Manage your system architecture and costings</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-bold transition-all shadow-lg shadow-blue-100 active:scale-95"
                >
                    <Plus size={20} />
                    New Project
                </button>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex-1 relative">
                    <input
                        type="text"
                        placeholder="Search projects or clients..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-4 pr-4 py-2 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 font-medium"
                    />
                </div>
                <select
                    value={selectedClientFilter}
                    onChange={(e) => setSelectedClientFilter(e.target.value)}
                    className="bg-slate-50 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 font-bold min-w-[200px]"
                >
                    <option value="all">All Clients</option>
                    {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>

            {isLoading ? (
                <div className="text-center py-20 text-slate-400 font-bold animate-pulse">Loading workspace...</div>
            ) : filteredProjects.length === 0 ? (
                <div className="text-center py-32 bg-white rounded-[2.5rem] border border-dashed border-slate-200 shadow-inner">
                    <FolderOpen size={64} className="mx-auto text-slate-200 mb-6" />
                    <h3 className="text-xl font-black text-slate-900">No matching projects</h3>
                    <p className="text-slate-500 mt-2">Try adjusting your filters or create a new design.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredProjects.map((project) => (
                        <div key={project.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 p-8 flex flex-col group hover:-translate-y-1">
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-4 bg-blue-50 text-blue-600 rounded-[1.5rem] group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                                    <FolderOpen size={28} />
                                </div>
                                <span className="text-[10px] font-black px-4 py-1.5 bg-slate-100 text-slate-500 rounded-full uppercase tracking-widest">
                                    {project.versions[0] ? `Rev ${project.versions[0].versionNumber}` : 'Draft'}
                                </span>
                            </div>

                            <h3 className="text-2xl font-black text-slate-900 mb-2 truncate">{project.name}</h3>
                            <div className="flex flex-col gap-2 mb-8">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">{project.client?.name || 'Standard Assets'}</p>
                                </div>
                                {project.location && (
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{project.location}</p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Modified</span>
                                    <div className="flex items-center gap-1.5 text-slate-900 font-bold text-sm">
                                        <Calendar size={14} className="text-slate-400" />
                                        <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                {project.versions[0] && (
                                    <Link
                                        to={`/projects/${project.id}/versions/${project.versions[0].id}`}
                                        className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-colors shadow-lg"
                                    >
                                        Open Details
                                    </Link>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Simple Create Modal Overlay */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 animate-in zoom-in-95 duration-200">
                        <h3 className="text-3xl font-black text-slate-900 mb-8 tracking-tight">Create Project</h3>
                        <form onSubmit={handleCreateProject} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Project Identifier</label>
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="e.g. JB Water Treatment Plant"
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-100 focus:bg-white rounded-2xl px-5 py-4 outline-none font-bold text-slate-900 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Location</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Johor Bahru, Malaysia"
                                    value={newProjectLocation}
                                    onChange={(e) => setNewProjectLocation(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-100 focus:bg-white rounded-2xl px-5 py-4 outline-none font-bold text-slate-900 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Assign Client</label>
                                <select
                                    value={newProjectClientId}
                                    onChange={(e) => setNewProjectClientId(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-100 focus:bg-white rounded-2xl px-5 py-4 outline-none font-bold text-slate-900 transition-all appearance-none"
                                >
                                    <option value="">Select a Client</option>
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                    <option value="new" className="text-blue-600">+ Create New Client</option>
                                </select>
                            </div>
                            <div className="flex gap-4 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="flex-1 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-blue-600 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                                >
                                    Begin Design
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
