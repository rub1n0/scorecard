'use client';

import React, { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { useRouter } from 'next/navigation';
import { Users, Plus, Search, Edit2, Trash2, Loader2 } from 'lucide-react';
import { fetchWithScorecardRole, getScorecardRole } from '@/utils/scorecardClient';
import { ScorecardRole } from '@/types';

type DbUser = { id: string; name: string | null; email: string | null };
type DrawerMode = { type: 'create' } | { type: 'edit'; user: DbUser };

export default function UserManagementPage() {
    const router = useRouter();
    const [users, setUsers] = useState<DbUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [drawer, setDrawer] = useState<DrawerMode | null>(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [saving, setSaving] = useState(false);
    const [role, setRole] = useState<ScorecardRole>('update');
    const canEdit = role === 'edit';

    useEffect(() => {
        const stored = getScorecardRole();
        if (stored) setRole(stored);
    }, []);

    useEffect(() => {
        const load = async () => {
            try {
                if (!canEdit) {
                    setLoading(false);
                    return;
                }
                setLoading(true);
                const res = await fetchWithScorecardRole('/api/users');
                setUsers(await res.json());
            } catch (error) {
                console.error('Failed to load users', error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [canEdit]);

    const openDrawer = (mode: DrawerMode) => {
        setDrawer(mode);
        if (mode.type === 'edit') {
            setName(mode.user.name || '');
            setEmail(mode.user.email || '');
        } else {
            setName('');
            setEmail('');
        }
    };

    const closeDrawer = () => {
        setDrawer(null);
        setName('');
        setEmail('');
    };

    const saveUser = async () => {
        if (!email.trim() && !name.trim()) return;
        setSaving(true);
        try {
            if (drawer?.type === 'edit') {
                await fetchWithScorecardRole('/api/users', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: drawer.user.id, name: name.trim() || null, email: email.trim() || null }),
                });
            } else {
                await fetchWithScorecardRole('/api/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: name.trim() || null, email: email.trim() || null }),
                });
            }
            const res = await fetchWithScorecardRole('/api/users');
            setUsers(await res.json());
            closeDrawer();
        } catch (error) {
            console.error('Failed to save user', error);
        } finally {
            setSaving(false);
        }
    };

    const deleteUser = async (user: DbUser) => {
        if (!confirm(`Delete user ${user.name || user.email || 'Unnamed'}?`)) return;
        try {
            await fetchWithScorecardRole('/api/users', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: user.id }),
            });
            setUsers(prev => prev.filter(u => u.id !== user.id));
        } catch (error) {
            console.error('Failed to delete user', error);
        }
    };

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return users.filter(u => {
            const nameMatch = (u.name || '').toLowerCase().includes(q);
            const emailMatch = (u.email || '').toLowerCase().includes(q);
            return nameMatch || emailMatch;
        });
    }, [users, search]);

    const renderDrawer = () => {
        if (!drawer) return null;
        const heading = drawer.type === 'edit' ? 'Edit User' : 'Add User';
        return (
            <div className="fixed inset-0 z-40 flex">
                <div className="bg-black/50 backdrop-blur-sm flex-1" onClick={closeDrawer} />
                <div className="w-full max-w-md bg-industrial-950 border-l border-industrial-800 p-6 overflow-y-auto">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-xs uppercase text-industrial-500">Users</p>
                            <h2 className="text-lg font-semibold text-industrial-100">{heading}</h2>
                        </div>
                        <button onClick={closeDrawer} className="text-industrial-500 hover:text-industrial-200">
                            ×
                        </button>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-industrial-400">Name</label>
                            <input
                                className="input w-full mt-1"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Jane Doe"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-industrial-400">Email</label>
                            <input
                                className="input w-full mt-1"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="jane@company.com"
                            />
                        </div>
                        <button
                            onClick={saveUser}
                            disabled={saving}
                            className="btn btn-primary w-full flex items-center justify-center gap-2"
                        >
                            {saving && <Loader2 size={16} className="animate-spin" />}
                            {drawer.type === 'edit' ? 'Save Changes' : 'Create User'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    if (!loading && !canEdit) {
        return (
            <div className="min-h-screen bg-industrial-950">
                <PageHeader
                    label="Users"
                    title="USER DIRECTORY"
                    subtitle="Edit role required"
                    icon={<Users size={18} className="text-industrial-100" />}
                    rightContent={
                        <button onClick={() => router.push('/')} className="btn btn-secondary btn-sm">
                            Back to Scorecards
                        </button>
                    }
                />
                <main className="max-w-6xl mx-auto px-6 py-12">
                    <div className="glass-card p-8 text-center text-industrial-300">
                        User management is only available to the edit role.
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-industrial-950">
            <PageHeader
                onBack={() => router.push('/')}
                icon={<Users size={18} className="text-industrial-100" />}
                label="Directory"
                title="User Management"
                subtitle={`${users.length} users`}
                rightContent={
                    <button className="btn btn-primary btn-sm flex items-center gap-2" onClick={() => openDrawer({ type: 'create' })}>
                        <Plus size={16} />
                        Add User
                    </button>
                }
            />

            <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
                <div className="glass-card p-4 border border-industrial-800/60 space-y-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="relative md:w-1/3">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-industrial-500" />
                            <input
                                className="input pl-10 w-full"
                                placeholder="Search name or email..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                        <p className="text-xs uppercase text-industrial-500">{filtered.length} shown</p>
                    </div>
                </div>

                <div className="glass-card border border-industrial-800/60 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-industrial-900/60 text-industrial-400 uppercase text-[11px]">
                                <tr>
                                    <th className="px-4 py-3 text-left">Name</th>
                                    <th className="px-4 py-3 text-left">Email</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-industrial-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan={3} className="text-center py-8 text-industrial-500">
                                            <Loader2 size={18} className="inline animate-spin mr-2" />
                                            Loading users...
                                        </td>
                                    </tr>
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="text-center py-8 text-industrial-500">
                                            No users match your search.
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map(user => (
                                        <tr key={user.id} className="hover:bg-industrial-900/40">
                                            <td className="px-4 py-3 text-industrial-100">{user.name || 'Unnamed'}</td>
                                            <td className="px-4 py-3 text-industrial-300">{user.email || '—'}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        className="btn btn-xs btn-secondary flex items-center gap-1"
                                                        onClick={() => openDrawer({ type: 'edit', user })}
                                                    >
                                                        <Edit2 size={12} />
                                                        Edit
                                                    </button>
                                                    <button
                                                        className="btn btn-xs btn-ghost flex items-center gap-1 text-red-400"
                                                        onClick={() => deleteUser(user)}
                                                    >
                                                        <Trash2 size={12} />
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {renderDrawer()}
        </div>
    );
}
