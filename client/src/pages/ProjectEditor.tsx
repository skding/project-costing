import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { 
    Plus, Edit2, Trash2, ChevronDown, Save, Download, X, Package, Layers, Check, FileText 
} from 'lucide-react';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';

// Types
interface IORequirement {
    id: string;
    ioType: 'DI' | 'DO' | 'AI' | 'AO' | 'RTD' | 'HLI';
    quantity: number;
}

interface EquipmentIO {
    id: string;
    ioType: 'DI' | 'DO' | 'AI' | 'AO' | 'RTD' | 'HLI';
    quantity: number;
}

interface Equipment {
    id: string;
    name: string;
    quantity: number;
    io: EquipmentIO[];
}

interface Section {
    id: string;
    name: string;
    ioRequirements: IORequirement[];
    equipment: Equipment[];
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
    catalogId?: string | null;
    quantity: number;
    snapshottedPrice: string | number;
    componentName: string;
    category?: string;
    systemId?: string | null;
    sectionId?: string | null;
    catalog?: {
        model: string;
        brand: string;
        ioSpecs: any;
        category: string;
    } | null;
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
    markupSiteWork: number;
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
    let diCount = 0;
    let doCount = 0;
    let aiCount = 0;
    let aoCount = 0;
    let rtdCount = 0;
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
            const secSiteWork = mandays + mobilization + lodging;
            const secDoc = documentation;
            const secTraining = training;
            const secTotalSite = secSiteWork + secDoc + secTraining;

            sec.ioRequirements.forEach(io => {
                if (io.ioType === 'DI') { secDigital += io.quantity; diCount += io.quantity; }
                else if (io.ioType === 'DO') { secDigital += io.quantity; doCount += io.quantity; }
                else if (io.ioType === 'AI') { secAnalog += io.quantity; aiCount += io.quantity; }
                else if (io.ioType === 'AO') { secAnalog += io.quantity; aoCount += io.quantity; }
                else if (io.ioType === 'RTD') { secAnalog += io.quantity; rtdCount += io.quantity; }
                else if (io.ioType === 'HLI') { secHli += io.quantity; }
            });

            // Add IO from Equipment
            (sec.equipment || []).forEach(eq => {
                const eqQty = Number(eq.quantity) || 1;
                eq.io.forEach(io => {
                    const totalQty = io.quantity * eqQty;
                    if (io.ioType === 'DI') { secDigital += totalQty; diCount += totalQty; }
                    else if (io.ioType === 'DO') { secDigital += totalQty; doCount += totalQty; }
                    else if (io.ioType === 'AI') { secAnalog += totalQty; aiCount += totalQty; }
                    else if (io.ioType === 'AO') { secAnalog += totalQty; aoCount += totalQty; }
                    else if (io.ioType === 'RTD') { secAnalog += totalQty; rtdCount += totalQty; }
                    else if (io.ioType === 'HLI') { secHli += totalQty; }
                });
            });

            const secDirectHardware = version.components
                .filter(c => c.sectionId === sec.id)
                .reduce((acc, c) => acc + (Number(c.snapshottedPrice) * c.quantity), 0);
            
            const secHardware = secDirectHardware;

            const secEng = (secDigital * rates.engRateDigital) + (secAnalog * rates.engRateAnalog) + (secHli * rates.engRateHLI);
            const secCabling = (secDigital + secAnalog + secHli) * rates.cablingCostPerIO;
            const secNet = secHardware + secEng + secCabling + secTotalSite;

            sysDigital += secDigital;
            sysAnalog += secAnalog;
            sysHli += secHli;
            sysSecSum += secNet;
            sysSecSiteSum += secTotalSite;

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
                    training,
                    siteWork: secSiteWork
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
        const sysDirectSiteWork = mandays + mobilization + lodging;
        const sysDirectSiteTotal = sysDirectSiteWork + documentation + training;
        const directNet = sysDirectHardware + sysDirectSiteTotal;

        // Final System Total is sum of sections + its own direct costs
        const sysNet = sysSecSum + directNet;

        digital += sysDigital;
        analog += sysAnalog;
        hli += sysHli;
        siteSubtotal += (sysDirectSiteTotal + sysSecSiteSum);

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
            siteWork: sysDirectSiteWork + sections.reduce((acc, s) => acc + s.breakdown.siteWork, 0),
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
                training,
                siteWork: sysDirectSiteWork
            },
            sections
        };
    });

    const engCost = (digital * rates.engRateDigital) + (analog * rates.engRateAnalog) + (hli * rates.engRateHLI);
    const cablingCost = (digital + analog + hli) * rates.cablingCostPerIO;
    
    const siteWorkCost = hierarchy.reduce((acc, sys) => acc + sys.breakdown.siteWork, 0);
    const documentationCost = hierarchy.reduce((acc, sys) => acc + sys.breakdown.documentation, 0);
    const trainingCost = hierarchy.reduce((acc, sys) => acc + sys.breakdown.training, 0);
    
    const projectLevelHardwareCost = version.components
        .filter(c => !c.systemId && !c.sectionId)
        .reduce((acc, c) => acc + (Number(c.snapshottedPrice) * c.quantity), 0);
    const hardwareCost = version.components.reduce((acc, c) => acc + (Number(c.snapshottedPrice) * c.quantity), 0);

    return {
        digital, analog, hli, totalIO: digital + analog + hli,
        diCount, doCount, aiCount, aoCount, rtdCount,
        engCost, cablingCost, siteSubtotal, hardwareCost, projectLevelHardwareCost,
        siteWorkCost, documentationCost, trainingCost,
        totalNet: engCost + cablingCost + siteSubtotal + hardwareCost,
        hierarchy
    };
};

