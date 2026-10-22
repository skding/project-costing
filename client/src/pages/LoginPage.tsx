import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { User, Lock, Loader2 } from 'lucide-react';

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const response = await api.post('/user/login', { email, password });
            login(response.data.token, response.data.user);
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0b1120] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
            {/* Animated Background Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/15 rounded-full blur-[140px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/15 rounded-full blur-[140px] animate-pulse delay-700"></div>

            <div className="w-full max-w-md relative z-10">
                <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-6 sm:p-10 shadow-2xl">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-white/10 border border-white/10 rounded-3xl flex items-center justify-center p-3 mx-auto mb-5 shadow-xl shadow-blue-500/10">
                            <img
                                src="/logo.png"
                                alt="Clover Digital"
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                }}
                            />
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">Clover Digital</h1>
                        <p className="text-blue-400 font-bold text-xs uppercase tracking-[0.25em] mt-1.5">Project Costing Platform</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Email Address</label>
                            <div className="relative group">
                                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                                    <User size={18} />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 focus:border-blue-500 focus:bg-white/10 rounded-2xl py-3.5 pl-14 pr-5 text-white font-bold outline-none transition-all placeholder:text-slate-600 text-sm"
                                    placeholder="your@email.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Password</label>
                            <div className="relative group">
                                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 focus:border-blue-500 focus:bg-white/10 rounded-2xl py-3.5 pl-14 pr-5 text-white font-bold outline-none transition-all placeholder:text-slate-600 text-sm"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase text-center py-3 rounded-xl tracking-widest">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black uppercase tracking-[0.2em] py-4 rounded-2xl shadow-xl shadow-blue-600/25 transition-all flex items-center justify-center gap-3 active:scale-[0.98] text-xs"
                        >
                            {isLoading ? <Loader2 className="animate-spin" size={18} /> : 'Authenticate'}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-white/10 space-y-2 text-center">
                        <div className="text-[10px] font-black uppercase text-slate-300 tracking-wider">
                            Clover Digital Sdn Bhd <span className="text-slate-500 font-mono">(201501034912)</span>
                        </div>
                        <div className="text-[9px] text-slate-500 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                            <span>7A Jalan PP 2/1, 47100 Puchong Selangor</span>
                        </div>
                        <div className="text-[9px] text-slate-500 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                            <a href="https://cloverdigital.com.my" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">cloverdigital.com.my</a>
                            <span>•</span>
                            <a href="mailto:enquiry@cloverdigital.com.my" className="text-slate-400 hover:underline">enquiry@cloverdigital.com.my</a>
                        </div>
                        <div className="pt-2 text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                            v1.0.0 Production • Secure Access
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
