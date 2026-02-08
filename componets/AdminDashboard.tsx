
import React, { useEffect, useState } from 'react';
import { getUsers, getAllLogs, getProgress } from '../services/storageService';
import { User, ActivityLog, UserRole } from '../types';
import { BarChart, Users, Clock, Calendar, Search, FileText } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [filter, setFilter] = useState("");

    useEffect(() => {
        setUsers(getUsers());
        setLogs(getAllLogs());
    }, []);

    const students = users.filter(u => u.role === UserRole.Student);
    const filteredStudents = students.filter(s => 
        s.name.toLowerCase().includes(filter.toLowerCase()) || 
        s.username.toLowerCase().includes(filter.toLowerCase())
    );

    const getTotalTime = (userId: string) => {
        const userLogs = logs.filter(l => l.userId === userId);
        const seconds = userLogs.reduce((acc, l) => acc + l.durationSeconds, 0);
        return (seconds / 3600).toFixed(1);
    };

    const getLastActive = (userId: string) => {
        const userLogs = logs.filter(l => l.userId === userId).sort((a,b) => b.startTime - a.startTime);
        if (userLogs.length === 0) return "Never";
        return new Date(userLogs[0].startTime).toLocaleDateString();
    };

    const renderUserDetail = () => {
        if (!selectedUser) return null;
        const user = users.find(u => u.id === selectedUser);
        const userLogs = logs.filter(l => l.userId === selectedUser).sort((a,b) => b.startTime - a.startTime);
        const progress = getProgress(selectedUser);

        return (
            <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-6 h-full flex flex-col">
                <div className="flex justify-between items-start mb-6 border-b border-zinc-700 pb-4">
                    <div>
                        <h2 className="text-2xl font-black text-white">{user?.name}</h2>
                        <p className="text-zinc-400 text-sm">@{user?.username} • {user?.email || "No Email"}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-black text-amber-500">{progress.level}</div>
                        <div className="text-xs text-zinc-500 uppercase font-bold">Current Level</div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-zinc-900 p-4 rounded-xl">
                        <p className="text-zinc-500 text-xs font-bold uppercase">Total Study Time</p>
                        <p className="text-xl font-bold text-white">{(progress.totalStudyTime / 3600).toFixed(1)} Hours</p>
                    </div>
                    <div className="bg-zinc-900 p-4 rounded-xl">
                        <p className="text-zinc-500 text-xs font-bold uppercase">Topics Completed</p>
                        <p className="text-xl font-bold text-white">{progress.completedTopics.length}</p>
                    </div>
                </div>

                <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Activity Log</h3>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                    {userLogs.map(log => (
                         <div key={log.id} className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-700 flex justify-between items-center">
                             <div>
                                 <p className="font-bold text-zinc-300 text-sm">{log.mode}</p>
                                 <p className="text-xs text-zinc-500">{new Date(log.startTime).toLocaleString()}</p>
                             </div>
                             <div className="text-right">
                                 <p className="text-sm font-mono text-indigo-400">{(log.durationSeconds / 60).toFixed(0)}m</p>
                                 {log.details && <p className="text-[10px] text-zinc-600 max-w-[150px] truncate">{log.details}</p>}
                             </div>
                         </div>
                    ))}
                    {userLogs.length === 0 && <p className="text-zinc-600 italic text-sm">No activity recorded yet.</p>}
                </div>
            </div>
        );
    };

    return (
        <div className="h-full bg-zinc-900 text-white p-8 flex flex-col">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-600 rounded-xl text-white">
                        <BarChart size={24} />
                    </div>
                    <h1 className="text-2xl font-black tracking-tight">Teacher Dashboard</h1>
                </div>
                <div className="bg-zinc-800 p-2 rounded-lg flex items-center gap-2 border border-zinc-700">
                    <Search size={18} className="text-zinc-500 ml-2" />
                    <input 
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        placeholder="Search students..." 
                        className="bg-transparent outline-none text-sm font-bold text-white placeholder-zinc-600 w-64"
                    />
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-hidden">
                {/* List */}
                <div className="lg:col-span-2 bg-zinc-800 border border-zinc-700 rounded-2xl overflow-hidden flex flex-col">
                    <div className="grid grid-cols-5 gap-4 p-4 border-b border-zinc-700 bg-zinc-800 font-bold text-xs text-zinc-500 uppercase tracking-widest">
                        <div className="col-span-2">Student</div>
                        <div>Level</div>
                        <div>Total Time</div>
                        <div>Last Active</div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                        {filteredStudents.map(student => (
                            <button 
                                key={student.id} 
                                onClick={() => setSelectedUser(student.id)}
                                className={`w-full grid grid-cols-5 gap-4 p-4 rounded-xl items-center transition-all text-left mb-1 ${selectedUser === student.id ? 'bg-indigo-600 text-white' : 'hover:bg-zinc-700 text-zinc-300'}`}
                            >
                                <div className="col-span-2 flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${selectedUser === student.id ? 'bg-white text-indigo-600' : 'bg-zinc-900 text-zinc-500'}`}>
                                        {student.name.charAt(0)}
                                    </div>
                                    <div className="truncate">
                                        <div className="font-bold text-sm truncate">{student.name}</div>
                                        <div className={`text-xs ${selectedUser === student.id ? 'text-indigo-200' : 'text-zinc-500'}`}>{student.phone || 'No Phone'}</div>
                                    </div>
                                </div>
                                <div className="font-mono font-bold">{student.currentLevel}</div>
                                <div className="font-mono">{getTotalTime(student.id)}h</div>
                                <div className="text-xs">{getLastActive(student.id)}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Detail */}
                <div className="h-full">
                    {selectedUser ? renderUserDetail() : (
                        <div className="h-full bg-zinc-800/50 border border-zinc-700 border-dashed rounded-2xl flex flex-col items-center justify-center text-zinc-600">
                            <Users size={48} className="mb-4 opacity-50"/>
                            <p className="font-bold">Select a student to view details</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
