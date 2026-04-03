'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Play, Trash2, CheckCircle2, XCircle, Zap, Search, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getHistory, deleteHistory } from '@/lib/api';

interface HistoryEntry {
    id: number;
    connection_id: number;
    user_question: string;
    generated_sql: string;
    generation_source: string;
    execution_status: string;
    execution_time_ms: number;
    row_count: number;
    timestamp: string;
}

interface HistoryPanelProps {
    connectionId: number | null;
    onReplay: (question: string, sql: string) => void;
}

import { motion, AnimatePresence } from 'motion/react';

export const HistoryPanel = ({ connectionId, onReplay }: HistoryPanelProps) => {
    const [entries, setEntries] = useState<HistoryEntry[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [offset, setOffset] = useState(0);
    const limit = 20;

    const fetchHistory = useCallback(async (reset = false) => {
        if (!connectionId) return;
        setLoading(true);
        try {
            const newOffset = reset ? 0 : offset;
            const res = await getHistory(connectionId, limit, newOffset);
            if (reset) {
                setEntries(res.items || []);
                setOffset(0);
            } else {
                setEntries(prev => [...prev, ...(res.items || [])]);
            }
            setTotal(res.total || 0);
        } catch (err) {
            console.error('Failed to load history:', err);
        } finally {
            setLoading(false);
        }
    }, [connectionId, offset]);

    // Reload on connection change
    useEffect(() => {
        if (connectionId) {
            setEntries([]);
            setOffset(0);
            fetchHistory(true);
        }
    }, [connectionId]);

    const handleDelete = async (id: number) => {
        try {
            await deleteHistory(id);
            setEntries(prev => prev.filter(e => e.id !== id));
            setTotal(prev => prev - 1);
        } catch (err) {
            console.error('Failed to delete history:', err);
        }
    };

    const handleLoadMore = () => {
        const newOffset = offset + limit;
        setOffset(newOffset);
        // Trigger fetch with new offset
        getHistory(connectionId!, limit, newOffset).then(res => {
            setEntries(prev => [...prev, ...(res.items || [])]);
        });
    };

    const formatTime = (ts: string) => {
        const date = new Date(ts);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;

        const diffHrs = Math.floor(diffMins / 60);
        if (diffHrs < 24) return `${diffHrs}m ago`;

        const diffDays = Math.floor(diffHrs / 24);
        if (diffDays < 7) return `${diffDays}h ago`;

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const filteredEntries = search
        ? entries.filter(e =>
            e.user_question.toLowerCase().includes(search.toLowerCase()) ||
            e.generated_sql.toLowerCase().includes(search.toLowerCase())
        )
        : entries;

    if (!connectionId) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2">
                <Clock className="h-8 w-8 opacity-30" />
                <p>Connect a database to see history</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">History</span>
                    {total > 0 && (
                        <span className="text-[10px] bg-muted/50 text-muted-foreground px-1.5 py-0.5 rounded-full">
                            {total}
                        </span>
                    )}
                </div>
            </div>

            {/* Search */}
            <div className="relative mb-3">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search queries..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs bg-muted/30 border border-border rounded-lg
                     text-foreground placeholder:text-muted-foreground
                     focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 -mr-1">
                {filteredEntries.length === 0 && !loading && (
                    <div className="text-center text-muted-foreground text-xs py-8">
                        {search ? 'No matching queries' : 'No queries yet'}
                    </div>
                )}

                <AnimatePresence>
                    {filteredEntries.map((entry) => (
                        <motion.div
                            key={entry.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0, padding: 0, border: 0 }}
                            transition={{ duration: 0.2 }}
                            className="group relative rounded-lg border border-border/50 bg-card/50 p-3
                       hover:border-primary/30 hover:bg-card transition-all duration-200 cursor-pointer overflow-hidden"
                            onClick={() => onReplay(entry.user_question, entry.generated_sql)}
                        >
                            {/* Question */}
                            <p className="text-xs font-medium text-foreground line-clamp-2 pr-6 mb-1.5">
                                {entry.user_question}
                            </p>

                            {/* Meta row */}
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                {/* Status */}
                                {entry.execution_status === 'SUCCESS' ? (
                                    <span className="flex items-center gap-0.5 text-emerald-400">
                                        <CheckCircle2 className="h-3 w-3" />
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-0.5 text-red-400">
                                        <XCircle className="h-3 w-3" />
                                    </span>
                                )}

                                {/* Source badge */}
                                <span className={`px-1.5 py-0.5 rounded-full font-medium ${entry.generation_source === 'DYNAMIC'
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : 'bg-violet-500/10 text-violet-400'
                                    }`}>
                                    {entry.generation_source === 'DYNAMIC' ? '⚡' : '🤖'} {entry.generation_source}
                                </span>

                                {/* Timing */}
                                <span className="flex items-center gap-0.5">
                                    <Zap className="h-2.5 w-2.5" />
                                    {entry.execution_time_ms}ms
                                </span>

                                {/* Rows */}
                                {entry.row_count > 0 && (
                                    <span>{entry.row_count} rows</span>
                                )}

                                {/* Time */}
                                <span className="ml-auto">{formatTime(entry.timestamp)}</span>
                            </div>

                            {/* Actions (hidden until hover) */}
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onReplay(entry.user_question, entry.generated_sql);
                                    }}
                                    className="p-1 rounded hover:bg-primary/10 text-primary"
                                    title="Replay query"
                                >
                                    <Play className="h-3 w-3" />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(entry.id);
                                    }}
                                    className="p-1 rounded hover:bg-red-500/10 text-red-400"
                                    title="Delete"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Load More */}
                {entries.length < total && !search && (
                    <button
                        onClick={handleLoadMore}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-1.5 py-2 text-xs
                       text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ChevronDown className="h-3.5 w-3.5" />
                        {loading ? 'Loading...' : `Load more (${total - entries.length} remaining)`}
                    </button>
                )}
            </div>
        </div>
    );
};
