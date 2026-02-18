import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Plus, Trash2, Save, ChevronDown, Download, Layers } from 'lucide-react';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';

// Types
interface IORequirement {
    id: string;
    ioType: 'DI' | 'DO' | 'AI' | 'AO' | 'RTD' | 'HLI';
    quantity: number;
}

interface Section {
    id: string;
    name: string;
    ioRequirements: IORequirement[];
    mandays: number;
    mobilization: number;
    lodging: number;
    documentation: number;
    training: number;
}

interface System {
    id: string;
    name: string;
    sections: Section[];
    mandays: number;
    mobilization: number;
    lodging: number;
    documentation: number;
    training: number;
}

interface ProjectComponent {
    id: string;
    catalogId: string;
    quantity: number;
    snapshottedPrice: string | number;
    componentName: string;
    category?: string;
    systemId?: string | null;
    sectionId?: string | null;
    catalog: {
        model: string;
        brand: string;
        ioSpecs: any;
        category: string;
    };
}

interface ProjectVersion {
    id: string;
    versionNumber: number;
    status: string;
    systems: System[];
    components: ProjectComponent[];
    costSettings: {
        engRateDigital: number;
        engRateAnalog: number;
        engRateHLI: number;
        cablingCostPerIO: number;
    } | null;
    markup: number;
    project?: {
        name: string;
        location?: string | null;
        client?: {
            name: string;
        }
    };
}

// Helper for calculations
const calculateVersionTotals = (version: ProjectVersion) => {
    let digital = 0;
    let analog = 0;
    let hli = 0;
    let siteSubtotal = 0;

    const rates = version.costSettings || { engRateDigital: 0, engRateAnalog: 0, engRateHLI: 0, cablingCostPerIO: 0 };

    const hierarchy = (version.systems || []).map(sys => {
        let sysDigital = 0;
        let sysAnalog = 0;
        let sysHli = 0;
        let sysSecSum = 0;
        let sysSecSiteSum = 0;

        const sections = (sys.sections || []).map(sec => {
            let secDigital = 0;
            let secAnalog = 0;
            let secHli = 0;
            const mandays = Number(sec.mandays);
            const mobilization = Number(sec.mobilization);
            const lodging = Number(sec.lodging);
            const documentation = Number(sec.documentation);
            const training = Number(sec.training);
            const secSiteCost = mandays + mobilization + lodging + documentation + training;

            sec.ioRequirements.forEach(io => {
                if (io.ioType === 'DI' || io.ioType === 'DO') secDigital += io.quantity;
                else if (io.ioType === 'AI' || io.ioType === 'AO' || io.ioType === 'RTD') secAnalog += io.quantity;
                else if (io.ioType === 'HLI') secHli += io.quantity;
            });

            const secHardware = version.components
                .filter(c => c.sectionId === sec.id)
                .reduce((acc, c) => acc + (Number(c.snapshottedPrice) * c.quantity), 0);

            const secEng = (secDigital * rates.engRateDigital) + (secAnalog * rates.engRateAnalog) + (secHli * rates.engRateHLI);
            const secCabling = (secDigital + secAnalog + secHli) * rates.cablingCostPerIO;
            const secNet = secHardware + secEng + secCabling + secSiteCost;

            sysDigital += secDigital;
            sysAnalog += secAnalog;
            sysHli += secHli;
            sysSecSum += secNet;
            sysSecSiteSum += secSiteCost;

            return {
                id: sec.id,
                name: sec.name,
                net: secNet,
                breakdown: {
                    hardware: secHardware,
                    eng: secEng,
                    cabling: secCabling,
                    mandays,
                    mobilization,
                    lodging,
                    documentation,
                    training
                }
            };
        });

        const sysDirectHardware = version.components
            .filter(c => c.systemId === sys.id && !c.sectionId)
            .reduce((acc, c) => acc + (Number(c.snapshottedPrice) * c.quantity), 0);

        const mandays = Number(sys.mandays);
        const mobilization = Number(sys.mobilization);
        const lodging = Number(sys.lodging);
        const documentation = Number(sys.documentation);
        const training = Number(sys.training);
        const sysDirectSite = mandays + mobilization + lodging + documentation + training;
        const directNet = sysDirectHardware + sysDirectSite;

        // Final System Total is sum of sections + its own direct costs
        const sysNet = sysSecSum + directNet;

        digital += sysDigital;
        analog += sysAnalog;
        hli += sysHli;
        siteSubtotal += (sysDirectSite + sysSecSiteSum);

        // System level breakdown (Aggregated from sections + direct)
        const sysBreakdown = {
            hardware: sysDirectHardware + sections.reduce((acc, s) => acc + s.breakdown.hardware, 0),
            eng: sections.reduce((acc, s) => acc + s.breakdown.eng, 0),
            cabling: sections.reduce((acc, s) => acc + s.breakdown.cabling, 0),
            mandays: mandays + sections.reduce((acc, s) => acc + s.breakdown.mandays, 0),
            mobilization: mobilization + sections.reduce((acc, s) => acc + s.breakdown.mobilization, 0),
            lodging: lodging + sections.reduce((acc, s) => acc + s.breakdown.lodging, 0),
            documentation: documentation + sections.reduce((acc, s) => acc + s.breakdown.documentation, 0),
            training: training + sections.reduce((acc, s) => acc + s.breakdown.training, 0),
        };

        return {
            id: sys.id,
            name: sys.name,
            net: sysNet,
            directNet,
            breakdown: sysBreakdown,
            directBreakdown: {
                hardware: sysDirectHardware,
                mandays,
                mobilization,
                lodging,
                documentation,
                training
            },
            sections
        };
    });

    const engCost = (digital * rates.engRateDigital) + (analog * rates.engRateAnalog) + (hli * rates.engRateHLI);
    const cablingCost = (digital + analog + hli) * rates.cablingCostPerIO;
    const hardwareCost = version.components.reduce((acc, c) => acc + (Number(c.snapshottedPrice) * c.quantity), 0);

    return {
        digital, analog, hli, totalIO: digital + analog + hli,
        engCost, cablingCost, siteSubtotal, hardwareCost,
        totalNet: engCost + cablingCost + siteSubtotal + hardwareCost,
        hierarchy
    };
};

