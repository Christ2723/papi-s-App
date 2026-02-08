
import React, { useState } from 'react';
import { User, UserRole, Language } from '../types';
import { loginUser, registerUser, clearAllData, getUsers } from '../services/storageService';
import { Logo } from './Logo';
import { ArrowRight, User as UserIcon, Lock, Mail, Phone, Shield, Trash2, LayoutDashboard, GraduationCap, BookOpen, AlertCircle } from 'lucide-react';

interface AuthScreenProps {
    onLogin: (user: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        name: '',
        email: '',
        phone: '',
        role: UserRole.Student,
        targetLang: Language.English,
        nativeLang: Language.Spanish
    });
    const [error, setError] = useState("");
    
    // State for Admin Role Selector
    const [tempAdminUser, setTempAdminUser] = useState<User | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        
        try {
            if (isLogin) {
                const user = loginUser(formData.username, formData.password);
                if (user) {
                    if (user.role === UserRole.Admin) {
                        setTempAdminUser(user);
                    } else {
                        onLogin(user);
                    }
                } else {
                    setError("Invalid username or password. Check spelling or register first.");
                }
            } else {
                // Register
                if (!formData.username || !formData.password || !formData.name) {
                    setError("Please fill in required fields.");
                    return;
                }
                const newUser = registerUser(formData);
                
                // Verification Step: Ensure it actually saved
                const users = getUsers();
                const savedUser = users.find(u => u.id === newUser.id);
                
                if (!savedUser) {
                    setError("CRITICAL: Registration seemed to fail. Browser storage did not persist data. Try enabling cookies/storage.");
                    return;
                }

                if (newUser.role === UserRole.Admin) {
                    setTempAdminUser(newUser);
                } else {
                    onLogin(newUser);
                }
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || "An error occurred. Please try again.");
        }
    };

    const handleAdminRoleSelect = (selectedRole: UserRole) => {
        if (!tempAdminUser) return;
        // Create a copy of the user but with the "Active" role changed for this session
        // We preserve the ID so the Admin tracks their own progress even as a student
        const sessionUser: User = {
            ...tempAdminUser,
            role: selectedRole 
        };
        onLogin(sessionUser);
    };

    if (tempAdminUser) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 font-poppins relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px]"></div>
                </div>

                <div className="relative z-10 w-full max-w-2xl bg-zinc-900/90 backdrop-blur-xl border border-zinc-700 rounded-3xl shadow-2xl overflow-hidden p-10 text-center animate-in zoom-in duration-300">
                    <div className="mb-8">
                        <div className="mx-auto w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-indigo-900/50">
                            <Shield size={40} className="text-white" />
                        </div>
                        <h1 className="text-4xl font-black text-white mb-2">Welcome, Admin {tempAdminUser.name}</h1>
                        <p className="text-zinc-400 text-lg">Select your access mode for this session.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button 
                            onClick={() => handleAdminRoleSelect(UserRole.Admin)}
                            className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-indigo-500 p-6 rounded-2xl flex flex-col items-center gap-4 transition-all group"
                        >
                            <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition">
                                <LayoutDashboard size={24} />
                            </div>
                            <span className="font-bold text-white">Administrator</span>
                            <span className="text-xs text-zinc-500">Full Dashboard Access</span>
                        </button>

                        <button 
                            onClick={() => handleAdminRoleSelect(UserRole.Teacher)}
                            className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-amber-500 p-6 rounded-2xl flex flex-col items-center gap-4 transition-all group"
                        >
                            <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center text-amber-500 group-hover:scale-110 transition">
                                <GraduationCap size={24} />
                            </div>
                            <span className="font-bold text-white">Teacher</span>
                            <span className="text-xs text-zinc-500">Monitor Students</span>
                        </button>

                        <button 
                            onClick={() => handleAdminRoleSelect(UserRole.Student)}
                            className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-emerald-500 p-6 rounded-2xl flex flex-col items-center gap-4 transition-all group"
                        >
                            <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition">
                                <BookOpen size={24} />
                            </div>
                            <span className="font-bold text-white">Student</span>
                            <span className="text-xs text-zinc-500">Use Learning Tools</span>
                        </button>
                    </div>

                    <button onClick={() => setTempAdminUser(null)} className="mt-8 text-zinc-500 hover:text-white text-sm font-bold uppercase tracking-widest">
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 font-poppins relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute top-0 left-0 w-full h-full">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-600/10 rounded-full blur-[120px]"></div>
            </div>

            <div className="relative z-10 w-full max-w-md bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden">
                <div className="p-8 text-center border-b border-zinc-800 bg-zinc-900/50 relative">
                    <div className="mx-auto w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                        <Logo size={40} />
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tight mb-1">Payero Language School</h1>
                    <p className="text-amber-500 text-xs font-bold uppercase tracking-widest">Zero to Fluency Portal</p>
                    
                    {/* Clear Data Button (Dev Tool) */}
                    <button 
                        onClick={() => { if(window.confirm("Are you sure? This will delete ALL users and progress.")) clearAllData(); }}
                        className="absolute top-4 right-4 text-zinc-700 hover:text-red-500 transition p-2 rounded-full hover:bg-zinc-800"
                        title="Reset Database (Clear All Data)"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-5">
                    {/* Error Message */}
                    {error && (
                        <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-xl flex items-start gap-3 text-red-300 text-sm font-bold shadow-inner">
                            <AlertCircle className="shrink-0 mt-0.5" size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    {!isLogin && (
                        <div className="space-y-4 animate-in slide-in-from-right duration-300">
                             <div className="relative">
                                <UserIcon size={18} className="absolute left-4 top-3.5 text-zinc-500" />
                                <input name="name" placeholder="Full Name (Required)" value={formData.name} onChange={handleChange} className="w-full bg-black border border-zinc-800 rounded-xl py-3 pl-12 text-white placeholder-zinc-600 focus:border-amber-500 outline-none transition" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="relative">
                                    <Mail size={18} className="absolute left-4 top-3.5 text-zinc-500" />
                                    <input name="email" placeholder="Email (Opt)" value={formData.email} onChange={handleChange} className="w-full bg-black border border-zinc-800 rounded-xl py-3 pl-12 text-white placeholder-zinc-600 focus:border-amber-500 outline-none transition" />
                                </div>
                                <div className="relative">
                                    <Phone size={18} className="absolute left-4 top-3.5 text-zinc-500" />
                                    <input name="phone" placeholder="Phone (Opt)" value={formData.phone} onChange={handleChange} className="w-full bg-black border border-zinc-800 rounded-xl py-3 pl-12 text-white placeholder-zinc-600 focus:border-amber-500 outline-none transition" />
                                </div>
                            </div>
                             <div className="grid grid-cols-2 gap-4">
                                <select name="role" value={formData.role} onChange={handleChange} className="w-full bg-black border border-zinc-800 rounded-xl py-3 px-4 text-white focus:border-amber-500 outline-none">
                                    <option value={UserRole.Student}>Student</option>
                                    <option value={UserRole.Teacher}>Teacher</option>
                                    <option value={UserRole.Admin}>Admin</option>
                                </select>
                                <select name="targetLang" value={formData.targetLang} onChange={handleChange} className="w-full bg-black border border-zinc-800 rounded-xl py-3 px-4 text-white focus:border-amber-500 outline-none">
                                    {Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                             </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="relative">
                            <Shield size={18} className="absolute left-4 top-3.5 text-zinc-500" />
                            <input name="username" placeholder="Username" value={formData.username} onChange={handleChange} className="w-full bg-black border border-zinc-800 rounded-xl py-3 pl-12 text-white placeholder-zinc-600 focus:border-amber-500 outline-none transition" />
                        </div>
                        <div className="relative">
                            <Lock size={18} className="absolute left-4 top-3.5 text-zinc-500" />
                            <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} className="w-full bg-black border border-zinc-800 rounded-xl py-3 pl-12 text-white placeholder-zinc-600 focus:border-amber-500 outline-none transition" />
                        </div>
                    </div>

                    <button type="submit" className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-black font-black rounded-xl shadow-lg shadow-amber-900/20 transition transform active:scale-[0.98] flex items-center justify-center gap-2 text-lg mt-4">
                        {isLogin ? "Enter School" : "Register Account"} <ArrowRight size={20} />
                    </button>
                </form>

                <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 text-center">
                    <p className="text-zinc-500 text-sm">
                        {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                        <button onClick={() => setIsLogin(!isLogin)} className="text-white font-bold hover:underline">
                            {isLogin ? "Sign Up" : "Log In"}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};
