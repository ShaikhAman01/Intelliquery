"use client";
import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: React.ReactNode; }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const toast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    }, []);

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
                <AnimatePresence>
                    {toasts.map((t) => (
                        <motion.div
                            key={t.id}
                            initial={{ opacity: 0, x: 50, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border min-w-[250px] bg-card ${t.type === 'success' ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-emerald-500/10' :
                                t.type === 'error' ? 'border-red-500/30 text-red-600 dark:text-red-400 shadow-red-500/10' :
                                    'border-blue-500/30 text-blue-600 dark:text-blue-400 shadow-blue-500/10'
                                }`}
                        >
                            {t.type === 'success' && <CheckCircle className="h-5 w-5 opacity-80" />}
                            {t.type === 'error' && <AlertCircle className="h-5 w-5 opacity-80" />}
                            {t.type === 'info' && <Info className="h-5 w-5 opacity-80" />}
                            <span className="text-sm font-medium flex-1 text-foreground">{t.message}</span>
                            <button
                                onClick={() => setToasts(prev => prev.filter(toast => toast.id !== t.id))}
                                className="opacity-40 hover:opacity-100 transition-opacity text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error("useToast must be used within ToastProvider");
    return context;
};
