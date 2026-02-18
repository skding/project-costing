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
    Users
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

    const navItems = [
        { label: 'Projects', icon: LayoutDashboard, path: '/' },
        { label: 'Clients', icon: Users, path: '/clients' },
        { label: 'Component Library', icon: Database, path: '/components' },
    ];

    const currentPage = navItems.find(item => item.path === location.pathname) || { label: 'Dashboard' };

    return (
        <div className="min-h-screen bg-slate-50 flex overflow-hidden">
            {/* Sidebar */}
            <aside
                className={cn(
                    "bg-slate-900 text-white flex flex-col transition-all duration-300 ease-in-out z-30 shadow-xl",
                    isCollapsed ? "w-20" : "w-64"
                )}
            >
                {/* Sidebar Header */}
                <div className="h-16 flex items-center px-6 border-b border-slate-800/50 overflow-hidden shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
                            <Database size={18} className="text-white" />
                        </div>
                        {!isCollapsed && (
                            <div className="flex flex-col animate-in fade-in duration-300">
                                <span className="text-sm font-bold tracking-tight whitespace-nowrap uppercase">CostHub</span>
                                <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">v1.2.4 Production</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Nav */}
                <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto custom-scrollbar">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative",
                                    isActive
                                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                                        : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                                )}
                            >
                                <Icon size={20} className={cn("shrink-0", isActive ? "text-white" : "group-hover:text-white")} />
                                {!isCollapsed && (
                                    <span className="animate-in fade-in slide-in-from-left-2 duration-300">
                                        {item.label}
                                    </span>
                                )}
                                {isCollapsed && isActive && (
                                    <div className="absolute left-0 w-1 h-6 bg-blue-500 rounded-r-full" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Sidebar Footer */}
                <div className="p-3 border-t border-slate-800/50 shrink-0">
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="w-full h-10 flex items-center justify-center gap-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {isCollapsed ? <ChevronRight size={20} /> : (
                            <>
                                <ChevronLeft size={20} />
                                <span className="text-xs font-medium">Collapse Menu</span>
                            </>
                        )}
                    </button>
                </div>
            </aside>

            {/* Main Wrapper */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top Navbar */}
                <header
                    className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-20 shrink-0 shadow-sm shadow-slate-100"
                >
                    <div className="flex items-center gap-4">
                        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                            {currentPage.label}
                        </h2>
                        <div className="hidden md:flex items-center bg-slate-100 rounded-lg px-3 py-1.5 gap-2 border border-slate-200/50 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                            <Search size={16} className="text-slate-400" />
                            <input
                                type="text"
                                placeholder="Global Search..."
                                className="bg-transparent border-none text-xs outline-none w-48 font-medium placeholder:text-slate-400"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors relative">
                            <Bell size={20} />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                        </button>
                        <div className="h-8 w-[1px] bg-slate-200 mx-1" />
                        <div className="flex items-center gap-3 pl-2 pr-1 py-1 group">
                            <div className="flex flex-col items-end mr-1">
                                <span className="text-xs font-bold text-slate-900">{user?.name || 'User'}</span>
                                <span className="text-[10px] text-slate-500 font-medium tracking-wide leading-none uppercase">{user?.email || 'N/A'}</span>
                            </div>
                            <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm ring-1 ring-slate-200/50 group-hover:ring-blue-200 transition-all overflow-hidden bg-[radial-gradient(circle_at_24%_24%,_var(--tw-gradient-from)_0%,_transparent_100%)] from-blue-50">
                                <User size={20} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
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
                    <div className="p-8 max-w-[1600px] mx-auto min-h-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