const ProjectEditor: React.FC = () => {
    const { id: projectId, versionId } = useParams();
    const navigate = useNavigate();
    const [version, setVersion] = useState<ProjectVersion | null>(null);
    const [allVersions, setAllVersions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedSystems, setExpandedSystems] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState<'definition' | 'hardware' | 'summary' | 'site'>('definition');

    useEffect(() => {
        fetchVersionDetails();
        fetchProjectVersions();
    }, [versionId]);

    const fetchVersionDetails = async () => {
        try {
            const res = await api.get(`/versions/${versionId}`);
            setVersion(res.data);
            // Default expand systems if none expanded
            if (expandedSystems.size === 0 && res.data.systems.length > 0) {
                setExpandedSystems(new Set(res.data.systems.map((s: any) => s.id)));
            }
        } catch (error) {
            console.error('Failed to load version', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProjectVersions = async () => {
        if (!projectId) return;
        try {
            const res = await api.get(`/projects/${projectId}`);
            setAllVersions(res.data.versions || []);
        } catch (error) {
            console.error('Failed to load project versions', error);
        }
    };

    const addSystem = async () => {
        const name = prompt("System Name:");
        if (!name || !version) return;
        try {
            await api.post(`/versions/${version.id}/systems`, { name });
            fetchVersionDetails();
        } catch (error) {
            alert("Error adding system");
        }
    };

    const addSection = async (systemId: string) => {
        const name = prompt("Section Name:");
        if (!name) return;
        try {
            await api.post(`/versions/systems/${systemId}/sections`, { name });
            fetchVersionDetails();
            setExpandedSystems(prev => new Set(prev).add(systemId));
        } catch (error) {
            alert("Error adding section");
        }
    };

    const updateIO = async (sectionId: string, requirements: IORequirement[]) => {
        try {
            await api.put(`/versions/sections/${sectionId}/io`, {
                ioRequirements: requirements.map(r => ({ ioType: r.ioType, quantity: Number(r.quantity) }))
            });
            fetchVersionDetails();
        } catch (error) {
            console.error("Error updating IO", error);
        }
    };

    const toggleSystem = (id: string) => {
        const newSet = new Set(expandedSystems);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedSystems(newSet);
    };

    const saveAsNewVersion = async () => {
        if (!confirm("Save this as a new version? Previous data remains unchanged.")) return;
        try {
            const res = await api.post(`/versions/${versionId}/clone`);
            navigate(`/projects/${projectId}/versions/${res.data.id}`);
            alert(`Drafted Version ${res.data.versionNumber}`);
        } catch (error) {
            alert("Error cloning version");
        }
    };

    const exportToExcel = () => {
        if (!version) return;
        const totals = calculateVersionTotals(version);

        // 1. IO Scope Sheet
        const ioRows: any[] = [];
        version.systems.forEach(sys => {
            sys.sections.forEach(sec => {
                const row: any = { System: sys.name, Section: sec.name };
                ['DI', 'DO', 'AI', 'AO', 'RTD', 'HLI'].forEach(type => {
                    const req = sec.ioRequirements.find(r => r.ioType === type);
                    row[type] = req ? req.quantity : 0;
                });
                ioRows.push(row);
            });
        });
        const ioSheet = XLSX.utils.json_to_sheet(ioRows);

        // 2. BOM Sheet
        const BOM_COLS = ["Category", "Hierarchy", "Component", "Quantity", "Unit Price", "Total Price"];
        const bomData = version.components.map((c, idx) => {
            const rowNum = idx + 2;
            let hierarchy = "Project Level";
            if (c.sectionId) {
                const sec = version.systems.flatMap(s => s.sections).find(s => s.id === c.sectionId);
                hierarchy = `Section: ${sec?.name || 'Unknown'}`;
            } else if (c.systemId) {
                const sys = version.systems.find(s => s.id === c.systemId);
                hierarchy = `System: ${sys?.name || 'Unknown'}`;
            }

            return [
                c.catalog.category,
                hierarchy,
                c.componentName,
                c.quantity,
                Number(c.snapshottedPrice),
                { f: `D${rowNum}*E${rowNum}` }
            ];
        });

        const bomSheet = XLSX.utils.aoa_to_sheet([BOM_COLS, ...bomData]);

        // 3. Project Summary Sheet
        const settings = version.costSettings || { engRateDigital: 0, engRateAnalog: 0, engRateHLI: 0, cablingCostPerIO: 0 };
        const markupPercent = Number(version.markup || 25);
        const margin = markupPercent / 100;
        const grossPrice = margin < 1 ? totals.totalNet / (1 - margin) : totals.totalNet;

        const summaryData = [
            ["Project Costing Summary (RM)", ""],
            ["", ""],
            ["Description", "Value (RM)"],
            ["Total IO Points", totals.totalIO],
            ["Hardware Net Total", totals.hardwareCost],
            ["Engineering: Digital (DI/DO)", totals.digital * settings.engRateDigital],
            ["Engineering: Analog (AI/AO/RTD)", totals.analog * settings.engRateAnalog],
            ["Engineering: HLI / Integration", totals.hli * settings.engRateHLI],
            ["Cabling & Installation", totals.cablingCost],
            ["Site Services (Mandays, Mob, etc)", totals.siteSubtotal],
            ["", ""],
            ["TOTAL NET COST", totals.totalNet],
            ["Project Markup (Margin %)", markupPercent],
            ["GROSS SELLING PRICE", grossPrice]
        ];

        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");
        XLSX.utils.book_append_sheet(wb, ioSheet, "IO Scope");
        XLSX.utils.book_append_sheet(wb, bomSheet, "Bill of Materials");

        XLSX.writeFile(wb, `Pricing_Export_Rev${version.versionNumber}.xlsx`);
    };

    if (loading) return <div className="p-12 text-center text-slate-500">Loading editor...</div>;
    if (!version) return <div className="p-12 text-center text-red-500">Version not found</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{version.project?.name || 'Loading...'}</h1>
                            <span className="text-slate-300 mx-2">/</span>
                            <span className="text-xl font-bold text-slate-500">{version.project?.client?.name || 'No Client'}</span>
                        </div>
                        {version.project?.location && (
                            <div className="flex items-center gap-2 text-blue-500 font-bold text-xs uppercase tracking-widest">
                                <Plus size={12} /> {version.project.location}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3 text-sm font-medium text-slate-500 mt-2">
                        <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full text-slate-700">
                            <span className="text-[10px] font-bold uppercase tracking-wider opacity-50">Rev</span>
                            <select
                                value={version.id}
                                onChange={(e) => navigate(`/projects/${projectId}/versions/${e.target.value}`)}
                                className="bg-transparent border-none font-bold text-slate-900 focus:ring-0 cursor-pointer p-0"
                            >
                                {allVersions.map((v: any) => (
                                    <option key={v.id} value={v.id}>
                                        {v.versionNumber} {v.status === 'Draft' ? '(Draft)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <span className={cn("px-3 py-1 rounded-full uppercase text-[10px] font-bold tracking-widest",
                            version.status === 'Draft' ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700")}>
                            {version.status}
                        </span>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={exportToExcel}
                        className="flex items-center gap-2 px-6 py-2.5 bg-green-50 text-green-700 font-bold rounded-xl hover:bg-green-600 hover:text-white transition-all shadow-sm"
                    >
                        <Download size={18} /> Export Excel
                    </button>
                    <button
                        onClick={saveAsNewVersion}
                        className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-colors shadow-lg"
                    >
                        <Layers size={18} /> Save As New
                    </button>
                    <button
                        onClick={addSystem}
                        className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-200"
                    >
                        <Plus size={18} /> New System
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
                {[
                    { id: 'definition', label: '1. IO Design' },
                    { id: 'hardware', label: '2. Bill of Materials' },
                    { id: 'site', label: '3. Services & Rates' },
                    { id: 'summary', label: '4. Cost Dashboard' }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={cn(
                            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                            activeTab === tab.id
                                ? "bg-white text-blue-600 shadow-sm"
                                : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="min-h-[400px]">
                {activeTab === 'definition' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {version.systems.map((system) => (
                            <div key={system.id} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                                <div
                                    className="flex items-center justify-between p-5 bg-slate-50/50 cursor-pointer"
                                    onClick={() => toggleSystem(system.id)}
                                >
                                    <div className="flex items-center gap-3 font-bold text-slate-900 text-lg">
                                        <div className={cn("p-1 rounded-md transition-transform", expandedSystems.has(system.id) ? "rotate-0" : "-rotate-90")}>
                                            <ChevronDown size={20} className="text-slate-400" />
                                        </div>
                                        {system.name}
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); addSection(system.id); }}
                                        className="text-xs font-bold flex items-center gap-1.5 text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                    >
                                        <Plus size={14} /> Add Project Section
                                    </button>
                                </div>

                                {expandedSystems.has(system.id) && (
                                    <div className="p-6 space-y-6 border-t border-slate-100">
                                        {system.sections.length === 0 && <div className="text-sm text-slate-400 italic px-2">No sections defined for this system.</div>}
                                        {system.sections.map(section => (
                                            <SectionEditor key={section.id} section={section} onUpdate={updateIO} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {version.systems.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-300 text-slate-400 space-y-4">
                                <Plus size={48} className="text-slate-200" />
                                <div className="text-center">
                                    <div className="font-bold text-slate-600">No Systems Defined</div>
                                    <div className="text-sm">Click "New System" to start building your architecture.</div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'hardware' && <AdvancedBOM version={version} onUpdate={fetchVersionDetails} />}
                {activeTab === 'site' && <SiteSettings version={version} onUpdate={fetchVersionDetails} />}
                {activeTab === 'summary' && <CostSummary version={version} onUpdate={fetchVersionDetails} />}
            </div>
        </div>
    );
};

// --- Subcomponents ---

const SectionEditor: React.FC<{
    section: Section;
    onUpdate: (id: string, reqs: IORequirement[]) => void
}> = ({ section, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [requirements, setRequirements] = useState<IORequirement[]>(section.ioRequirements);
    const ioTypes = ['DI', 'DO', 'AI', 'AO', 'RTD', 'HLI'] as const;

    const handleSave = () => {
        onUpdate(section.id, requirements);
        setIsEditing(false);
    };

    const addRow = () => {
        setRequirements([...requirements, { id: Math.random().toString(), ioType: 'DI', quantity: 0 }]);
    };

    const updateRow = (index: number, field: keyof IORequirement, value: any) => {
        const newReqs = [...requirements];
        newReqs[index] = { ...newReqs[index], [field]: value };
        setRequirements(newReqs);
    };

    const removeRow = (index: number) => {
        setRequirements(requirements.filter((_, i) => i !== index));
    };

    const groupedIO = section.ioRequirements.reduce((acc, curr) => {
        acc[curr.ioType] = (acc[curr.ioType] || 0) + curr.quantity;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="py-2">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <div className="h-4 w-4 rounded-full bg-blue-600 shadow-lg shadow-blue-200"></div>
                    <h4 className="font-black text-slate-900 text-lg uppercase tracking-tight">{section.name}</h4>
                </div>
                <button
                    onClick={() => setIsEditing(!isEditing)}
                    className={cn("text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl transition-all shadow-sm",
                        isEditing ? "bg-slate-200 text-slate-600" : "bg-white border-2 border-slate-100 text-blue-600 hover:border-blue-600")}
                >
                    {isEditing ? 'Discard Changes' : 'Configure Signals'}
                </button>
            </div>

            {!isEditing ? (
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 animate-in fade-in duration-500">
                    {ioTypes.map(type => (
                        <div key={type} className={cn("p-4 rounded-2xl border transition-all",
                            groupedIO[type] > 0 ? "bg-white border-blue-100 shadow-sm ring-1 ring-blue-50" : "bg-slate-50/50 border-slate-100 opacity-60")}>
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{type}</div>
                            <div className="text-xl font-black text-slate-900">{groupedIO[type] || 0}</div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-slate-50/50 p-8 rounded-[2rem] border-2 border-slate-100 space-y-4 shadow-inner">
                    <div className="grid grid-cols-1 gap-3">
                        {requirements.map((req, idx) => (
                            <div key={idx} className="flex gap-4 items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm animate-in slide-in-from-left-4 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                                <select
                                    value={req.ioType}
                                    onChange={(e) => updateRow(idx, 'ioType', e.target.value)}
                                    className="border-none bg-slate-50 rounded-xl px-5 py-3 text-sm font-black text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 w-40"
                                >
                                    {ioTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <input
                                    type="number"
                                    min="0"
                                    value={req.quantity}
                                    onChange={(e) => updateRow(idx, 'quantity', parseInt(e.target.value) || 0)}
                                    className="border-none bg-slate-50 rounded-xl px-5 py-3 text-sm font-black text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 w-32 text-center"
                                />
                                <div className="flex-1"></div>
                                <button onClick={() => removeRow(idx)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between items-center mt-8 pt-8 border-t border-slate-200">
                        <button onClick={addRow} className="flex items-center gap-2 bg-white text-slate-900 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 border-slate-100 hover:border-slate-300 transition-all shadow-sm">
                            <Plus size={16} /> New Signal Group
                        </button>
                        <button onClick={handleSave} className="flex items-center gap-3 bg-emerald-600 text-white px-10 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100">
                            <Save size={18} /> Apply Logic
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Advanced BOM Component ---

const AdvancedBOM: React.FC<{ version: ProjectVersion; onUpdate: () => void }> = ({ version, onUpdate }) => {
    const [catalog, setCatalog] = useState<any[]>([]);
    const [activeTarget, setActiveTarget] = useState<{ type: 'project' | 'system' | 'section'; id?: string } | null>(null);
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const [categoryFilter, setCategoryFilter] = useState<string>('all');

    const toggleCollapse = (id: string) => {
        const newCollapsed = new Set(collapsed);
        if (newCollapsed.has(id)) newCollapsed.delete(id);
        else newCollapsed.add(id);
        setCollapsed(newCollapsed);
    };

    useEffect(() => {
        api.get('/components').then((res: any) => setCatalog(res.data));
    }, []);

    const categories = Array.from(new Set(catalog.map(c => c.category))).sort();

    const filteredCatalog = categoryFilter === 'all'
        ? catalog
        : catalog.filter(c => c.category === categoryFilter);

    const addComponent = async (catalogId: string) => {
        if (!activeTarget) {
            alert("Select a Target (Project, System, or Section) from the list below first!");
            return;
        }
        try {
            await api.post(`/versions/${version.id}/components`, {
                catalogId,
                quantity: 1,
                systemId: activeTarget.type === 'system' ? activeTarget.id : null,
                sectionId: activeTarget.type === 'section' ? activeTarget.id : null
            });
            onUpdate();
        } catch (error) {
            alert("Error adding component");
        }
    };

    const removeComponent = async (id: string) => {
        try {
            await api.delete(`/versions/components/${id}`);
            onUpdate();
        } catch (error) {
            console.error(error);
        }
    };

    // Calculate aggregated IO provided by components for each section
    const calculateProvidedIO = (sectionId: string) => {
        const sectionComponents = version.components.filter(c => c.sectionId === sectionId);
        const provided: Record<string, number> = { DI: 0, DO: 0, AI: 0, AO: 0, RTD: 0, HLI: 0 };

        sectionComponents.forEach(c => {
            const specs = c.catalog.ioSpecs || {};
            Object.entries(specs).forEach(([type, count]) => {
                const numCount = typeof count === 'number' ? count : parseInt(count as string) || 0;
                provided[type] = (provided[type] || 0) + (numCount * c.quantity);
            });
        });
        return provided;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
            {/* Left: Architecture & Hierarchy */}
            <div className="lg:col-span-3 space-y-10">
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Structured Bill of Materials</h3>
                        <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                            <span className="text-[10px] font-black uppercase text-slate-500">Live Assignment Mode</span>
                        </div>
                    </div>

                    <div className="p-8 space-y-8">
                        {/* Project Level */}
                        <div className={cn("p-6 rounded-[2rem] border-2 transition-all cursor-pointer",
                            activeTarget?.type === 'project' ? "border-blue-600 bg-blue-50/20 ring-4 ring-blue-50" : "border-slate-50 hover:border-slate-200")}
                            onClick={() => setActiveTarget({ type: 'project' })}>
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg">
                                        <Layers size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-900 uppercase tracking-tight">Project Level Hardware</h4>
                                        <p className="text-[10px] font-bold text-slate-400">Software, Workstations, Global Infra</p>
                                    </div>
                                </div>
                                {activeTarget?.type === 'project' && <span className="text-[10px] font-black bg-blue-600 text-white px-3 py-1 rounded-full uppercase">Targetting</span>}
                            </div>
                            <ComponentsList components={version.components.filter(c => !c.systemId && !c.sectionId)} onRemove={removeComponent} />
                        </div>

                        {/* System Hierarchy */}
                        {version.systems.map(sys => (
                            <div key={sys.id} className="space-y-6">
                                <div className={cn("p-6 rounded-[2rem] border-2 transition-all cursor-pointer bg-slate-50/30",
                                    activeTarget?.type === 'system' && activeTarget.id === sys.id ? "border-blue-600 bg-blue-50/20 ring-4 ring-blue-50" : "border-slate-50 hover:border-slate-200")}
                                    onClick={() => setActiveTarget({ type: 'system', id: sys.id })}>
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-4">
                                            <div
                                                className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 shadow-sm hover:bg-slate-100 transition-colors"
                                                onClick={(e) => { e.stopPropagation(); toggleCollapse(sys.id); }}
                                            >
                                                <ChevronDown size={20} className={cn("transition-transform duration-300", collapsed.has(sys.id) ? "-rotate-90" : "rotate-0")} />
                                            </div>
                                            <h4 className="font-black text-slate-900 uppercase tracking-tight">System: {sys.name}</h4>
                                        </div>
                                        {activeTarget?.type === 'system' && activeTarget.id === sys.id && <span className="text-[10px] font-black bg-blue-600 text-white px-3 py-1 rounded-full uppercase">Targetting</span>}
                                    </div>
                                    {!collapsed.has(sys.id) && (
                                        <ComponentsList components={version.components.filter(c => c.systemId === sys.id && !c.sectionId)} onRemove={removeComponent} />
                                    )}
                                </div>

                                {!collapsed.has(sys.id) && sys.sections.map(sec => {
                                    const requiredIO = sec.ioRequirements.reduce((acc, curr) => ({ ...acc, [curr.ioType]: (acc[curr.ioType] || 0) + curr.quantity }), {} as any);
                                    const providedIO = calculateProvidedIO(sec.id);

                                    return (
                                        <div key={sec.id} className={cn("ml-10 p-8 rounded-[2rem] border-2 transition-all cursor-pointer bg-white relative overflow-hidden",
                                            activeTarget?.type === 'section' && activeTarget.id === sec.id ? "border-blue-600 ring-4 ring-blue-50" : "border-slate-100 hover:border-slate-200")}
                                            onClick={() => setActiveTarget({ type: 'section', id: sec.id })}>
                                            <div className="flex justify-between items-start mb-8">
                                                <div className="flex items-center gap-4">
                                                    <div
                                                        className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 hover:bg-blue-200 transition-colors"
                                                        onClick={(e) => { e.stopPropagation(); toggleCollapse(sec.id); }}
                                                    >
                                                        <ChevronDown size={16} className={cn("transition-transform duration-300", collapsed.has(sec.id) ? "-rotate-90" : "rotate-0")} />
                                                    </div>
                                                    <div>
                                                        <h5 className="font-black text-slate-800 text-base uppercase tracking-tight">{sec.name}</h5>
                                                        <p className="text-[10px] font-bold text-slate-400">Assigned Hardware & IO Analysis</p>
                                                    </div>
                                                </div>
                                                {activeTarget?.type === 'section' && activeTarget.id === sec.id && <span className="text-[10px] font-black bg-blue-600 text-white px-3 py-1 rounded-full uppercase">Targetting</span>}
                                            </div>

                                            {!collapsed.has(sec.id) && (
                                                <>

                                                    {/* IO Comparison Table */}
                                                    <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-8">
                                                        {['DI', 'DO', 'AI', 'AO', 'RTD', 'HLI'].map(type => {
                                                            const req = requiredIO[type] || 0;
                                                            const prov = providedIO[type] || 0;
                                                            const diff = prov - req;
                                                            const perc = req > 0 ? (prov / req) * 100 : 0;

                                                            return (
                                                                <div key={type} className={cn("p-4 rounded-2xl border transition-all",
                                                                    req > 0 ? "bg-slate-50 border-slate-100" : "bg-white border-slate-50 opacity-40")}>
                                                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{type}</div>
                                                                    <div className="space-y-1">
                                                                        <div className="flex justify-between text-[10px] font-bold">
                                                                            <span className="text-slate-500">Req: {req}</span>
                                                                            <span className={prov >= req ? "text-emerald-600" : "text-red-500"}>Prov: {prov}</span>
                                                                        </div>
                                                                        <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                                                                            <div className={cn("h-full transition-all", prov >= req ? "bg-emerald-500" : "bg-red-500")} style={{ width: `${Math.min(perc, 100)}%` }}></div>
                                                                        </div>
                                                                        <div className="flex justify-between items-center mt-2">
                                                                            <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded-md",
                                                                                diff >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
                                                                                {diff >= 0 ? `+${diff}` : diff} Spare
                                                                            </span>
                                                                            {req > 0 && <span className="text-[8px] font-medium text-slate-400">{perc.toFixed(0)}%</span>}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    <ComponentsList components={version.components.filter(c => c.sectionId === sec.id)} onRemove={removeComponent} />
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right: Catalog */}
            <div className="space-y-6">
                <div className="sticky top-24">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Module Catalog</h3>
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="bg-slate-100 border-none rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Categories</option>
                            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                    <div className="bg-white border-2 border-slate-50 rounded-[2.5rem] p-6 space-y-4 max-h-[80vh] overflow-y-auto shadow-sm custom-scrollbar">
                        {filteredCatalog.map(item => (
                            <div key={item.id}
                                className="p-5 border-2 border-slate-50 rounded-3xl group hover:border-blue-100 hover:bg-blue-50/20 transition-all cursor-pointer relative"
                                onClick={() => addComponent(item.id)}>
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">{item.category}</div>
                                        <div className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{item.model}</div>
                                        <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{item.brand} • RM{Number(item.listPrice).toLocaleString()}</div>
                                    </div>
                                    <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 text-slate-300 group-hover:text-blue-600 group-hover:border-blue-100 transition-all">
                                        <Plus size={16} />
                                    </div>
                                </div>
                                {item.ioSpecs && Object.keys(item.ioSpecs).length > 0 && (
                                    <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                                        {Object.entries(item.ioSpecs as Record<string, any>).map(([type, qty]) => (
                                            <span key={type} className="text-[8px] font-black bg-slate-100 px-2 py-0.5 rounded-md text-slate-500 uppercase tracking-widest border border-slate-200/50">
                                                {String(qty)} {type}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {catalog.length === 0 && <div className="text-center py-20 text-slate-300 font-bold uppercase text-[10px] tracking-widest">Catalog synchronization required...</div>}
                    </div>
                    {activeTarget && (
                        <div className="mt-6 p-6 bg-blue-600 rounded-[2rem] text-white shadow-xl shadow-blue-200 animate-in zoom-in-95 duration-300">
                            <div className="text-[9px] font-black uppercase tracking-[0.2em] mb-1 opacity-60">Currently Targetting</div>
                            <div className="text-sm font-black uppercase truncate">
                                {activeTarget.type === 'project' ? 'Project Global' :
                                    activeTarget.type === 'system' ? (version.systems.find(s => s.id === activeTarget.id)?.name || 'Unknown System') :
                                        (version.systems.flatMap(s => s.sections).find(s => s.id === activeTarget.id)?.name || 'Unknown Section')}
                            </div>
                            <button onClick={() => setActiveTarget(null)} className="w-full mt-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Cancel Mode</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const ComponentsList: React.FC<{ components: ProjectComponent[]; onRemove: (id: string) => void }> = ({ components, onRemove }) => (
    <div className="space-y-2">
        {components.length === 0 && <div className="text-[10px] text-slate-300 font-bold uppercase tracking-widest text-center py-4 border border-dashed border-slate-100 rounded-2xl">No items assigned</div>}
        {components.map(c => (
            <div key={c.id} className="flex items-center justify-between bg-white border border-slate-100 p-4 rounded-2xl group hover:shadow-md transition-all">
                <div className="flex items-center gap-4">
                    <div className="text-sm font-black text-slate-900">{c.quantity}x</div>
                    <div>
                        <div className="text-sm font-black text-slate-800">{c.componentName}</div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{c.catalog.brand} • RM{Number(c.snapshottedPrice).toLocaleString()} ea</div>
                    </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onRemove(c.id); }} className="p-2 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                    <Trash2 size={16} />
                </button>
            </div>
        ))}
    </div>
);

const SiteSettings: React.FC<{ version: ProjectVersion; onUpdate: () => void }> = ({ version, onUpdate }) => {
    const [settings, setSettings] = useState(() => {
        if (version.costSettings) return version.costSettings;
        return {
            engRateDigital: 100,
            engRateAnalog: 150,
            engRateHLI: 250,
            cablingCostPerIO: 600
        };
    });

    const totals = calculateVersionTotals(version);

    const handleSaveSettings = async () => {
        try {
            await api.put(`/versions/${version.id}/settings`, settings);
            onUpdate();
        } catch (error) { alert("Error saving settings"); }
    };

    const updateSystemFields = async (systemId: string, fields: any) => {
        try {
            await api.put(`/versions/systems/${systemId}`, fields);
            onUpdate();
        } catch (error) { alert("Error updating system"); }
    };

    const updateSectionFields = async (sectionId: string, fields: any) => {
        try {
            await api.put(`/versions/sections/${sectionId}/fields`, fields);
            onUpdate();
        } catch (error) { alert("Error updating section"); }
    };

    return (
        <div className="space-y-12 pb-20">
            {/* Engineering Rates Section */}
            <div className="bg-white border border-slate-100 rounded-[3rem] p-12 shadow-sm">
                <div className="mb-10">
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">Engineering Base Rates</h3>
                    <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-widest">Global rates per IO type for this version</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                    {[
                        { label: 'Digital (DI/DO)', key: 'engRateDigital', count: totals.digital },
                        { label: 'Analog (AI/AO/RTD)', key: 'engRateAnalog', count: totals.analog },
                        { label: 'HLI / Integration', key: 'engRateHLI', count: totals.hli },
                    ].map(field => (
                        <div key={field.key} className="space-y-4 p-6 bg-slate-50/50 rounded-3xl border border-slate-100">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{field.label}</label>
                            <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">RM</span>
                                <input
                                    type="number"
                                    value={(settings as any)[field.key]}
                                    onChange={e => setSettings({ ...settings, [field.key]: Number(e.target.value) })}
                                    className="w-full bg-white border-2 border-slate-100 rounded-xl pl-12 pr-4 py-3 font-black text-lg text-slate-900 focus:border-blue-500 outline-none transition-all"
                                />
                            </div>
                            <div className="flex justify-between items-center pt-2">
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Total {field.count} IO</span>
                                <span className="text-[10px] font-black text-blue-600">Subtotal: RM{(field.count * (settings as any)[field.key]).toLocaleString()}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="space-y-4 p-6 bg-blue-50/30 rounded-3xl border border-blue-100 mb-10">
                    <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">Global Cabling & Installation (RM/IO)</label>
                    <div className="flex items-center gap-6">
                        <div className="relative group w-64">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 font-black text-sm">RM</span>
                            <input
                                type="number"
                                value={settings.cablingCostPerIO}
                                onChange={e => setSettings({ ...settings, cablingCostPerIO: Number(e.target.value) })}
                                className="w-full bg-white border-2 border-blue-100 rounded-xl pl-12 pr-4 py-3 font-black text-lg text-slate-900 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div className="text-[10px] font-black text-blue-600 uppercase">
                            Project Total: RM{(totals.totalIO * settings.cablingCostPerIO).toLocaleString()}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-6 border-t border-slate-50">
                    <button onClick={handleSaveSettings} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg active:scale-95">
                        Apply Global Rates
                    </button>
                </div>
            </div>

            {/* Site Work & Modular Costs */}
            <div className="space-y-6">
                <h3 className="text-xl font-black text-slate-900 ml-6 uppercase tracking-widest">Modular Site Work & Services</h3>
                {version.systems.map(sys => (
                    <div key={sys.id} className="space-y-4">
                        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
                            <div className="flex justify-between items-start mb-6">
                                <h4 className="font-black text-slate-900 uppercase tracking-tight">System: {sys.name}</h4>
                            </div>
                            <SiteWorkInputs
                                data={sys}
                                onSave={(fields) => updateSystemFields(sys.id, fields)}
                                ioCount={sys.sections.reduce((acc, s) => acc + s.ioRequirements.reduce((a, i) => a + i.quantity, 0), 0)}
                                cablingRate={settings.cablingCostPerIO}
                            />
                        </div>
                        {sys.sections.map(sec => (
                            <div key={sec.id} className="ml-12 bg-slate-50 border border-slate-200 rounded-[2rem] p-8 shadow-inner">
                                <h5 className="font-bold text-slate-600 uppercase text-xs mb-6 tracking-widest">Section: {sec.name}</h5>
                                <SiteWorkInputs
                                    data={sec}
                                    onSave={(fields) => updateSectionFields(sec.id, fields)}
                                    ioCount={sec.ioRequirements.reduce((acc, i) => acc + i.quantity, 0)}
                                    cablingRate={settings.cablingCostPerIO}
                                />
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

const SiteWorkInputs: React.FC<{
    data: any;
    onSave: (fields: any) => void;
    ioCount: number;
    cablingRate: number
}> = ({ data, onSave, ioCount, cablingRate }) => {
    // Initial state from persisted details or flat fields
    const [details, setDetails] = useState(() => {
        const initialDetails = data.siteWorkDetails || {};
        const fields = ['mandays', 'mobilization', 'lodging', 'documentation', 'training'];
        const state: any = {};

        fields.forEach(f => {
            state[f] = {
                rate: initialDetails[f]?.rate || data[f] || 0,
                qty: initialDetails[f]?.qty || (data[f] > 0 ? 1 : 0)
            };
        });
        return state;
    });

    const updateField = (key: string, part: 'rate' | 'qty', val: number) => {
        setDetails((prev: any) => ({
            ...prev,
            [key]: { ...prev[key], [part]: val }
        }));
    };

    const handleSave = () => {
        const payload: any = { siteWorkDetails: details };
        // Flatten totals for legacy compatibility and main logic
        Object.keys(details).forEach(key => {
            payload[key] = details[key].rate * details[key].qty;
        });
        onSave(payload);
    };

    const siteSubtotal = Object.values(details).reduce((acc: number, f: any) => acc + (f.rate * f.qty), 0);
    const cablingCost = ioCount * cablingRate;

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                {[
                    { label: 'Mandays', key: 'mandays' },
                    { label: 'Mobilization', key: 'mobilization' },
                    { label: 'Lodging', key: 'lodging' },
                    { label: 'Documentation', key: 'documentation' },
                    { label: 'Training', key: 'training' },
                ].map(f => {
                    const field = details[f.key];
                    const total = field.rate * field.qty;

                    return (
                        <div key={f.key} className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-blue-200 transition-colors">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">{f.label}</label>

                            <div className="space-y-3">
                                <div>
                                    <div className="text-[8px] font-bold text-slate-400 uppercase mb-1">Unit Rate (RM)</div>
                                    <input
                                        type="number"
                                        value={field.rate}
                                        onChange={e => updateField(f.key, 'rate', Number(e.target.value))}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-sm font-black text-slate-900 focus:bg-white focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>

                                <div>
                                    <div className="text-[8px] font-bold text-slate-400 uppercase mb-1">Quantity</div>
                                    <input
                                        type="number"
                                        value={field.qty}
                                        onChange={e => updateField(f.key, 'qty', Number(e.target.value))}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-sm font-black text-slate-900 focus:bg-white focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>

                                <div className="pt-2 border-t border-slate-50 flex justify-between items-center">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">Subtotal</span>
                                    <span className="text-[11px] font-black text-slate-900">RM{total.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex justify-between items-center p-6 bg-slate-900 rounded-[2rem] text-white shadow-xl">
                <div className="flex gap-10">
                    <div>
                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Subtotal Site Work</div>
                        <div className="text-xl font-black">RM{siteSubtotal.toLocaleString()}</div>
                    </div>
                    <div className="border-l border-white/10 pl-10">
                        <div className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Cabling ({ioCount} IO)</div>
                        <div className="text-xl font-black text-blue-100">RM{cablingCost.toLocaleString()}</div>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center gap-3"
                >
                    <Save size={14} />
                    Save Changes
                </button>
            </div>
        </div>
    );
};

const CostSummary: React.FC<{ version: ProjectVersion; onUpdate: () => void }> = ({ version, onUpdate }) => {
    const totals = calculateVersionTotals(version);
    const [markupPercent, setMarkupPercent] = useState(() => {
        const val = version.markup ? Number(version.markup) : 25;
        // Auto-fix if it was stored as a legacy multiplier (e.g. 1.25)
        return val < 5 ? (val - 1) * 100 : val;
    });
    const [isSaving, setIsSaving] = useState(false);

    const margin = markupPercent / 100;
    const totalProjectPrice = margin < 1 ? totals.totalNet / (1 - margin) : totals.totalNet;

    const handleSaveMarkup = async () => {
        setIsSaving(true);
        try {
            await api.put(`/versions/${version.id}`, { markup: markupPercent });
            onUpdate();
            alert("Markup saved successfully");
        } catch (error) {
            alert("Error saving markup");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-10 animate-in fade-in zoom-in-95 duration-500 pb-20">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <SummaryCard label="Points of IO" value={totals.totalIO} unit="Pt" />
                <SummaryCard label="Hardware Net" value={`RM${totals.hardwareCost.toLocaleString()}`} color="text-blue-600" />
                <SummaryCard label="Services & Site" value={`RM${(totals.engCost + totals.siteSubtotal + totals.cablingCost).toLocaleString()}`} color="text-indigo-600" />
                <div className="p-10 rounded-[3rem] shadow-2xl bg-slate-900 text-white relative overflow-hidden group border border-slate-800">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-700">
                        <Save size={100} />
                    </div>
                    <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mb-3">Project Net Total</div>
                    <div className="text-4xl font-black text-white leading-none tracking-tighter">RM{totals.totalNet.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
                <div className="lg:col-span-3 bg-white border border-slate-100 rounded-[3rem] p-12 shadow-sm">
                    <h3 className="text-2xl font-black text-slate-900 mb-10 flex items-center gap-4">
                        <div className="w-2 h-10 bg-blue-600 rounded-full"></div>
                        Cost Distribution
                    </h3>
                    <div className="space-y-10">
                        <CostItem label="Systems Architecture (Hardware)" amount={totals.hardwareCost} total={totals.totalNet} color="bg-blue-600" markupPercent={markupPercent} />
                        <CostItem label="Engineering Services" amount={totals.engCost} total={totals.totalNet} color="bg-indigo-600" markupPercent={markupPercent} />
                        <CostItem label="Cabling & Installation" amount={totals.cablingCost} total={totals.totalNet} color="bg-emerald-500" markupPercent={markupPercent} />
                        <CostItem label="Site Implementation" amount={totals.siteSubtotal} total={totals.totalNet} color="bg-teal-500" markupPercent={markupPercent} />
                    </div>
                </div>

                <div className="lg:col-span-2 bg-gradient-to-br from-slate-800 to-slate-900 rounded-[3rem] p-12 text-white shadow-2xl flex flex-col relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none bg-[radial-gradient(circle_at_top_right,white,transparent)] transition-transform group-hover:scale-110 duration-1000"></div>

                    <div className="flex justify-between items-center mb-12 relative z-10">
                        <h3 className="text-xl font-black uppercase tracking-widest text-slate-300">Markup Settings</h3>
                        <div className="flex items-center gap-3 bg-white/10 p-2 rounded-2xl border border-white/5">
                            <input
                                type="number"
                                value={markupPercent}
                                onChange={(e) => setMarkupPercent(Number(e.target.value) || 0)}
                                className="bg-transparent border-none text-right font-black text-xl w-16 focus:ring-0 p-0"
                            />
                            <span className="text-xs font-bold text-slate-400">%</span>
                            <button
                                onClick={handleSaveMarkup}
                                disabled={isSaving}
                                className="bg-blue-600 hover:bg-blue-500 p-2 rounded-xl transition-colors disabled:opacity-50"
                            >
                                <Save size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-8 relative z-10 flex-1">
                        <div className="flex justify-between items-center opacity-70 uppercase text-[10px] font-black tracking-[0.2em]">
                            <span>Project Net Cost</span>
                            <span className="text-lg font-black text-white">RM{totals.totalNet.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center opacity-70 uppercase text-[10px] font-black tracking-[0.2em] pt-6 border-t border-white/10">
                            <span>Calculated Margin</span>
                            <span className="text-lg font-black text-white">{markupPercent}%</span>
                        </div>

                        <div className="pt-12 mt-8 border-t border-white/20">
                            <div className="text-blue-400 uppercase text-[10px] font-black tracking-[0.4em] mb-4">Gross Selling Price</div>
                            <div className="text-6xl font-black tracking-tighter text-white drop-shadow-2xl">
                                RM{totalProjectPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </div>
                            <div className="mt-2 text-[10px] text-slate-500 font-bold italic">
                                Formula: Net / (1 - {markupPercent}%)
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-[3rem] p-12 shadow-sm overflow-hidden">
                <h3 className="text-2xl font-black text-slate-900 mb-10 flex items-center gap-4">
                    <div className="w-2 h-10 bg-emerald-500 rounded-full"></div>
                    System & Section Price Breakdown
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="pb-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Hierarchy Name</th>
                                <th className="pb-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Hardware</th>
                                <th className="pb-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Eng</th>
                                <th className="pb-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Cabling</th>
                                <th className="pb-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Mandays</th>
                                <th className="pb-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Mob</th>
                                <th className="pb-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Other Site</th>
                                <th className="pb-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Net Total</th>
                                <th className="pb-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Gross Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {totals.hierarchy.map(sys => {
                                const sysGross = margin < 1 ? sys.net / (1 - margin) : sys.net;

                                return (
                                    <React.Fragment key={sys.id}>
                                        <tr className="group hover:bg-slate-50/50 transition-colors bg-slate-50/30">
                                            <td className="py-6 pr-4">
                                                <div className="font-black text-slate-900 uppercase text-sm tracking-tight">{sys.name}</div>
                                                <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest text-xs">System Level</div>
                                            </td>
                                            {[
                                                sys.breakdown.hardware,
                                                sys.breakdown.eng,
                                                sys.breakdown.cabling,
                                                sys.breakdown.mandays,
                                                sys.breakdown.mobilization,
                                                sys.breakdown.lodging + sys.breakdown.documentation + sys.breakdown.training
                                            ].map((val, i) => {
                                                const grossVal = margin < 1 ? val / (1 - margin) : val;
                                                return (
                                                    <td key={i} className="py-6 text-sm">
                                                        <div className="font-bold text-slate-700">RM{val.toLocaleString()}</div>
                                                        <div className="text-[10px] text-blue-600/50 font-bold">RM{grossVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                                                    </td>
                                                );
                                            })}
                                            <td className="py-6 font-black text-slate-900">RM{sys.net.toLocaleString()}</td>
                                            <td className="py-6 font-black text-blue-600">RM{sysGross.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                        </tr>
                                        {sys.directNet > 0 && (
                                            <tr className="group hover:bg-slate-50/50 transition-colors italic text-[11px]">
                                                <td className="py-3 pl-8 pr-4 border-l-2 border-amber-200">
                                                    <div className="font-bold text-amber-700">(Direct System Costs)</div>
                                                </td>
                                                {[
                                                    sys.directBreakdown.hardware,
                                                    0, // Eng
                                                    0, // Cabling
                                                    sys.directBreakdown.mandays,
                                                    sys.directBreakdown.mobilization,
                                                    sys.directBreakdown.lodging + sys.directBreakdown.documentation + sys.directBreakdown.training
                                                ].map((val, i) => {
                                                    const grossVal = margin < 1 ? val / (1 - margin) : val;
                                                    return (
                                                        <td key={i} className="py-3">
                                                            <div className="text-amber-600 font-medium">RM{val.toLocaleString()}</div>
                                                            <div className="text-[9px] text-amber-900/40 font-bold">RM{grossVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                                                        </td>
                                                    );
                                                })}
                                                <td className="py-3 font-bold text-amber-700">RM{sys.directNet.toLocaleString()}</td>
                                                <td className="py-3 font-black text-amber-900">RM{(margin < 1 ? sys.directNet / (1 - margin) : sys.directNet).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                            </tr>
                                        )}
                                        {sys.sections.map(sec => {
                                            const secGross = margin < 1 ? sec.net / (1 - margin) : sec.net;
                                            return (
                                                <tr key={sec.id} className="group hover:bg-slate-50/50 transition-colors text-[12px]">
                                                    <td className="py-4 pl-8 pr-4 border-l-2 border-slate-100">
                                                        <div className="font-bold text-slate-700">{sec.name}</div>
                                                        <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Section</div>
                                                    </td>
                                                    {[
                                                        sec.breakdown.hardware,
                                                        sec.breakdown.eng,
                                                        sec.breakdown.cabling,
                                                        sec.breakdown.mandays,
                                                        sec.breakdown.mobilization,
                                                        sec.breakdown.lodging + sec.breakdown.documentation + sec.breakdown.training
                                                    ].map((val, i) => {
                                                        const grossVal = margin < 1 ? val / (1 - margin) : val;
                                                        return (
                                                            <td key={i} className="py-4">
                                                                <div className="text-slate-600 font-medium">RM{val.toLocaleString()}</div>
                                                                <div className="text-[10px] text-slate-400 font-bold">RM{grossVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="py-4 font-bold text-slate-800">RM{sec.net.toLocaleString()}</td>
                                                    <td className="py-4 font-black text-slate-900">RM{secGross.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                                </tr>
                                            );
                                        })}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const SummaryCard = ({ label, value, unit, color = "text-slate-900" }: { label: string; value: any; unit?: string; color?: string }) => (
    <div className="bg-white p-10 border border-slate-100 rounded-[3rem] shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 group">
        <div className="text-[9px] text-slate-400 font-black uppercase tracking-[0.3em] mb-3 group-hover:text-blue-600 transition-colors">{label}</div>
        <div className={cn("text-4xl font-black leading-none tracking-tighter", color)}>
            {value}
            {unit && <span className="text-xs font-bold opacity-30 ml-2 uppercase tracking-widest">{unit}</span>}
        </div>
    </div>
);

const CostItem: React.FC<{
    label: string;
    amount: number;
    total: number;
    color: string;
    markupPercent: number;
}> = ({ label, amount, total, color, markupPercent }) => {
    const percentage = total > 0 ? (amount / total) * 100 : 0;
    const margin = markupPercent / 100;
    const grossVal = margin < 1 ? amount / (1 - margin) : amount;

    return (
        <div className="group">
            <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                <span className="text-slate-900 group-hover:text-blue-600 transition-colors">{label}</span>
                <div className="flex flex-col items-end">
                    <span className="text-[9px] text-slate-400 font-black mb-1">Original: RM{amount.toLocaleString()}</span>
                    <span className="text-slate-900 font-black text-sm">Markuped: RM{grossVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
            </div>
            <div className="w-full bg-slate-50 h-5 rounded-full overflow-hidden shadow-inner p-1.5 border border-slate-100/50">
                <div
                    className={cn("h-full rounded-full transition-all duration-1000 ease-out shadow-lg", color)}
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
            <div className="flex justify-end mt-3">
                <span className="text-[9px] font-black text-slate-400 tracking-[0.3em] uppercase opacity-50">{percentage.toFixed(1)}% weight</span>
            </div>
        </div>
    );
};

export default ProjectEditor;
