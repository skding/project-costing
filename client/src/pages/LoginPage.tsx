import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { LogIn, User, Lock, Loader2 } from 'lucide-react';

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
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Animated Background Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse delay-700"></div>

            <div className="w-full max-w-md relative z-10">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl">
                    <div className="text-center mb-10">
                        <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-blue-500/20">
                            <LogIn size={32} />
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight uppercase">Project Costing</h1>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.3em] mt-2">Enterprise Solutions</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Email Address</label>
                            <div className="relative group">
                                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors">
                                    <User size={18} />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 focus:border-blue-500 rounded-2xl py-4 pl-16 pr-6 text-white font-bold outline-none transition-all placeholder:text-slate-600"
                                    placeholder="your@email.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Password</label>
                            <div className="relative group">
                                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 focus:border-blue-500 rounded-2xl py-4 pl-16 pr-6 text-white font-bold outline-none transition-all placeholder:text-slate-600"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase text-center py-3 rounded-xl tracking-widest">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black uppercase tracking-[0.2em] py-5 rounded-2xl shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                        >
                            {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Authenticate'}
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-white/5 text-center">
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
                            Cloud Deployment v1.0 • Secure Access
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