// Maintains exact previous ordering of systems, sections, and components across refreshes/saves
const reconcileVersionOrder = (prev: ProjectVersion | null, incoming: ProjectVersion): ProjectVersion => {
    if (!prev) return incoming;

    // 1. Maintain systems order
    const systemOrderMap = new Map(prev.systems.map((s, idx) => [s.id, idx]));
    const sortedSystems = [...incoming.systems].sort((a, b) => {
        const orderA = systemOrderMap.has(a.id) ? systemOrderMap.get(a.id)! : Infinity;
        const orderB = systemOrderMap.has(b.id) ? systemOrderMap.get(b.id)! : Infinity;
        return orderA - orderB;
    });

    // 2. Maintain sections order for each system
    const prevSectionOrderMap = new Map<string, number>();
    prev.systems.forEach(sys => {
        sys.sections?.forEach((sec, idx) => {
            prevSectionOrderMap.set(sec.id, idx);
        });
    });

    sortedSystems.forEach(sys => {
        if (sys.sections) {
            sys.sections = [...sys.sections].sort((a, b) => {
                const orderA = prevSectionOrderMap.has(a.id) ? prevSectionOrderMap.get(a.id)! : Infinity;
                const orderB = prevSectionOrderMap.has(b.id) ? prevSectionOrderMap.get(b.id)! : Infinity;
                return orderA - orderB;
            });
        }
    });

    // 3. Maintain components order
    const componentOrderMap = new Map(prev.components.map((c, idx) => [c.id, idx]));
    const sortedComponents = [...incoming.components].sort((a, b) => {
        const orderA = componentOrderMap.has(a.id) ? componentOrderMap.get(a.id)! : Infinity;
        const orderB = componentOrderMap.has(b.id) ? componentOrderMap.get(b.id)! : Infinity;
        return orderA - orderB;
    });

    return {
        ...incoming,
        systems: sortedSystems,
        components: sortedComponents
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
    const [markupPercent, setMarkupPercent] = useState(25);
    const [markupSiteWork, setMarkupSiteWork] = useState(25);

    useEffect(() => {
        setLoading(true);
        // Clear expanded systems so the new version's IDs can be mapped
        setExpandedSystems(new Set());
        fetchVersionDetails();
        fetchProjectVersions();
    }, [versionId]);

    const parseMarkup = (val: any): number => {
        const n = Number(val);
        // If it's explicitly null or undefined, return default 25
        if (val === null || val === undefined) return 25;
        // If it's exactly 1.0 (the Prisma default), return 25
        if (n === 1) return 25;
        // Otherwise return the number as is (allowing 0, 0.5, 30, etc.)
        return isNaN(n) ? 25 : n;
    };

    const fetchVersionDetails = async () => {
        try {
            const res = await api.get(`/versions/${versionId}`);
            console.log('[ProjectEditor] Fetched Version Data:', {
                id: res.data.id,
                markup: res.data.markup,
                markupSiteWork: res.data.markupSiteWork
            });
            setVersion(prev => reconcileVersionOrder(prev, res.data));
            // Sync markup state from fresh server data
            setMarkupPercent(parseMarkup(res.data.markup));
            setMarkupSiteWork(parseMarkup(res.data.markupSiteWork));
            // Default expand systems for the new version
            if (res.data.systems.length > 0) {
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

        // 1. IO Scope Sheet (Summated)
        const ioRows: any[] = [];
        version.systems.forEach(sys => {
            sys.sections.forEach(sec => {
                const row: any = { System: sys.name, Section: sec.name };
                ['DI', 'DO', 'AI', 'AO', 'RTD', 'HLI'].forEach(type => {
                    let total = sec.ioRequirements
                        .filter(r => r.ioType === type)
                        .reduce((acc, r) => acc + r.quantity, 0);

                    sec.equipment?.forEach(eq => {
                        eq.io.filter(i => i.ioType === type)
                            .forEach(i => total += (i.quantity * eq.quantity));
                    });
                    row[type] = total;
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
                c.catalog?.category || 'Misc',
                hierarchy,
                c.componentName,
                c.quantity,
                Number(c.snapshottedPrice),
                { f: `D${rowNum}*E${rowNum}` }
            ];
        });
        const bomSheet = XLSX.utils.aoa_to_sheet([BOM_COLS, ...bomData]);

        // 4. Equipment List Sheet
        const eqCols = ["System", "Section", "Equipment Name", "Quantity", "DI", "DO", "AI", "AO", "RTD", "HLI"];
        const eqData: any[] = [];
        version.systems.forEach(sys => {
            sys.sections.forEach(sec => {
                sec.equipment?.forEach(eq => {
                    const row: any[] = [sys.name, sec.name, eq.name, eq.quantity];
                    ['DI', 'DO', 'AI', 'AO', 'RTD', 'HLI'].forEach(type => {
                        const io = eq.io.find(i => i.ioType === type);
                        row.push(io ? io.quantity : 0);
                    });
                    eqData.push(row);
                });
            });
        });
        const eqSheet = XLSX.utils.aoa_to_sheet([eqCols, ...eqData]);

        // 3. Project Summary Sheet
        const marginGlobal = (Number(version.markup || 25)) / 100;
        const marginSite = (Number(version.markupSiteWork || 25)) / 100;
        const getGross = (net: number, isSite: boolean = false) => {
            const m = isSite ? marginSite : marginGlobal;
            return Math.round(m < 1 ? net / (1 - m) : net);
        };

        const totalSellingPrice = getGross(totals.hardwareCost) + 
                                getGross(totals.engCost) + 
                                getGross(totals.cablingCost) + 
                                getGross(totals.siteWorkCost, true) + 
                                getGross(totals.documentationCost) + 
                                getGross(totals.trainingCost);

        const summaryData: any[] = [
            ["Project Costing Summary", ""],
            ["", ""],
            ["Category", "Selling Price (RM)"],
            ["Hardware Total", { v: getGross(totals.hardwareCost), t: 'n', z: '"RM"#,##0' }],
            ["Engineering Total", { v: getGross(totals.engCost), t: 'n', z: '"RM"#,##0' }],
            ["Cabling & Installation Total", { v: getGross(totals.cablingCost), t: 'n', z: '"RM"#,##0' }],
            ["Site Work (Mandays/Mob/Lodging)", { v: getGross(totals.siteWorkCost, true), t: 'n', z: '"RM"#,##0' }],
            ["Project Training", { v: getGross(totals.trainingCost), t: 'n', z: '"RM"#,##0' }],
            ["", ""],
            ["PROJECT SELLING PRICE", { v: Math.round(totalSellingPrice), t: 'n', z: '"RM"#,##0' }],
            ["", ""],
            ["", ""],
            ["Section-wise Price Breakdown", ""],
            ["Section Name", "Hardware", "Engineering", "Cabling", "Site Work", "Doc", "Training", "Section Total"]
        ];

        totals.hierarchy.forEach(sys => {
            // Add Project Level Hardware if this is the first iteration and cost exists
            if (totals.projectLevelHardwareCost > 0 && summaryData.length === 17) {
                summaryData.push([
                    "Project Level Hardware",
                    getGross(totals.projectLevelHardwareCost),
                    0, 0, 0, 0, 0,
                    getGross(totals.projectLevelHardwareCost)
                ]);
            }

            sys.sections.forEach(sec => {
                summaryData.push([
                    sec.name,
                    getGross(sec.breakdown.hardware),
                    getGross(sec.breakdown.eng),
                    getGross(sec.breakdown.cabling),
                    getGross(sec.breakdown.siteWork, true),
                    getGross(sec.breakdown.documentation),
                    getGross(sec.breakdown.training),
                    getGross(sec.breakdown.hardware) + getGross(sec.breakdown.eng) + getGross(sec.breakdown.cabling) + getGross(sec.breakdown.siteWork, true) + getGross(sec.breakdown.documentation) + getGross(sec.breakdown.training)
                ]);
            });

            // Add System Direct Costs if any
            if (sys.directNet > 0) {
                summaryData.push([
                    `(Direct) ${sys.name}`,
                    getGross(sys.directBreakdown.hardware),
                    0, 0,
                    getGross(sys.directBreakdown.siteWork, true),
                    getGross(sys.directBreakdown.documentation),
                    getGross(sys.directBreakdown.training),
                    getGross(sys.directBreakdown.hardware) + getGross(sys.directBreakdown.siteWork, true) + getGross(sys.directBreakdown.documentation) + getGross(sys.directBreakdown.training)
                ]);
            }
        });

        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

        // Add some basic styling/formatting hints if possible (XLSX basic doesn't support much, but we can set column widths)
        // Add some basic styling/formatting
        summarySheet['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");
        XLSX.utils.book_append_sheet(wb, ioSheet, "IO Scope");
        XLSX.utils.book_append_sheet(wb, bomSheet, "Bill of Materials");
        if (eqData.length > 0) XLSX.utils.book_append_sheet(wb, eqSheet, "Equipment List");

        XLSX.writeFile(wb, `Pricing_Export_Rev${version.versionNumber}.xlsx`);
    };

    const exportToMarkdown = () => {
        if (!version) return;
        const totals = calculateVersionTotals(version);
        const effectiveMarkup = (typeof markupPercent === 'number' && !isNaN(markupPercent))
            ? markupPercent
            : parseMarkup(version.markup);
        const effectiveMarkupSite = (typeof markupSiteWork === 'number' && !isNaN(markupSiteWork))
            ? markupSiteWork
            : parseMarkup(version.markupSiteWork);

        const marginGlobal = effectiveMarkup / 100;
        const marginSite = effectiveMarkupSite / 100;

        const getGross = (net: number, isSiteWork: boolean = false) => {
            const m = isSiteWork ? marginSite : marginGlobal;
            return m < 1 ? net / (1 - m) : net;
        };

        const totalProjectPrice = getGross(totals.hardwareCost) + 
                                 getGross(totals.engCost) + 
                                 getGross(totals.cablingCost) + 
                                 getGross(totals.siteWorkCost, true) + 
                                 getGross(totals.documentationCost) + 
                                 getGross(totals.trainingCost);

        const fmt = (v: number) => `RM ${Number(v || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        let md = `# Clover Digital Sdn Bhd\n`;
        md += `### Project Costing & Engineering Specification\n\n`;
        md += `**Company Registration (BRN):** \`201501034912\` | **Address:** 7A Jalan PP 2/1, 47100 Puchong, Selangor\n\n`;
        md += `**Website:** [cloverdigital.com.my](https://cloverdigital.com.my) | **Email:** enquiry@cloverdigital.com.my\n\n`;
        md += `---\n\n`;

        md += `## 1. Project Information\n\n`;
        md += `| Attribute | Details |\n`;
        md += `| :--- | :--- |\n`;
        md += `| **Project Name** | ${version.project?.name || 'N/A'} |\n`;
        md += `| **Client** | ${version.project?.client?.name || 'Standard Client'} |\n`;
        md += `| **Site Location** | ${version.project?.location || 'N/A'} |\n`;
        md += `| **Design Revision** | Rev ${version.versionNumber} (${version.status}) |\n`;
        md += `| **Export Date** | ${new Date().toLocaleDateString('en-MY', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} |\n\n`;

        md += `## 2. Executive Cost & Pricing Summary\n\n`;
        md += `| Scope / Work Package | Net Cost (RM) | Target Margin | Selling Price (RM) |\n`;
        md += `| :--- | :--- | :--- | :--- |\n`;
        md += `| Hardware & Equipment BOM | ${fmt(totals.hardwareCost)} | ${effectiveMarkup.toFixed(0)}% | ${fmt(getGross(totals.hardwareCost))} |\n`;
        md += `| Engineering Base Services | ${fmt(totals.engCost)} | ${effectiveMarkup.toFixed(0)}% | ${fmt(getGross(totals.engCost))} |\n`;
        md += `| Cabling & Termination (${totals.totalIO} IO) | ${fmt(totals.cablingCost)} | ${effectiveMarkup.toFixed(0)}% | ${fmt(getGross(totals.cablingCost))} |\n`;
        md += `| Modular Site Work & Mandays | ${fmt(totals.siteWorkCost)} | ${effectiveMarkupSite.toFixed(0)}% | ${fmt(getGross(totals.siteWorkCost, true))} |\n`;
        md += `| Project Documentation | ${fmt(totals.documentationCost)} | ${effectiveMarkup.toFixed(0)}% | ${fmt(getGross(totals.documentationCost))} |\n`;
        md += `| Site Testing & Training | ${fmt(totals.trainingCost)} | ${effectiveMarkup.toFixed(0)}% | ${fmt(getGross(totals.trainingCost))} |\n`;
        md += `| **TOTAL PROJECT VALUE** | **${fmt(totals.totalNet)}** | -- | **${fmt(totalProjectPrice)}** |\n\n`;

        md += `## 3. Engineering Base Rates & Markup Settings\n\n`;
        const cs = version.costSettings || { engRateDigital: 0, engRateAnalog: 0, engRateHLI: 0, cablingCostPerIO: 0 };
        md += `| Parameter | Configured Value |\n`;
        md += `| :--- | :--- |\n`;
        md += `| Digital Signal Rate (DI/DO) | RM ${cs.engRateDigital} / point |\n`;
        md += `| Analog Signal Rate (AI/AO/RTD) | RM ${cs.engRateAnalog} / point |\n`;
        md += `| High-Level Interface (HLI) Rate | RM ${cs.engRateHLI} / point |\n`;
        md += `| Cabling Cost per IO | RM ${cs.cablingCostPerIO} / IO |\n`;
        md += `| Global Equipment Markup | ${effectiveMarkup.toFixed(1)}% |\n`;
        md += `| Site Services Markup | ${effectiveMarkupSite.toFixed(1)}% |\n\n`;

        md += `## 4. Overall IO Points Distribution\n\n`;
        md += `| Signal Type | Required Count | Description |\n`;
        md += `| :--- | :--- | :--- |\n`;
        md += `| **DI** | ${totals.diCount || 0} | Digital Inputs (Status, Alarms, Run Feedback) |\n`;
        md += `| **DO** | ${totals.doCount || 0} | Digital Outputs (Command, Start/Stop, Interlocks) |\n`;
        md += `| **AI** | ${totals.aiCount || 0} | Analog Inputs (4-20mA, 0-10V, Level/Pressure/Flow) |\n`;
        md += `| **AO** | ${totals.aoCount || 0} | Analog Outputs (Modulating Valves, VFD Speed) |\n`;
        md += `| **RTD** | ${totals.rtdCount || 0} | Resistance Temperature Detectors (PT100/PT1000) |\n`;
        md += `| **HLI** | ${totals.hli || 0} | High-Level Interface Communication Registers |\n`;
        md += `| **TOTAL I/O** | **${totals.totalIO}** | **Total System IO Points** |\n\n`;

        md += `## 5. System Architecture & Section Details\n\n`;
        (version.systems || []).forEach((sys, sysIdx) => {
            let sysTotalIO = 0;
            let sysDI = 0, sysDO = 0, sysAI = 0, sysAO = 0, sysRTD = 0, sysHLI = 0;
            (sys.sections || []).forEach(sec => {
                (sec.ioRequirements || []).forEach(io => {
                    if (io.ioType === 'DI') sysDI += io.quantity;
                    else if (io.ioType === 'DO') sysDO += io.quantity;
                    else if (io.ioType === 'AI') sysAI += io.quantity;
                    else if (io.ioType === 'AO') sysAO += io.quantity;
                    else if (io.ioType === 'RTD') sysRTD += io.quantity;
                    else if (io.ioType === 'HLI') sysHLI += io.quantity;
                    sysTotalIO += io.quantity;
                });
                (sec.equipment || []).forEach(eq => {
                    const q = Number(eq.quantity) || 1;
                    (eq.io || []).forEach(io => {
                        const count = io.quantity * q;
                        if (io.ioType === 'DI') sysDI += count;
                        else if (io.ioType === 'DO') sysDO += count;
                        else if (io.ioType === 'AI') sysAI += count;
                        else if (io.ioType === 'AO') sysAO += count;
                        else if (io.ioType === 'RTD') sysRTD += count;
                        else if (io.ioType === 'HLI') sysHLI += count;
                        sysTotalIO += count;
                    });
                });
            });

            md += `### 5.${sysIdx + 1} System: ${sys.name}\n\n`;
            md += `**Total System IO:** ${sysTotalIO} pts (DI: ${sysDI}, DO: ${sysDO}, AI: ${sysAI}, AO: ${sysAO}, RTD: ${sysRTD}, HLI: ${sysHLI})\n\n`;

            if (sys.sections.length === 0) {
                md += `*No sections created under this system.*\n\n`;
            } else {
                sys.sections.forEach((sec, secIdx) => {
                    md += `#### 5.${sysIdx + 1}.${secIdx + 1} Section: ${sec.name}\n\n`;

                    md += `**Direct IO Requirements:**\n`;
                    if (sec.ioRequirements.length === 0) {
                        md += `- None defined\n`;
                    } else {
                        sec.ioRequirements.forEach(r => {
                            md += `- **${r.ioType}:** ${r.quantity} points\n`;
                        });
                    }
                    md += `\n`;

                    if (sec.equipment && sec.equipment.length > 0) {
                        md += `**Equipment Scope:**\n\n`;
                        md += `| Equipment Name | Qty | Associated IO |\n`;
                        md += `| :--- | :--- | :--- |\n`;
                        sec.equipment.forEach(eq => {
                            const ioStr = (eq.io || []).map(i => `${i.quantity * (Number(eq.quantity) || 1)}x ${i.ioType}`).join(', ') || 'None';
                            md += `| ${eq.name} | ${eq.quantity} | ${ioStr} |\n`;
                        });
                        md += `\n`;
                    }

                    md += `**Section Services & Site Work:**\n`;
                    md += `- Mandays: RM ${Number(sec.mandays || 0).toLocaleString()}\n`;
                    md += `- Mobilization: RM ${Number(sec.mobilization || 0).toLocaleString()}\n`;
                    md += `- Lodging: RM ${Number(sec.lodging || 0).toLocaleString()}\n`;
                    md += `- Documentation: RM ${Number(sec.documentation || 0).toLocaleString()}\n`;
                    md += `- Training: RM ${Number(sec.training || 0).toLocaleString()}\n\n`;
                });
            }
        });

        md += `## 6. Structured Bill of Materials (BOM)\n\n`;
        md += `| Scope | Component / Item | Brand / Model | Category | Qty | Unit Price (RM) | Total Price (RM) |\n`;
        md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

        const projComps = (version.components || []).filter(c => !c.systemId && !c.sectionId);
        projComps.forEach(c => {
            md += `| Project Level | ${c.componentName} | ${c.catalog?.brand || 'Generic'} ${c.catalog?.model || ''} | ${c.catalog?.category || 'Misc'} | ${c.quantity} | ${Number(c.snapshottedPrice).toLocaleString()} | ${(Number(c.snapshottedPrice) * c.quantity).toLocaleString()} |\n`;
        });

        (version.systems || []).forEach(sys => {
            const sysComps = (version.components || []).filter(c => c.systemId === sys.id && !c.sectionId);
            sysComps.forEach(c => {
                md += `| System: ${sys.name} | ${c.componentName} | ${c.catalog?.brand || 'Generic'} ${c.catalog?.model || ''} | ${c.catalog?.category || 'Misc'} | ${c.quantity} | ${Number(c.snapshottedPrice).toLocaleString()} | ${(Number(c.snapshottedPrice) * c.quantity).toLocaleString()} |\n`;
            });
            (sys.sections || []).forEach(sec => {
                const secComps = (version.components || []).filter(c => c.sectionId === sec.id);
                secComps.forEach(c => {
                    md += `| ${sys.name} > ${sec.name} | ${c.componentName} | ${c.catalog?.brand || 'Generic'} ${c.catalog?.model || ''} | ${c.catalog?.category || 'Misc'} | ${c.quantity} | ${Number(c.snapshottedPrice).toLocaleString()} | ${(Number(c.snapshottedPrice) * c.quantity).toLocaleString()} |\n`;
                });
            });
        });

        md += `\n---\n`;
        md += `*Exported from Clover Digital Project Costing Platform (v1.0.0).*\n`;

        const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const sanitizedName = (version.project?.name || 'Project').replace(/[^a-zA-Z0-9_-]/g, '_');
        link.download = `${sanitizedName}_Rev${version.versionNumber}_Design.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (loading) return <div className="p-12 text-center text-slate-500 font-bold text-xs uppercase tracking-widest animate-pulse">Loading editor...</div>;
    if (!version) return <div className="p-12 text-center text-red-500 font-bold text-xs uppercase tracking-widest">Version not found</div>;

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-900/90 p-4 sm:p-6 rounded-2xl border border-slate-800 shadow-xl">
                <div>
                    <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">{version.project?.name || 'Loading...'}</h1>
                            <span className="text-slate-600">/</span>
                            <span className="text-base sm:text-lg font-bold text-slate-400">{version.project?.client?.name || 'No Client'}</span>
                        </div>
                        {version.project?.location && (
                            <div className="flex items-center gap-1.5 text-blue-400 font-bold text-xs uppercase tracking-wider">
                                <Plus size={12} /> {version.project.location}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3 text-xs sm:text-sm font-medium text-slate-400 mt-2">
                        <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1 rounded-full text-slate-300">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Rev</span>
                            <select
                                value={version.id}
                                onChange={(e) => navigate(`/projects/${projectId}/versions/${e.target.value}`)}
                                className="bg-transparent border-none font-bold text-white focus:ring-0 cursor-pointer p-0 text-xs"
                            >
                                {allVersions.map((v: any) => (
                                    <option key={v.id} value={v.id} className="bg-slate-900 text-white">
                                        {v.versionNumber} {v.status === 'Draft' ? '(Draft)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <span className={cn("px-3 py-1 rounded-full uppercase text-[10px] font-bold tracking-widest border",
                            version.status === 'Draft' ? "bg-amber-950/60 text-amber-300 border-amber-900/60" : "bg-emerald-950/60 text-emerald-300 border-emerald-900/60")}>
                            {version.status}
                        </span>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full lg:w-auto">
                    <button
                        onClick={exportToMarkdown}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 bg-blue-950/70 text-blue-300 border border-blue-900/60 font-bold rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-md text-xs uppercase tracking-wider"
                        title="Export full project specification as Markdown"
                    >
                        <FileText size={15} /> Export MD
                    </button>
                    <button
                        onClick={exportToExcel}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 bg-emerald-950/70 text-emerald-300 border border-emerald-900/60 font-bold rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-md text-xs uppercase tracking-wider"
                    >
                        <Download size={15} /> Export Excel
                    </button>
                    <button
                        onClick={saveAsNewVersion}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 bg-slate-800 text-slate-200 border border-slate-700 font-bold rounded-xl hover:bg-slate-750 hover:text-white transition-colors shadow-md text-xs uppercase tracking-wider"
                    >
                        <Layers size={15} /> Save As New
                    </button>
                    <button
                        onClick={addSystem}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-blue-600 text-white px-3.5 sm:px-4 py-2 rounded-xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/30 text-xs uppercase tracking-wider"
                    >
                        <Plus size={15} /> New System
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-2xl w-full sm:w-fit overflow-x-auto custom-scrollbar shadow-lg">
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
                            "px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap shrink-0",
                            activeTab === tab.id
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-bold"
                                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
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
                            <div key={system.id} className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/90 shadow-xl hover:border-slate-700 transition-all">
                                <div
                                    className="flex items-center justify-between p-5 bg-slate-950/60 cursor-pointer"
                                    onClick={() => toggleSystem(system.id)}
                                >
                                    <div className="flex items-center gap-3 font-bold text-white text-lg">
                                        <div className={cn("p-1 rounded-md transition-transform", expandedSystems.has(system.id) ? "rotate-0" : "-rotate-90")}>
                                            <ChevronDown size={20} className="text-slate-400" />
                                        </div>
                                        {system.name}
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); addSection(system.id); }}
                                        className="text-xs font-bold flex items-center gap-1.5 text-blue-400 bg-blue-950/60 border border-blue-900/60 px-3 py-1.5 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                    >
                                        <Plus size={14} /> Add Project Section
                                    </button>
                                </div>

                                {expandedSystems.has(system.id) && (
                                    <div className="p-6 space-y-6 border-t border-slate-800">
                                        {system.sections.length === 0 && <div className="text-sm text-slate-500 italic px-2">No sections defined for this system.</div>}
                                        {system.sections.map(section => (
                                            <SectionEditor key={section.id} section={section} onUpdate={updateIO} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {version.systems.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 bg-slate-900/60 rounded-3xl border border-dashed border-slate-800 text-slate-400 space-y-4">
                                <Plus size={48} className="text-slate-600" />
                                <div className="text-center">
                                    <div className="font-bold text-white">No Systems Defined</div>
                                    <div className="text-sm text-slate-500">Click "New System" to start building your architecture.</div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'hardware' && <AdvancedBOM version={version} onUpdate={fetchVersionDetails} setVersion={setVersion} />}
                {activeTab === 'site' && <SiteSettings version={version} onUpdate={fetchVersionDetails} />}
                {activeTab === 'summary' && <CostSummary version={version} onUpdate={fetchVersionDetails} markupPercent={markupPercent} setMarkupPercent={setMarkupPercent} markupSiteWork={markupSiteWork} setMarkupSiteWork={setMarkupSiteWork} />}

            </div>
        </div>
    );
};

// --- Subcomponents ---

// ... (types)

const SectionEditor: React.FC<{
    section: Section;
    onUpdate: (id: string, reqs: IORequirement[]) => void
}> = ({ section, onUpdate }) => {
    const [activeSectionTab, setActiveSectionTab] = useState<'signals' | 'equipment'>('signals');
    const [isEditingIO, setIsEditingIO] = useState(false);
    const [requirements, setRequirements] = useState<IORequirement[]>(section.ioRequirements);
    const ioTypes = ['DI', 'DO', 'AI', 'AO', 'RTD', 'HLI'] as const;

    // Section Name Editing
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState(section.name);

    // Equipment State
    const [isAddingEquipment, setIsAddingEquipment] = useState(false);
    const [editingEquipmentId, setEditingEquipmentId] = useState<string | null>(null);
    const [newEqName, setNewEqName] = useState('');
    const [newEqQty, setNewEqQty] = useState(1);
    const [newEqIO, setNewEqIO] = useState<{ ioType: string, quantity: number }[]>([]);

    useEffect(() => {
        setRequirements(section.ioRequirements);
    }, [section.ioRequirements]);

    const handleSaveIO = () => {
        onUpdate(section.id, requirements);
        setIsEditingIO(false);
    };

    const handleUpdateSectionName = async () => {
        if (!editedName || editedName === section.name) {
            setIsEditingName(false);
            return;
        }
        try {
            await api.put(`/versions/sections/${section.id}/fields`, { name: editedName });
            setIsEditingName(false);
            window.location.reload();
        } catch (error) {
            alert("Error updating section name");
        }
    };

    const addIORow = () => {
        setRequirements([...requirements, { id: Math.random().toString(), ioType: 'DI', quantity: 0 }]);
    };

    const updateIORow = (index: number, field: keyof IORequirement, value: any) => {
        const newReqs = [...requirements];
        newReqs[index] = { ...newReqs[index], [field]: value };
        setRequirements(newReqs);
    };

    const removeIORow = (index: number) => {
        setRequirements(requirements.filter((_, i) => i !== index));
    };

    const addEquipment = async () => {
        if (!newEqName) return;
        try {
            await api.post(`/equipment/sections/${section.id}/equipment`, {
                name: newEqName,
                quantity: newEqQty,
                io: newEqIO
            });
            setIsAddingEquipment(false);
            setNewEqName('');
            setNewEqQty(1);
            setNewEqIO([]);
            window.location.reload();
        } catch (error) {
            alert("Error adding equipment");
        }
    };

    const handleEditEquipment = (eq: any) => {
        setEditingEquipmentId(eq.id);
        setNewEqName(eq.name);
        setNewEqQty(eq.quantity);
        setNewEqIO(eq.io.map((i: any) => ({ ioType: i.ioType, quantity: i.quantity })));
        setIsAddingEquipment(true);
    };

    const handleUpdateEquipment = async () => {
        if (!newEqName || !editingEquipmentId) return;
        try {
            await api.put(`/equipment/${editingEquipmentId}`, {
                name: newEqName,
                quantity: newEqQty,
                io: newEqIO
            });
            setIsAddingEquipment(false);
            setEditingEquipmentId(null);
            setNewEqName('');
            setNewEqQty(1);
            setNewEqIO([]);
            window.location.reload();
        } catch (error) {
            alert("Error updating equipment");
        }
    };

    const deleteEquipment = async (id: string) => {
        if (!confirm("Delete this equipment?")) return;
        try {
            await api.delete(`/equipment/${id}`);
            window.location.reload();
        } catch (error) {
            alert("Error deleting equipment");
        }
    };

    const groupedIO = section.ioRequirements.reduce((acc, curr) => {
        acc[curr.ioType] = (acc[curr.ioType] || 0) + curr.quantity;
        return acc;
    }, {} as Record<string, number>);

    // Total IO including equipment
    const totalWithEq = { ...groupedIO };
    (section.equipment || []).forEach(eq => {
        eq.io.forEach(io => {
            totalWithEq[io.ioType] = (totalWithEq[io.ioType] || 0) + (io.quantity * eq.quantity);
        });
    });

    return (
        <div className="py-2">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <div className="h-4 w-4 rounded-full bg-blue-600 shadow-lg shadow-blue-200"></div>
                    <div className="flex flex-col">
                        {isEditingName ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={editedName}
                                    onChange={(e) => setEditedName(e.target.value)}
                                    className="font-black text-slate-900 text-lg uppercase tracking-tight border-b-2 border-blue-600 outline-none bg-transparent"
                                    autoFocus
                                    onBlur={handleUpdateSectionName}
                                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateSectionName()}
                                />
                                <button onClick={handleUpdateSectionName} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md">
                                    <Check size={18} />
                                </button>
                                <button onClick={() => { setIsEditingName(false); setEditedName(section.name); }} className="p-1 text-red-600 hover:bg-red-50 rounded-md">
                                    <X size={18} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 group">
                                <h4 className="font-black text-slate-900 text-lg uppercase tracking-tight">{section.name}</h4>
                                <button
                                    onClick={() => setIsEditingName(true)}
                                    className="p-1 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <Edit2 size={14} />
                                </button>
                            </div>
                        )}
                        <div className="flex gap-4 mt-2">
                            <button
                                onClick={() => setActiveSectionTab('signals')}
                                className={cn("text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-lg transition-all",
                                    activeSectionTab === 'signals' ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}
                            >
                                Base Signals
                            </button>
                            <button
                                onClick={() => setActiveSectionTab('equipment')}
                                className={cn("text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-lg transition-all",
                                    activeSectionTab === 'equipment' ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}
                            >
                                Equipment Config ({section.equipment?.length || 0})
                            </button>
                        </div>
                    </div>
                </div>
                {activeSectionTab === 'signals' && (
                    <button
                        onClick={() => setIsEditingIO(!isEditingIO)}
                        className={cn("text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl transition-all shadow-sm",
                            isEditingIO ? "bg-slate-200 text-slate-600" : "bg-white border-2 border-slate-100 text-blue-600 hover:border-blue-600")}
                    >
                        {isEditingIO ? 'Discard' : 'Configure Signals'}
                    </button>
                )}
            </div>

            {activeSectionTab === 'signals' ? (
                !isEditingIO ? (
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 animate-in fade-in duration-500">
                        {ioTypes.map(type => (
                            <div key={type} className={cn("p-4 rounded-2xl border transition-all",
                                totalWithEq[type] > 0 ? "bg-white border-blue-100 shadow-sm ring-1 ring-blue-50" : "bg-slate-50/50 border-slate-100 opacity-60")}>
                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{type}</div>
                                <div className="flex items-baseline gap-2">
                                    <div className="text-xl font-black text-slate-900">{totalWithEq[type] || 0}</div>
                                    {totalWithEq[type] > groupedIO[type] && (
                                        <div className="text-[10px] font-bold text-blue-500">({groupedIO[type]}+{totalWithEq[type] - groupedIO[type]}eq)</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-slate-50/50 p-8 rounded-[2rem] border-2 border-slate-100 space-y-4 shadow-inner">
                        <div className="grid grid-cols-1 gap-3">
                            {requirements.map((req, idx) => (
                                <div key={idx} className="flex gap-4 items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                                    <select
                                        value={req.ioType}
                                        onChange={(e) => updateIORow(idx, 'ioType', e.target.value as any)}
                                        className="border-none bg-slate-50 rounded-xl px-5 py-3 text-sm font-black text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 w-40"
                                    >
                                        {ioTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    <input
                                        type="number"
                                        min="0"
                                        value={req.quantity}
                                        onChange={(e) => updateIORow(idx, 'quantity', parseInt(e.target.value) || 0)}
                                        className="border-none bg-slate-50 rounded-xl px-5 py-3 text-sm font-black text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 w-32 text-center"
                                    />
                                    <div className="flex-1"></div>
                                    <button onClick={() => removeIORow(idx)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between items-center mt-8 pt-8 border-t border-slate-200">
                            <button onClick={addIORow} className="flex items-center gap-2 bg-white text-slate-900 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 border-slate-100 hover:border-slate-300 transition-all shadow-sm">
                                <Plus size={16} /> New Signal Group
                            </button>
                            <button onClick={handleSaveIO} className="flex items-center gap-3 bg-emerald-600 text-white px-10 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100">
                                <Save size={18} /> Apply Logic
                            </button>
                        </div>
                    </div>
                )
            ) : (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(section.equipment || []).map(eq => (
                            <div key={eq.id} className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm group">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h5 className="font-black text-slate-900 uppercase tracking-tight">{eq.name}</h5>
                                        <p className="text-[10px] font-bold text-slate-400">Qty: {eq.quantity}</p>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => handleEditEquipment(eq)}
                                            className="p-2 text-slate-200 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => deleteEquipment(eq.id)}
                                            className="p-2 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {eq.io.map((io, i) => (
                                        <span key={i} className="text-[9px] font-black bg-slate-50 px-2 py-1 rounded-lg text-slate-500 border border-slate-100 uppercase">
                                            {io.quantity} {io.ioType}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}

                        <button
                            onClick={() => setIsAddingEquipment(true)}
                            className="border-2 border-dashed border-slate-200 rounded-3xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-all group"
                        >
                            <Plus size={24} className="group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-widest mt-2">Add New Equipment</span>
                        </button>
                    </div>

                    {isAddingEquipment && (
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                            <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                                        {editingEquipmentId ? 'Edit Equipment' : 'Configure New Equipment'}
                                    </h3>
                                    <button
                                        onClick={() => { setIsAddingEquipment(false); setEditingEquipmentId(null); setNewEqName(''); setNewEqQty(1); setNewEqIO([]); }}
                                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Equipment Name</label>
                                        <input
                                            type="text"
                                            value={newEqName}
                                            onChange={(e) => setNewEqName(e.target.value)}
                                            placeholder="e.g. Pump Station Control"
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-inner"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Quantity</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={newEqQty}
                                                onChange={(e) => setNewEqQty(parseInt(e.target.value) || 1)}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-inner"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">IO Configuration (Per Unit)</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {ioTypes.map(type => (
                                                <div key={type} className="space-y-2">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{type}</span>
                                                    <input
                                                        type="number"
                                                        placeholder="0"
                                                        onChange={(e) => {
                                                            const qty = parseInt(e.target.value) || 0;
                                                            const existing = newEqIO.find(i => i.ioType === type);
                                                            if (existing) {
                                                                setNewEqIO(newEqIO.map(i => i.ioType === type ? { ...i, quantity: qty } : i));
                                                            } else {
                                                                setNewEqIO([...newEqIO, { ioType: type, quantity: qty }]);
                                                            }
                                                        }}
                                                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-4 mt-10">
                                    <button
                                        onClick={() => { setIsAddingEquipment(false); setEditingEquipmentId(null); setNewEqName(''); setNewEqQty(1); setNewEqIO([]); }}
                                        className="px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all font-sans"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={editingEquipmentId ? handleUpdateEquipment : addEquipment}
                                        className="px-10 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 font-sans"
                                    >
                                        {editingEquipmentId ? 'Update Configuration' : 'Save Configuration'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// --- Advanced BOM Component ---

const AdvancedBOM: React.FC<{ 
    version: ProjectVersion; 
    onUpdate: () => void;
    setVersion?: React.Dispatch<React.SetStateAction<ProjectVersion | null>>;
}> = ({ version, onUpdate, setVersion }) => {
    const [catalog, setCatalog] = useState<any[]>([]);
    const [activeTarget, setActiveTarget] = useState<{ type: 'project' | 'system' | 'section'; id?: string } | null>({ type: 'project' });
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const [isProjectLevelCollapsed, setIsProjectLevelCollapsed] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [catalogSearch, setCatalogSearch] = useState<string>('');
    const [catalogTab, setCatalogTab] = useState<'components' | 'packages'>('components');
    const [mobileTab, setMobileTab] = useState<'bom' | 'catalog'>('bom');
    const [packages, setPackages] = useState<any[]>([]);

    const toggleCollapse = (id: string) => {
        const newCollapsed = new Set(collapsed);
        if (newCollapsed.has(id)) newCollapsed.delete(id);
        else newCollapsed.add(id);
        setCollapsed(newCollapsed);
    };

    useEffect(() => {
        api.get('/components').then((res: any) => setCatalog(res.data));
        api.get('/packages').then((res: any) => setPackages(res.data));
    }, []);

    const categories = Array.from(new Set(catalog.map(c => c.category))).sort();

    const filteredCatalog = catalog.filter(c => {
        const matchesCategory = categoryFilter === 'all' || c.category === categoryFilter;
        const q = catalogSearch.toLowerCase().trim();
        const matchesSearch = !q ||
            (c.model || '').toLowerCase().includes(q) ||
            (c.brand || '').toLowerCase().includes(q) ||
            (c.category || '').toLowerCase().includes(q);
        return matchesCategory && matchesSearch;
    });

    const addComponent = async (catalogId: string) => {
        const target = activeTarget || { type: 'project' };
        try {
            await api.post(`/versions/${version.id}/components`, {
                catalogId,
                quantity: 1,
                systemId: target.type === 'system' ? target.id : null,
                sectionId: target.type === 'section' ? target.id : null
            });
            onUpdate();
        } catch (error) {
            alert("Error adding component");
        }
    };

    const addPackage = async (packageId: string) => {
        const target = activeTarget || { type: 'project' };
        try {
            await api.post(`/packages/${packageId}/add-to-version/${version.id}`, {
                systemId: target.type === 'system' ? target.id : null,
                sectionId: target.type === 'section' ? target.id : null
            });
            onUpdate();
        } catch (error) {
            alert("Error adding package");
        }
    };

    const addMiscItem = async () => {
        const target = activeTarget || { type: 'project' };
        const description = prompt("Item Description:");
        if (!description) return;
        const qty = prompt("Quantity:", "1");
        if (!qty) return;
        const price = prompt("Unit Price (RM):", "0");
        if (price === null) return;

        try {
            await api.post(`/versions/${version.id}/components`, {
                componentName: description,
                quantity: Number(qty),
                snapshottedPrice: Number(price),
                systemId: target.type === 'system' ? target.id : null,
                sectionId: target.type === 'section' ? target.id : null
            });
            onUpdate();
        } catch (error: any) {
            const msg = error.response?.data?.details || error.response?.data?.error || "Unknown Error";
            alert(`Error adding misc item: ${msg}`);
        }
    };

    const removeComponent = async (id: string) => {
        if (!confirm("Remove this component?")) return;
        try {
            await api.delete(`/versions/components/${id}`);
            onUpdate();
        } catch (error) {
            console.error(error);
        }
    };

    const updateComponentQty = async (id: string, qty: number) => {
        if (qty < 1) return;
        if (setVersion) {
            setVersion(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    components: prev.components.map(c => c.id === id ? { ...c, quantity: qty } : c)
                };
            });
        }
        try {
            await api.put(`/versions/components/${id}`, { quantity: qty });
            onUpdate();
        } catch (error) {
            console.error(error);
            onUpdate();
        }
    };

    const updateComponentItem = async (id: string, fields: any) => {
        try {
            await api.put(`/versions/components/${id}`, fields);
            onUpdate();
        } catch (error) {
            alert("Error updating item");
        }
    };

    const calculateProvidedIO = (sectionId: string) => {
        const sectionComponents = version.components.filter(c => c.sectionId === sectionId);
        const provided: Record<string, number> = { DI: 0, DO: 0, AI: 0, AO: 0, RTD: 0, HLI: 0 };

        sectionComponents.forEach(c => {
            const specs = c.catalog?.ioSpecs || {};
            Object.entries(specs).forEach(([type, count]) => {
                const numCount = typeof count === 'number' ? count : parseInt(count as string) || 0;
                provided[type] = (provided[type] || 0) + (numCount * c.quantity);
            });
        });
        return provided;
    };

    const projectLevelComps = version.components.filter(c => !c.systemId && !c.sectionId);
    const projectLevelCost = projectLevelComps.reduce((acc, c) => acc + (Number(c.snapshottedPrice) * c.quantity), 0);

    return (
        <div className="space-y-4">
            {/* Mobile View Switcher (Item 7 & 9) */}
            <div className="lg:hidden flex p-1 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg">
                <button
                    onClick={() => setMobileTab('bom')}
                    className={cn(
                        "flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2",
                        mobileTab === 'bom' ? "bg-blue-600 text-white shadow-md font-bold" : "text-slate-400 hover:text-white"
                    )}
                >
                    <Layers size={14} /> BOM Hierarchy
                </button>
                <button
                    onClick={() => setMobileTab('catalog')}
                    className={cn(
                        "flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2",
                        mobileTab === 'catalog' ? "bg-blue-600 text-white shadow-md font-bold" : "text-slate-400 hover:text-white"
                    )}
                >
                    <Package size={14} /> Catalog ({filteredCatalog.length})
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start lg:h-[calc(100vh-15rem)]">
                {/* Left/Center: Architecture & Hierarchy with independent vertical scroll (detached) */}
                <div className={cn("lg:col-span-3 h-full flex flex-col min-h-0", mobileTab === 'catalog' && "hidden lg:flex")}>
                    <div className="flex-1 flex flex-col min-h-0 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
                        <div className="shrink-0 p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-900/95">
                            <div>
                                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">Structured Bill of Materials</h3>
                                <p className="text-slate-400 text-xs font-medium">Select a target level below to add items from the catalog</p>
                            </div>
                            <div className="flex flex-wrap gap-2.5">
                                <button
                                    onClick={addMiscItem}
                                    className="flex items-center gap-2 bg-slate-800 text-slate-200 border border-slate-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-750 hover:text-white transition-all shadow-sm"
                                >
                                    <Plus size={14} /> Add Misc. Item
                                </button>
                                <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                                    <span className="text-[10px] font-black uppercase text-slate-400">Live Assignment Mode</span>
                                </div>
                            </div>
                        </div>

                        {/* Scrollable Center Hierarchy with independent vertical scrollbar */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar min-h-0">
                            {/* Project Level Hardware - Collapsible */}
                            <div className={cn("p-4 sm:p-5 rounded-2xl border transition-all",
                                activeTarget?.type === 'project'
                                    ? "border-blue-500 bg-blue-950/20 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/40"
                                    : "border-slate-800 bg-slate-950/60 hover:border-slate-700")}>
                                <div
                                    className="flex justify-between items-center cursor-pointer select-none"
                                    onClick={() => setIsProjectLevelCollapsed(!isProjectLevelCollapsed)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-slate-850 border border-slate-700/60 rounded-lg flex items-center justify-center text-blue-400 shadow-sm">
                                            <Layers size={16} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="font-bold text-white uppercase tracking-tight text-sm sm:base">Project Level Hardware</h4>
                                                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-800 text-slate-300 rounded-full border border-slate-700/60">
                                                    {projectLevelComps.length} items • RM{projectLevelCost.toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-slate-400">Software, Workstations, Global Infra</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveTarget({ type: 'project' });
                                                setMobileTab('catalog');
                                            }}
                                            className={cn("text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider transition-all",
                                                activeTarget?.type === 'project'
                                                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                                                    : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white")}
                                        >
                                            {activeTarget?.type === 'project' ? 'Selected' : '+ Add Item'}
                                        </button>
                                        <div className="p-1 text-slate-400 hover:text-white transition-colors">
                                            <ChevronDown size={18} className={cn("transition-transform duration-200", isProjectLevelCollapsed ? "-rotate-90" : "rotate-0")} />
                                        </div>
                                    </div>
                                </div>
                                {!isProjectLevelCollapsed && (
                                    <div className="mt-3 pt-3 border-t border-slate-800/80">
                                        <ComponentsList
                                            components={projectLevelComps}
                                            onRemove={removeComponent}
                                            onUpdateQty={updateComponentQty}
                                            onUpdateItem={updateComponentItem}
                                            columns="grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* System Hierarchy */}
                            {version.systems.map(sys => {
                                const systemTotalIO = (sys.sections || []).reduce((acc: any, sec: any) => {
                                    (sec.ioRequirements || []).forEach((io: any) => {
                                        acc[io.ioType] = (acc[io.ioType] || 0) + Number(io.quantity || 0);
                                        acc.total = (acc.total || 0) + Number(io.quantity || 0);
                                    });
                                    (sec.equipment || []).forEach((eq: any) => {
                                        const eqQty = Number(eq.quantity) || 1;
                                        (eq.io || []).forEach((io: any) => {
                                            const count = Number(io.quantity || 0) * eqQty;
                                            acc[io.ioType] = (acc[io.ioType] || 0) + count;
                                            acc.total = (acc.total || 0) + count;
                                        });
                                    });
                                    return acc;
                                }, { DI: 0, DO: 0, AI: 0, AO: 0, RTD: 0, HLI: 0, total: 0 });

                                return (
                                    <div key={sys.id} className="space-y-3">
                                        <div className={cn("p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer",
                                            activeTarget?.type === 'system' && activeTarget.id === sys.id
                                                ? "border-blue-500 bg-blue-950/20 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/40"
                                                : "border-slate-800 bg-slate-950/60 hover:border-slate-700")}
                                            onClick={() => setActiveTarget({ type: 'system', id: sys.id })}>
                                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-8 h-8 bg-slate-800 border border-slate-700/60 rounded-xl flex items-center justify-center text-slate-300 hover:text-white transition-colors shrink-0"
                                                        onClick={(e) => { e.stopPropagation(); toggleCollapse(sys.id); }}
                                                    >
                                                        <ChevronDown size={16} className={cn("transition-transform duration-300", collapsed.has(sys.id) ? "-rotate-90" : "rotate-0")} />
                                                    </div>
                                                    <h4 className="font-black text-white uppercase tracking-tight text-sm sm:text-base">System: {sys.name}</h4>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveTarget({ type: 'system', id: sys.id });
                                                            setMobileTab('catalog');
                                                        }}
                                                        className={cn("text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider transition-all",
                                                            activeTarget?.type === 'system' && activeTarget.id === sys.id
                                                                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                                                                : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white")}
                                                    >
                                                        {activeTarget?.type === 'system' && activeTarget.id === sys.id ? 'Selected' : '+ Add Item'}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Total IO Summary at System Area */}
                                            <div className="flex flex-wrap items-center gap-2 pt-2.5 mt-2 border-t border-slate-800/80">
                                                <div className="px-2.5 py-1 bg-blue-950/60 border border-blue-900/60 rounded-lg flex items-center gap-1.5">
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-300">Total System I/O:</span>
                                                    <span className="text-xs font-black text-blue-200">{systemTotalIO.total} pts</span>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-bold">
                                                    <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-300">DI: <span className="text-white font-black">{systemTotalIO.DI}</span></span>
                                                    <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-300">DO: <span className="text-white font-black">{systemTotalIO.DO}</span></span>
                                                    <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-300">AI: <span className="text-white font-black">{systemTotalIO.AI}</span></span>
                                                    <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-300">AO: <span className="text-white font-black">{systemTotalIO.AO}</span></span>
                                                    <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-300">RTD: <span className="text-white font-black">{systemTotalIO.RTD}</span></span>
                                                    <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-300">HLI: <span className="text-white font-black">{systemTotalIO.HLI}</span></span>
                                                </div>
                                            </div>

                                            {!collapsed.has(sys.id) && (
                                                <div className="mt-3 pt-3 border-t border-slate-800/60">
                                                    <ComponentsList
                                                        components={version.components.filter(c => c.systemId === sys.id && !c.sectionId)}
                                                        onRemove={removeComponent}
                                                        onUpdateQty={updateComponentQty}
                                                        onUpdateItem={updateComponentItem}
                                                        columns="grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {!collapsed.has(sys.id) && (
                                            <div className={cn("ml-2 sm:ml-4", sys.sections.length > 1 ? "grid grid-cols-1 xl:grid-cols-2 gap-3" : "space-y-3")}>
                                                {sys.sections.map(sec => {
                                                    const requiredIO = sec.ioRequirements.reduce((acc, curr) => ({ ...acc, [curr.ioType]: (acc[curr.ioType] || 0) + curr.quantity }), {} as any);

                                                    (sec.equipment || []).forEach(eq => {
                                                        const eqQty = Number(eq.quantity) || 1;
                                                        eq.io.forEach(io => {
                                                            requiredIO[io.ioType] = (requiredIO[io.ioType] || 0) + (io.quantity * eqQty);
                                                        });
                                                    });

                                                    const providedIO = calculateProvidedIO(sec.id);

                                                    return (
                                                        <div key={sec.id} className={cn("p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer bg-slate-900/90 relative overflow-hidden flex flex-col justify-between",
                                                            activeTarget?.type === 'section' && activeTarget.id === sec.id
                                                                ? "border-blue-500 bg-blue-950/20 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/40"
                                                                : "border-slate-800 hover:border-slate-700")}
                                                            onClick={() => setActiveTarget({ type: 'section', id: sec.id })}>
                                                            <div>
                                                                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2 mb-3">
                                                                    <div className="flex items-center gap-2.5">
                                                                        <div
                                                                            className="w-6 h-6 bg-blue-950/80 border border-blue-900/60 rounded-lg flex items-center justify-center text-blue-400 hover:text-white transition-colors shrink-0"
                                                                            onClick={(e) => { e.stopPropagation(); toggleCollapse(sec.id); }}
                                                                        >
                                                                            <ChevronDown size={13} className={cn("transition-transform duration-300", collapsed.has(sec.id) ? "-rotate-90" : "rotate-0")} />
                                                                        </div>
                                                                        <div>
                                                                            <h5 className="font-black text-white text-xs sm:text-sm uppercase tracking-tight">{sec.name}</h5>
                                                                            <p className="text-[9px] font-bold text-slate-400">Assigned Hardware & IO Analysis</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setActiveTarget({ type: 'section', id: sec.id });
                                                                                setMobileTab('catalog');
                                                                            }}
                                                                            className={cn("text-[9px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider transition-all",
                                                                                activeTarget?.type === 'section' && activeTarget.id === sec.id
                                                                                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                                                                                    : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white")}
                                                                        >
                                                                            {activeTarget?.type === 'section' && activeTarget.id === sec.id ? 'Selected' : '+ Add Item'}
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                {!collapsed.has(sec.id) && (
                                                                    <>
                                                                        {/* IO Comparison Table - Compact */}
                                                                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 mb-3">
                                                                            {['DI', 'DO', 'AI', 'AO', 'RTD', 'HLI'].map(type => {
                                                                                const req = requiredIO[type] || 0;
                                                                                const prov = providedIO[type] || 0;
                                                                                const diff = prov - req;
                                                                                const perc = req > 0 ? (prov / req) * 100 : 0;

                                                                                const getStatusColor = () => {
                                                                                    if (perc < 100) return 'red';
                                                                                    if (perc < 130) return 'amber';
                                                                                    return 'emerald';
                                                                                };
                                                                                const color = getStatusColor();
                                                                                const colorClasses = {
                                                                                    red: 'text-red-400 bg-red-950/60 border-red-900/60',
                                                                                    amber: 'text-amber-400 bg-amber-950/60 border-amber-900/60',
                                                                                    emerald: 'text-emerald-400 bg-emerald-950/60 border-emerald-900/60'
                                                                                };

                                                                                return (
                                                                                    <div key={type} className={cn("p-1.5 rounded-lg border transition-all",
                                                                                        req > 0 ? "bg-slate-950/90 border-slate-800" : "bg-slate-950/40 border-slate-800/40 opacity-40")}>
                                                                                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5">{type}</div>
                                                                                        <div className="space-y-0.5">
                                                                                            <div className="flex justify-between text-[8px] font-bold">
                                                                                                <span className="text-slate-500">R:{req}</span>
                                                                                                <span className={colorClasses[color].split(' ')[0]}>P:{prov}</span>
                                                                                            </div>
                                                                                            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                                                                                                <div
                                                                                                    className={cn("h-full transition-all",
                                                                                                        color === 'red' ? 'bg-red-500' : color === 'amber' ? 'bg-amber-500' : 'bg-emerald-500')}
                                                                                                    style={{ width: `${Math.min(perc, 100)}%` }}
                                                                                                ></div>
                                                                                            </div>
                                                                                            <div className="flex justify-between items-center mt-0.5">
                                                                                                <span className={cn("text-[7.5px] font-black px-1 py-0.2 rounded border", colorClasses[color])}>
                                                                                                    {diff >= 0 ? `+${diff}` : diff}
                                                                                                </span>
                                                                                                {req > 0 && <span className="text-[7.5px] font-medium text-slate-500">{perc.toFixed(0)}%</span>}
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>

                                                                        <ComponentsList
                                                                            components={version.components.filter(c => c.sectionId === sec.id)}
                                                                            onRemove={removeComponent}
                                                                            onUpdateQty={updateComponentQty}
                                                                            onUpdateItem={updateComponentItem}
                                                                            columns={sys.sections.length > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"}
                                                                        />
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right: Catalog - Separate container with independent scroll & 1 item per row */}
                <div className={cn("lg:col-span-1 h-full flex flex-col min-h-0", mobileTab === 'bom' && "hidden lg:flex")}>
                    <div className="h-full flex flex-col min-h-0 bg-slate-900/95 border border-slate-800 rounded-2xl p-3 sm:p-3.5 shadow-xl overflow-hidden">
                        {/* Target Selection Dropdown */}
                        <div className="shrink-0 space-y-2 mb-2.5 pb-2.5 border-b border-slate-800">
                            <div className="flex items-center gap-1.5 p-2 bg-slate-950 border border-slate-800 rounded-xl">
                                <span className="text-[9px] font-bold text-slate-400 uppercase shrink-0">Add To:</span>
                                <select
                                    value={activeTarget ? `${activeTarget.type}:${activeTarget.id || ''}` : 'project:'}
                                    onChange={(e) => {
                                        const [type, id] = e.target.value.split(':');
                                        setActiveTarget({ type: type as any, id: id || undefined });
                                    }}
                                    className="flex-1 bg-transparent text-xs font-bold text-blue-400 outline-none truncate cursor-pointer"
                                >
                                    <option value="project:" className="bg-slate-900 text-white">Project Level Hardware</option>
                                    {version.systems.map(sys => (
                                        <React.Fragment key={sys.id}>
                                            <option value={`system:${sys.id}`} className="bg-slate-900 text-white">System: {sys.name}</option>
                                            {sys.sections.map(sec => (
                                                <option key={sec.id} value={`section:${sec.id}`} className="bg-slate-900 text-slate-300">&nbsp;&nbsp;↳ {sec.name}</option>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </select>
                            </div>

                            {/* Catalog Tab Toggle */}
                            <div className="flex gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl">
                                <button
                                    onClick={() => setCatalogTab('components')}
                                    className={cn("flex-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                                        catalogTab === 'components' ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" : "text-slate-400 hover:text-white")}
                                >
                                    Components
                                </button>
                                <button
                                    onClick={() => setCatalogTab('packages')}
                                    className={cn("flex-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                                        catalogTab === 'packages' ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" : "text-slate-400 hover:text-white")}
                                >
                                    Packages
                                </button>
                            </div>

                            {catalogTab === 'components' && (
                                <div className="space-y-1.5">
                                    <input
                                        type="text"
                                        placeholder="Search model, brand..."
                                        value={catalogSearch}
                                        onChange={(e) => setCatalogSearch(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none"
                                    />
                                    <div className="flex justify-between items-center px-1">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{filteredCatalog.length} Items</span>
                                        <select
                                            value={categoryFilter}
                                            onChange={(e) => setCategoryFilter(e.target.value)}
                                            className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-blue-400 outline-none cursor-pointer max-w-[130px] truncate"
                                        >
                                            <option value="all">All Categories</option>
                                            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Independently Scrollable Catalog List: 1 item per row (detached) */}
                        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-0">
                            {catalogTab === 'components' ? (
                                <div className="space-y-2">
                                    {filteredCatalog.map(item => (
                                        <div
                                            key={item.id}
                                            className="p-2.5 bg-slate-950/80 hover:bg-slate-900 border border-slate-800/80 hover:border-blue-500/60 rounded-xl group transition-all cursor-pointer flex items-center justify-between gap-2.5"
                                            onClick={() => addComponent(item.id)}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <span className="text-[8px] font-black uppercase text-blue-400 bg-blue-950/70 border border-blue-900/40 px-1.5 py-0.5 rounded truncate max-w-[85px]">
                                                        {item.category}
                                                    </span>
                                                    <span className="text-[8.5px] font-semibold text-slate-400 truncate">
                                                        {item.brand}
                                                    </span>
                                                </div>
                                                <div className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors truncate" title={item.model}>
                                                    {item.model}
                                                </div>
                                                <div className="flex items-center justify-between mt-1 text-[9px]">
                                                    <span className="text-emerald-400 font-bold">RM{Number(item.listPrice).toLocaleString()}</span>
                                                    {item.ioSpecs && Object.keys(item.ioSpecs).length > 0 && (
                                                        <div className="flex gap-1">
                                                            {Object.entries(item.ioSpecs as Record<string, any>).slice(0, 2).map(([type, qty]) => (
                                                                <span key={type} className="text-[7.5px] font-bold bg-slate-900 px-1 py-0.5 rounded text-slate-300 border border-slate-800">
                                                                    {String(qty)} {type}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="p-1.5 bg-slate-800 group-hover:bg-blue-600 text-slate-400 group-hover:text-white rounded-lg transition-colors shrink-0 shadow-sm">
                                                <Plus size={14} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {packages.map(pkg => (
                                        <div key={pkg.id}
                                            className="p-3 bg-slate-950/80 border border-slate-800 hover:border-blue-500/60 rounded-xl group transition-all cursor-pointer relative"
                                            onClick={() => addPackage(pkg.id)}>
                                            <div className="flex justify-between items-start mb-1.5">
                                                <div className="p-1.5 bg-slate-850 rounded-lg text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                    <Package size={14} />
                                                </div>
                                                <div className="p-1 bg-slate-800 rounded-md text-slate-400 group-hover:text-white group-hover:bg-blue-600 transition-all">
                                                    <Plus size={12} />
                                                </div>
                                            </div>
                                            <div className="text-xs font-black text-white uppercase tracking-tight mb-0.5">{pkg.name}</div>
                                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider line-clamp-2">{pkg.description || 'Hardware package.'}</div>
                                            <div className="mt-2 pt-2 border-t border-slate-800/80 flex flex-col gap-0.5">
                                                {pkg.items.slice(0, 2).map((item: any) => (
                                                    <div key={item.id} className="flex justify-between text-[8px] font-bold text-slate-400 uppercase">
                                                        <span className="truncate pr-2">{item.catalog?.model}</span>
                                                        <span className="text-slate-200 shrink-0">x{item.quantity}</span>
                                                    </div>
                                                ))}
                                                {pkg.items.length > 2 && <div className="text-[8px] font-bold text-blue-400 uppercase">+{pkg.items.length - 2} items</div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {catalogTab === 'components' && filteredCatalog.length === 0 && (
                                <div className="text-center py-12 text-slate-500 font-bold uppercase text-[10px] tracking-wider">No matching components</div>
                            )}
                            {catalogTab === 'packages' && packages.length === 0 && (
                                <div className="text-center py-12 text-slate-500 font-bold uppercase text-[10px] tracking-wider">No packages defined</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ComponentsList: React.FC<{
    components: ProjectComponent[];
    onRemove: (id: string) => void;
    onUpdateQty?: (id: string, qty: number) => void;
    onUpdateItem?: (id: string, fields: any) => void;
    columns?: string;
}> = ({ components, onRemove, onUpdateQty, onUpdateItem, columns }) => {
    const handleUpdateMisc = (id: string, currentName: string, currentPrice: number | string) => {
        const newName = prompt("Update Description:", currentName);
        if (newName === null) return;
        const newPrice = prompt("Update Unit Price (RM):", String(currentPrice));
        if (newPrice === null) return;

        if (onUpdateItem) {
            onUpdateItem(id, {
                componentName: newName,
                snapshottedPrice: Number(newPrice)
            });
        }
    };

    return (
        <div>
            {components.length === 0 ? (
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center py-4 border border-dashed border-slate-800 rounded-xl">
                    No items assigned
                </div>
            ) : (
                <div className={cn("grid gap-2.5", columns || "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3")}>
                    {components.map(c => (
                        <div
                            key={c.id}
                            className="bg-slate-950/90 border border-slate-800/80 hover:border-slate-700 rounded-xl p-2.5 flex flex-col justify-between group transition-all relative hover:shadow-md"
                        >
                            {/* Card Top: Category, Brand, Actions */}
                            <div className="flex items-center justify-between gap-1 mb-1.5">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-[8px] font-black uppercase text-blue-400 bg-blue-950/70 border border-blue-900/50 px-1.5 py-0.5 rounded truncate max-w-[85px]">
                                        {c.catalog?.category || 'Misc'}
                                    </span>
                                    {c.catalog?.brand && (
                                        <span className="text-[8px] font-semibold text-slate-400 truncate max-w-[75px]">
                                            {c.catalog.brand}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    {!c.catalogId && (
                                        <button
                                            onClick={() => handleUpdateMisc(c.id, c.componentName, c.snapshottedPrice)}
                                            className="p-1 text-[8px] font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-all"
                                            title="Edit Description & Price"
                                        >
                                            <Edit2 size={10} />
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onRemove(c.id); }}
                                        className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all opacity-60 group-hover:opacity-100"
                                        title="Remove component"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>

                            {/* Card Middle: Component Name & Unit Price */}
                            <div className="mb-2">
                                <div className="text-xs font-bold text-white uppercase tracking-tight truncate" title={c.componentName}>
                                    {c.componentName}
                                </div>
                                <div className="text-[9px] text-slate-400 mt-0.5">
                                    RM{Number(c.snapshottedPrice).toLocaleString()} ea
                                </div>
                            </div>

                            {/* Card Bottom: Qty Stepper on Left, Subtotal on Right */}
                            <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/80 mt-auto">
                                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                                    {onUpdateQty && (
                                        <button
                                            onClick={() => onUpdateQty(c.id, Math.max(1, c.quantity - 1))}
                                            className="px-1.5 py-0.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-xs font-bold"
                                            title="Decrease quantity"
                                        >
                                            -
                                        </button>
                                    )}
                                    <input
                                        type="number"
                                        min="1"
                                        value={c.quantity}
                                        onChange={(e) => onUpdateQty && onUpdateQty(c.id, Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-8 text-center text-[11px] font-black text-white bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    {onUpdateQty && (
                                        <button
                                            onClick={() => onUpdateQty(c.id, c.quantity + 1)}
                                            className="px-1.5 py-0.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-xs font-bold"
                                            title="Increase quantity"
                                        >
                                            +
                                        </button>
                                    )}
                                </div>

                                <div className="text-right">
                                    <span className="text-[11px] font-black text-emerald-400">
                                        RM{(Number(c.snapshottedPrice) * c.quantity).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

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
        <div className="space-y-8 sm:space-y-12 pb-20">
            {/* Engineering Rates Section */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl">
                <div className="mb-6 sm:mb-8">
                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">Engineering Base Rates</h3>
                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">Global rates per IO type for this version</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
                    {[
                        { label: 'Digital (DI/DO)', key: 'engRateDigital', count: totals.digital },
                        { label: 'Analog (AI/AO/RTD)', key: 'engRateAnalog', count: totals.analog },
                        { label: 'HLI / Integration', key: 'engRateHLI', count: totals.hli },
                    ].map(field => (
                        <div key={field.key} className="space-y-3 p-5 bg-slate-950 rounded-2xl border border-slate-800">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{field.label}</label>
                            <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-black text-sm">RM</span>
                                <input
                                    type="number"
                                    value={(settings as any)[field.key]}
                                    onChange={e => setSettings({ ...settings, [field.key]: Number(e.target.value) })}
                                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-12 pr-4 py-2.5 font-black text-base text-white focus:border-blue-500 outline-none transition-all"
                                />
                            </div>
                            <div className="flex justify-between items-center pt-1 text-[9px] font-bold">
                                <span className="text-slate-400 uppercase">Total {field.count} IO</span>
                                <span className="text-blue-400 font-black">Subtotal: RM{(field.count * (settings as any)[field.key]).toLocaleString()}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="space-y-3 p-5 bg-blue-950/40 rounded-2xl border border-blue-900/50 mb-8">
                    <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">Global Cabling & Installation (RM/IO)</label>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
                        <div className="relative group w-full sm:w-60">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 font-black text-sm">RM</span>
                            <input
                                type="number"
                                value={settings.cablingCostPerIO}
                                onChange={e => setSettings({ ...settings, cablingCostPerIO: Number(e.target.value) })}
                                className="w-full bg-slate-900 border border-blue-900/60 rounded-xl pl-12 pr-4 py-2.5 font-black text-base text-white focus:border-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div className="text-[11px] font-black text-blue-300 uppercase">
                            Project Total: RM{(totals.totalIO * settings.cablingCostPerIO).toLocaleString()}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-5 border-t border-slate-800">
                    <button onClick={handleSaveSettings} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-6 sm:px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all shadow-lg shadow-blue-600/30 active:scale-95">
                        Apply Global Rates
                    </button>
                </div>
            </div>

            {/* Site Work & Modular Costs */}
            <div className="space-y-6">
                <h3 className="text-lg sm:text-xl font-black text-white ml-2 uppercase tracking-wider">Modular Site Work & Services</h3>
                {version.systems.map(sys => (
                    <div key={sys.id} className="space-y-4">
                        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl">
                            <div className="flex justify-between items-start mb-5">
                                <h4 className="font-black text-white uppercase tracking-tight text-base sm:text-lg">System: {sys.name}</h4>
                            </div>
                            <SiteWorkInputs
                                data={sys}
                                onSave={(fields) => updateSystemFields(sys.id, fields)}
                                ioCount={sys.sections.reduce((acc, s) => acc + s.ioRequirements.reduce((a, i) => a + i.quantity, 0), 0)}
                                cablingRate={settings.cablingCostPerIO}
                            />
                        </div>
                        {sys.sections.map(sec => (
                            <div key={sec.id} className="ml-2 sm:ml-6 md:ml-10 bg-slate-950 border border-slate-800/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-inner">
                                <h5 className="font-bold text-slate-300 uppercase text-xs mb-5 tracking-wider">Section: {sec.name}</h5>
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
    onSave: (fields: any) => Promise<void> | void;
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

    const [isSaved, setIsSaved] = useState(false);

    const updateField = (key: string, part: 'rate' | 'qty', val: number) => {
        setDetails((prev: any) => ({
            ...prev,
            [key]: { ...prev[key], [part]: val }
        }));
    };

    const handleSave = async () => {
        const payload: any = { siteWorkDetails: details };
        // Flatten totals for legacy compatibility and main logic
        Object.keys(details).forEach(key => {
            payload[key] = details[key].rate * details[key].qty;
        });
        await onSave(payload);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2500);
    };

    const siteSubtotal = Object.values(details).reduce((acc: number, f: any) => acc + (f.rate * f.qty), 0);
    const cablingCost = ioCount * cablingRate;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
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
                        <div key={f.key} className="p-4 bg-slate-900 border border-slate-800 rounded-xl shadow-sm hover:border-slate-700 transition-colors">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">{f.label}</label>

                            <div className="space-y-2.5">
                                <div>
                                    <div className="text-[8px] font-bold text-slate-400 uppercase mb-1">Unit Rate (RM)</div>
                                    <input
                                        type="number"
                                        value={field.rate}
                                        onChange={e => updateField(f.key, 'rate', Number(e.target.value))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-black text-white focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>

                                <div>
                                    <div className="text-[8px] font-bold text-slate-400 uppercase mb-1">Quantity</div>
                                    <input
                                        type="number"
                                        value={field.qty}
                                        onChange={e => updateField(f.key, 'qty', Number(e.target.value))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-black text-white focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>

                                <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-[10px]">
                                    <span className="font-bold text-slate-400 uppercase text-[8px]">Subtotal</span>
                                    <span className="font-black text-white">RM{total.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5 sm:p-6 bg-slate-950 border border-slate-800 rounded-2xl text-white shadow-xl">
                <div className="flex flex-wrap items-center gap-6 sm:gap-10">
                    <div>
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Subtotal Site Work</div>
                        <div className="text-lg sm:text-xl font-black text-white">RM{siteSubtotal.toLocaleString()}</div>
                    </div>
                    <div className="border-l border-slate-800 pl-6 sm:pl-10">
                        <div className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-0.5">Cabling ({ioCount} IO)</div>
                        <div className="text-lg sm:text-xl font-black text-blue-200">RM{cablingCost.toLocaleString()}</div>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    className={cn(
                        "w-full sm:w-auto px-6 sm:px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2",
                        isSaved ? "bg-emerald-600 text-white" : "bg-blue-600 hover:bg-blue-500 text-white"
                    )}
                >
                    {isSaved ? (
                        <>
                            <Check size={14} className="text-white" />
                            Saved!
                        </>
                    ) : (
                        <>
                            <Save size={14} />
                            Save Changes
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

const CostSummary: React.FC<{
    version: ProjectVersion;
    onUpdate: () => void;
    markupPercent: number;
    setMarkupPercent: (v: number) => void;
    markupSiteWork: number;
    setMarkupSiteWork: (v: number) => void;
}> = ({ version, onUpdate, markupPercent, setMarkupPercent, markupSiteWork, setMarkupSiteWork }) => {
    const totals = calculateVersionTotals(version);
    const [isSaving, setIsSaving] = useState(false);

    const marginGlobal = markupPercent / 100;
    const marginSite = markupSiteWork / 100;

    const getGross = (net: number, isSiteWork: boolean = false) => {
        const m = isSiteWork ? marginSite : marginGlobal;
        return m < 1 ? net / (1 - m) : net;
    };

    const totalProjectPrice = getGross(totals.hardwareCost) + 
                             getGross(totals.engCost) + 
                             getGross(totals.cablingCost) + 
                             getGross(totals.siteWorkCost, true) + 
                             getGross(totals.documentationCost) + 
                             getGross(totals.trainingCost);

    const handleSaveMarkup = async () => {
        setIsSaving(true);
        try {
            await api.put(`/versions/${version.id}`, { 
                markup: markupPercent,
                markupSiteWork: markupSiteWork 
            });
            onUpdate();
            alert("Markups saved successfully");
        } catch (error) {
            alert("Error saving markups");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-10 animate-in fade-in zoom-in-95 duration-500 pb-20">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <SummaryCard label="Points of IO" value={totals.totalIO} unit="Pt" />
                <SummaryCard 
                    label="Hardware Selling Price" 
                    value={`RM${getGross(totals.hardwareCost).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} 
                    subValue={`Net: RM${totals.hardwareCost.toLocaleString()}`}
                    color="text-blue-400" 
                />
                <SummaryCard 
                    label="Services & Site Selling Price" 
                    value={`RM${(getGross(totals.engCost) + getGross(totals.siteWorkCost, true) + getGross(totals.cablingCost) + getGross(totals.documentationCost) + getGross(totals.trainingCost)).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} 
                    subValue={`Net: RM${(totals.engCost + totals.siteWorkCost + totals.cablingCost + totals.documentationCost + totals.trainingCost).toLocaleString()}`}
                    color="text-indigo-400" 
                />
                <div className="p-8 sm:p-10 rounded-[2.5rem] shadow-2xl bg-slate-900 text-white relative overflow-hidden group border border-slate-800 flex flex-col justify-between">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-700">
                        <Save size={100} />
                    </div>
                    <div>
                        <div className="text-[10px] text-blue-400 font-black uppercase tracking-[0.3em] mb-3 group-hover:text-blue-300 transition-colors">Total Project Selling Price</div>
                        <div className="text-4xl sm:text-5xl font-black text-white leading-none tracking-tighter">RM{totalProjectPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                        <div className="text-[10px] text-slate-400 font-bold mt-2">Net Cost: RM{totals.totalNet.toLocaleString()}</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl">
                    <h3 className="text-xl sm:text-2xl font-black text-white mb-8 flex items-center gap-3">
                        <div className="w-1.5 h-8 bg-blue-500 rounded-full"></div>
                        Cost Distribution (Selling Price)
                    </h3>
                    <div className="space-y-6">
                        <CostItem label="Systems Architecture (Hardware)" amount={totals.hardwareCost} total={totals.totalNet} color="bg-blue-600" markupPercent={markupPercent} />
                        <CostItem label="Engineering Services" amount={totals.engCost} total={totals.totalNet} color="bg-indigo-600" markupPercent={markupPercent} />
                        <CostItem label="Cabling & Installation" amount={totals.cablingCost} total={totals.totalNet} color="bg-emerald-500" markupPercent={markupPercent} />
                        <CostItem label="Site Work (Mandays/Mob/Lodging)" amount={totals.siteWorkCost} total={totals.totalNet} color="bg-teal-500" markupPercent={markupSiteWork} />
                        <CostItem label="Project Documentation" amount={totals.documentationCost} total={totals.totalNet} color="bg-amber-500" markupPercent={markupPercent} />
                        <CostItem label="Project Training" amount={totals.trainingCost} total={totals.totalNet} color="bg-orange-500" markupPercent={markupPercent} />
                    </div>
                </div>

                <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col relative overflow-hidden group">
                    <div className="flex flex-col gap-6 relative z-10 flex-1">
                        <h3 className="text-lg font-black uppercase tracking-widest text-slate-300">Markup Settings</h3>
                        
                        <div className="space-y-3.5">
                            <div className="flex justify-between items-center bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Global Markup</span>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={markupPercent}
                                        onChange={(e) => setMarkupPercent(Number(e.target.value) || 0)}
                                        className="bg-transparent border-none text-right font-black text-xl w-16 focus:ring-0 p-0 text-white"
                                    />
                                    <span className="text-xs font-bold text-slate-500">%</span>
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-center bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Site Work Markup</span>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={markupSiteWork}
                                        onChange={(e) => setMarkupSiteWork(Number(e.target.value) || 0)}
                                        className="bg-transparent border-none text-right font-black text-xl w-16 focus:ring-0 p-0 text-white"
                                    />
                                    <span className="text-xs font-bold text-slate-500">%</span>
                                </div>
                            </div>

                            <button
                                onClick={handleSaveMarkup}
                                disabled={isSaving}
                                className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl transition-all disabled:opacity-50 font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 active:scale-[0.98]"
                            >
                                <Save size={15} />
                                {isSaving ? 'Saving...' : 'Save All Margins'}
                            </button>
                        </div>

                        <div className="mt-auto space-y-3 pt-6 border-t border-slate-800">
                            <div className="flex justify-between items-center text-xs text-slate-400 font-bold">
                                <span>Project Net Cost</span>
                                <span className="text-sm font-black text-white">RM{totals.totalNet.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs text-slate-400 font-bold">
                                <span>Total Margin RM</span>
                                <span className="text-sm font-black text-emerald-400">RM{(totalProjectPrice - totals.totalNet).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            </div>
                            <div className="pt-4 border-t border-slate-800/80">
                                <div className="text-blue-400 uppercase text-[9px] font-black tracking-widest mb-1">Final Selling Price</div>
                                <div className="text-3xl sm:text-4xl font-black tracking-tighter text-white">
                                    RM{totalProjectPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl overflow-hidden">
                <h3 className="text-xl sm:text-2xl font-black text-white mb-8 flex items-center gap-3">
                    <div className="w-1.5 h-8 bg-emerald-500 rounded-full"></div>
                    System & Section Price Breakdown
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="border-b border-slate-800 text-[9px] font-black uppercase tracking-wider text-slate-400">
                                <th className="pb-4">Hierarchy Name</th>
                                <th className="pb-4">Hardware</th>
                                <th className="pb-4">Eng</th>
                                <th className="pb-4">Cabling</th>
                                <th className="pb-4">Site Work</th>
                                <th className="pb-4">Doc</th>
                                <th className="pb-4">Training</th>
                                <th className="pb-4">Net Total</th>
                                <th className="pb-4">Gross Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                            {totals.projectLevelHardwareCost > 0 && (
                                <tr className="hover:bg-slate-850/60 transition-colors bg-blue-950/20 italic">
                                    <td className="py-3.5 pr-4">
                                        <div className="font-bold text-blue-300 uppercase tracking-tight">Project Level Hardware</div>
                                        <div className="text-[9px] font-bold text-blue-500">Global Items</div>
                                    </td>
                                    <td className="py-3.5">
                                        <div className="font-bold text-white">RM{getGross(totals.projectLevelHardwareCost).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                                        <div className="text-[9px] text-slate-400">RM{totals.projectLevelHardwareCost.toLocaleString()}</div>
                                    </td>
                                    <td colSpan={5}></td>
                                    <td className="py-3.5 font-bold text-slate-300">RM{totals.projectLevelHardwareCost.toLocaleString()}</td>
                                    <td className="py-3.5 font-black text-blue-400">RM{getGross(totals.projectLevelHardwareCost).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                </tr>
                            )}
                            {totals.hierarchy.map(sys => {
                                const sysGross = getGross(sys.breakdown.hardware) + 
                                               getGross(sys.breakdown.eng) + 
                                               getGross(sys.breakdown.cabling) + 
                                               getGross(sys.breakdown.siteWork, true) + 
                                               getGross(sys.breakdown.documentation) + 
                                               getGross(sys.breakdown.training);

                                return (
                                    <React.Fragment key={sys.id}>
                                        <tr className="hover:bg-slate-850/60 transition-colors bg-slate-950/40">
                                            <td className="py-4 pr-4">
                                                <div className="font-bold text-white uppercase tracking-tight">{sys.name}</div>
                                                <div className="text-[9px] font-bold text-blue-400 uppercase">System Level</div>
                                            </td>
                                            {[
                                                { val: sys.breakdown.hardware, isSite: false },
                                                { val: sys.breakdown.eng, isSite: false },
                                                { val: sys.breakdown.cabling, isSite: false },
                                                { val: sys.breakdown.siteWork, isSite: true },
                                                { val: sys.breakdown.documentation, isSite: false },
                                                { val: sys.breakdown.training, isSite: false }
                                            ].map((item, i) => {
                                                const val = item.val;
                                                const grossVal = getGross(val, item.isSite);
                                                return (
                                                    <td key={i} className="py-4">
                                                        <div className="font-bold text-white">RM{grossVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                                                        <div className="text-[9px] text-slate-400">RM{val.toLocaleString()}</div>
                                                    </td>
                                                );
                                            })}
                                            <td className="py-4 font-bold text-slate-300">RM{sys.net.toLocaleString()}</td>
                                            <td className="py-4 font-black text-blue-400">RM{sysGross.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                        </tr>
                                        {sys.directNet > 0 && (
                                            <tr className="hover:bg-slate-850/60 transition-colors italic text-[11px] bg-amber-950/10">
                                                <td className="py-2.5 pl-6 pr-4 border-l-2 border-amber-500/50">
                                                    <div className="font-bold text-amber-300">(Direct System Costs)</div>
                                                </td>
                                                {[
                                                    { val: sys.directBreakdown.hardware, isSite: false },
                                                    { val: 0, isSite: false },
                                                    { val: 0, isSite: false },
                                                    { val: sys.directBreakdown.siteWork, isSite: true },
                                                    { val: sys.directBreakdown.documentation, isSite: false },
                                                    { val: sys.directBreakdown.training, isSite: false }
                                                ].map((item, i) => {
                                                    const val = item.val;
                                                    const grossVal = getGross(val, item.isSite);
                                                    return (
                                                        <td key={i} className="py-2.5">
                                                            <div className="text-amber-300 font-bold">RM{grossVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                                                            <div className="text-[9px] text-amber-500/70">RM{val.toLocaleString()}</div>
                                                        </td>
                                                    );
                                                })}
                                                <td className="py-2.5 font-bold text-amber-400">RM{sys.directNet.toLocaleString()}</td>
                                                <td className="py-2.5 font-black text-amber-300">RM{(getGross(sys.directBreakdown.hardware) + getGross(sys.directBreakdown.siteWork, true) + getGross(sys.directBreakdown.documentation) + getGross(sys.directBreakdown.training)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                            </tr>
                                        )}
                                        {sys.sections.map(sec => {
                                            const secGross = getGross(sec.breakdown.hardware) + 
                                                           getGross(sec.breakdown.eng) + 
                                                           getGross(sec.breakdown.cabling) + 
                                                           getGross(sec.breakdown.siteWork, true) + 
                                                           getGross(sec.breakdown.documentation) + 
                                                           getGross(sec.breakdown.training);
                                            return (
                                                <tr key={sec.id} className="hover:bg-slate-850/60 transition-colors text-[11px]">
                                                    <td className="py-3 pl-6 pr-4 border-l-2 border-slate-800">
                                                        <div className="font-bold text-slate-300">{sec.name}</div>
                                                        <div className="text-[8px] font-bold text-slate-500 uppercase">Section</div>
                                                    </td>
                                                    {[
                                                        { val: sec.breakdown.hardware, isSite: false },
                                                        { val: sec.breakdown.eng, isSite: false },
                                                        { val: sec.breakdown.cabling, isSite: false },
                                                        { val: sec.breakdown.siteWork, isSite: true },
                                                        { val: sec.breakdown.documentation, isSite: false },
                                                        { val: sec.breakdown.training, isSite: false }
                                                    ].map((item, i) => {
                                                        const val = item.val;
                                                        const grossVal = getGross(val, item.isSite);
                                                        return (
                                                            <td key={i} className="py-3">
                                                                <div className="font-bold text-slate-200">RM{grossVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                                                                <div className="text-[9px] text-slate-500">RM{val.toLocaleString()}</div>
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="py-3 font-bold text-slate-400">RM{sec.net.toLocaleString()}</td>
                                                    <td className="py-3 font-bold text-slate-200">RM{secGross.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
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

const SummaryCard = ({ label, value, subValue, unit, color = "text-white" }: { label: string; value: any; subValue?: string; unit?: string; color?: string }) => (
    <div className="bg-slate-900 p-6 sm:p-8 border border-slate-800 rounded-3xl shadow-xl hover:border-slate-700 transition-all duration-300">
        <div className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mb-2">{label}</div>
        <div className={cn("text-3xl sm:text-4xl font-black leading-none tracking-tight", color)}>
            {value}
            {unit && <span className="text-xs font-bold opacity-40 ml-1.5 uppercase tracking-wider">{unit}</span>}
        </div>
        {subValue && <div className="text-[10px] text-slate-400 font-medium mt-1.5">{subValue}</div>}
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
            <div className="flex justify-between items-end text-[10px] font-bold uppercase tracking-wider mb-2">
                <span className="text-slate-200">{label}</span>
                <div className="flex flex-col items-end">
                    <span className="text-[9px] text-slate-400 font-bold mb-0.5">Net: RM{amount.toLocaleString()}</span>
                    <span className="text-white font-black text-xs">Selling: RM{grossVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
            </div>
            <div className="w-full bg-slate-950 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-800">
                <div
                    className={cn("h-full rounded-full transition-all duration-700 ease-out", color)}
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
            <div className="flex justify-end mt-1">
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">{percentage.toFixed(1)}% weight</span>
            </div>
        </div>
    );
};

export default ProjectEditor;
