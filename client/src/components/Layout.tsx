import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Database,
    ChevronLeft,
    ChevronRight,
    Bell,
    User,
    Search,
    Users,
    Menu,
    X,
    Info,
    Globe,
    Mail,
    MapPin
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showCompanyInfo, setShowCompanyInfo] = useState(false);

    const navItems = [
        { label: 'Projects', icon: LayoutDashboard, path: '/' },
        { label: 'Clients', icon: Users, path: '/clients' },
        { label: 'Component Library', icon: Database, path: '/components' },
    ];

    const currentPage = navItems.find(item => item.path === location.pathname) || { label: 'Dashboard' };

    return (
        <div className="min-h-screen bg-slate-50 flex overflow-hidden">
            {/* Mobile Backdrop */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "bg-slate-900 text-white flex flex-col transition-all duration-300 ease-in-out z-50 shadow-2xl",
                    "fixed inset-y-0 left-0 md:static",
                    isMobileMenuOpen ? "translate-x-0 w-72" : "-translate-x-full md:translate-x-0",
                    isCollapsed ? "md:w-20" : "md:w-64"
                )}
            >
                {/* Sidebar Header */}
                <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800/60 overflow-hidden shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-white/10 p-1 flex items-center justify-center shrink-0 border border-white/10 shadow-md">
                            <img
                                src="/logo.png"
                                alt="Clover Digital"
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                    // Fallback if image fails to load
                                    (e.target as HTMLElement).style.display = 'none';
                                }}
                            />
                        </div>
                        {(!isCollapsed || isMobileMenuOpen) && (
                            <div className="flex flex-col min-w-0 animate-in fade-in duration-300">
                                <span className="text-sm font-black tracking-tight whitespace-nowrap text-white truncate">Clover Digital</span>
                                <span className="text-[10px] text-blue-400 font-bold whitespace-nowrap tracking-wider">v1.0.0 Production</span>
                            </div>
                        )}
                    </div>

                    {/* Mobile Close Button */}
                    <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Sidebar Nav */}
                <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto custom-scrollbar">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative",
                                    isActive
                                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                                        : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                                )}
                            >
                                <Icon size={20} className={cn("shrink-0", isActive ? "text-white" : "group-hover:text-white")} />
                                {(!isCollapsed || isMobileMenuOpen) && (
                                    <span className="animate-in fade-in slide-in-from-left-2 duration-300 font-bold text-xs uppercase tracking-wider">
                                        {item.label}
                                    </span>
                                )}
                                {isCollapsed && !isMobileMenuOpen && isActive && (
                                    <div className="absolute left-0 w-1 h-6 bg-blue-500 rounded-r-full" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Company Info Button & Dropdown */}
                {(!isCollapsed || isMobileMenuOpen) && (
                    <div className="px-3 pb-3">
                        <button
                            onClick={() => setShowCompanyInfo(!showCompanyInfo)}
                            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 text-slate-400 hover:text-white transition-all text-left border border-slate-700/30"
                        >
                            <div className="flex items-center gap-2">
                                <Info size={14} className="text-blue-400 shrink-0" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Company Info</span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-500">{showCompanyInfo ? 'Hide' : 'View'}</span>
                        </button>

                        {showCompanyInfo && (
                            <div className="mt-2 p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2 text-[10px] text-slate-300 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                <div className="font-bold text-white uppercase text-[11px] tracking-tight">Clover Digital Sdn Bhd</div>
                                <div className="text-slate-400 font-mono text-[9px]">BRN: 201501034912</div>
                                <div className="flex items-start gap-1.5 text-slate-400 pt-1 border-t border-slate-800/80">
                                    <MapPin size={12} className="shrink-0 text-slate-400 mt-0.5" />
                                    <span>7A Jalan PP 2/1, 47100 Puchong, Selangor</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-400">
                                    <Globe size={12} className="shrink-0 text-slate-400" />
                                    <a href="https://cloverdigital.com.my" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">cloverdigital.com.my</a>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-400">
                                    <Mail size={12} className="shrink-0 text-slate-400" />
                                    <a href="mailto:enquiry@cloverdigital.com.my" className="text-blue-400 hover:underline">enquiry@cloverdigital.com.my</a>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Sidebar Desktop Collapse Toggle */}
                <div className="p-3 border-t border-slate-800/50 shrink-0 hidden md:block">
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="w-full h-10 flex items-center justify-center gap-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {isCollapsed ? <ChevronRight size={20} /> : (
                            <>
                                <ChevronLeft size={20} />
                                <span className="text-xs font-bold uppercase tracking-wider">Collapse Menu</span>
                            </>
                        )}
                    </button>
                </div>
            </aside>

            {/* Main Wrapper */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top Navbar */}
                <header
                    className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-30 shrink-0 shadow-sm"
                >
                    <div className="flex items-center gap-3">
                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                            aria-label="Open menu"
                        >
                            <Menu size={22} />
                        </button>

                        <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">
                            {currentPage.label}
                        </h2>

                        <div className="hidden lg:flex items-center bg-slate-100 rounded-xl px-3 py-1.5 gap-2 border border-slate-200/50 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                            <Search size={16} className="text-slate-400" />
                            <input
                                type="text"
                                placeholder="Global Search..."
                                className="bg-transparent border-none text-xs outline-none w-44 font-medium placeholder:text-slate-400"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors relative">
                            <Bell size={18} />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                        </button>
                        <div className="h-6 w-[1px] bg-slate-200 mx-0.5 sm:mx-1" />
                        <div className="flex items-center gap-2 sm:gap-3 pl-1 sm:pl-2 pr-1 py-1 group">
                            <div className="hidden sm:flex flex-col items-end mr-1">
                                <span className="text-xs font-bold text-slate-900">{user?.name || 'User'}</span>
                                <span className="text-[10px] text-slate-500 font-medium tracking-wide leading-none uppercase">{user?.email || 'N/A'}</span>
                            </div>
                            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-slate-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm ring-1 ring-slate-200/50 group-hover:ring-blue-200 transition-all overflow-hidden bg-[radial-gradient(circle_at_24%_24%,_var(--tw-gradient-from)_0%,_transparent_100%)] from-blue-50">
                                <User size={18} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Sign Out"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </header>

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto bg-slate-50 relative custom-scrollbar">
                    {/* Page Container */}
                    <div className="p-4 sm:p-6 md:p-8 max-w-[1700px] mx-auto min-h-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
