import React, { useEffect, useState } from 'react';
import { Plus, FolderOpen, Calendar, MapPin, Building2 } from 'lucide-react';
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
        <div className="space-y-6 sm:space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Projects</h2>
                    <p className="text-slate-500 mt-1 text-xs sm:text-sm font-medium">Manage system architectures, BOMs and cost estimation</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-blue-500/20 active:scale-95"
                >
                    <Plus size={16} />
                    New Project
                </button>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="flex-1 relative">
                    <input
                        type="text"
                        placeholder="Search projects, client, or location..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 font-medium text-xs sm:text-sm"
                    />
                </div>
                <select
                    value={selectedClientFilter}
                    onChange={(e) => setSelectedClientFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 font-bold text-xs sm:text-sm min-w-[180px]"
                >
                    <option value="all">All Clients</option>
                    {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>

            {isLoading ? (
                <div className="text-center py-20 text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">Loading workspace...</div>
            ) : filteredProjects.length === 0 ? (
                <div className="text-center py-20 sm:py-28 bg-white rounded-3xl border border-dashed border-slate-200 shadow-inner px-4">
                    <FolderOpen size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-black text-slate-900">No matching projects</h3>
                    <p className="text-slate-500 text-xs mt-1">Try adjusting your filters or create a new project design.</p>
                </div>
            ) : (
                /* Compact professional cards grid: fits 4-5 items per row on wider screens */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                    {filteredProjects.map((project) => (
                        <div
                            key={project.id}
                            className="bg-white rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all duration-200 p-5 flex flex-col group hover:-translate-y-0.5 justify-between"
                        >
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors duration-200">
                                        <FolderOpen size={20} />
                                    </div>
                                    <span className="text-[9px] font-black px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full uppercase tracking-wider border border-slate-200/50">
                                        {project.versions[0] ? `Rev ${project.versions[0].versionNumber}` : 'Draft'}
                                    </span>
                                </div>

                                <h3 className="text-base font-black text-slate-900 mb-2 truncate group-hover:text-blue-600 transition-colors" title={project.name}>
                                    {project.name}
                                </h3>

                                <div className="flex flex-col gap-1.5 mb-5 text-[11px]">
                                    <div className="flex items-center gap-1.5 text-slate-500 font-bold">
                                        <Building2 size={13} className="text-slate-400 shrink-0" />
                                        <span className="truncate">{project.client?.name || 'Standard Client'}</span>
                                    </div>
                                    {project.location && (
                                        <div className="flex items-center gap-1.5 text-slate-400 font-medium text-[10px]">
                                            <MapPin size={12} className="text-blue-500 shrink-0" />
                                            <span className="truncate">{project.location}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-auto">
                                <div className="flex items-center gap-1 text-slate-400 font-medium text-[10px]">
                                    <Calendar size={12} className="text-slate-400" />
                                    <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                                </div>
                                {project.versions[0] && (
                                    <Link
                                        to={`/projects/${project.id}/versions/${project.versions[0].id}`}
                                        className="bg-slate-900 text-white px-3.5 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-wider hover:bg-blue-600 transition-colors shadow-sm"
                                    >
                                        Open
                                    </Link>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Project Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-8 animate-in zoom-in-95 duration-200 border border-slate-100">
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-6 tracking-tight">Create Project</h3>
                        <form onSubmit={handleCreateProject} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Project Identifier</label>
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="e.g. JB Water Treatment Plant"
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-4 py-3 outline-none font-bold text-slate-900 transition-all text-sm"
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Location</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Puchong, Selangor"
                                    value={newProjectLocation}
                                    onChange={(e) => setNewProjectLocation(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-4 py-3 outline-none font-bold text-slate-900 transition-all text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Assign Client</label>
                                <select
                                    value={newProjectClientId}
                                    onChange={(e) => setNewProjectClientId(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-4 py-3 outline-none font-bold text-slate-900 transition-all text-sm"
                                >
                                    <option value="">Select a Client</option>
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                    <option value="new" className="text-blue-600 font-bold">+ Create New Client</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="flex-1 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-500 hover:bg-slate-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20"
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
