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

const typeStyles: Record<ToastType, { icon: React.ElementType; border: string; iconColor: string }> = {
    success: {
        icon: CheckCircle,
        border: 'border-[var(--ds-success-border)]',
        iconColor: 'text-success',
    },
    error: {
        icon: AlertCircle,
        border: 'border-[var(--ds-error-border)]',
        iconColor: 'text-error',
    },
    info: {
        icon: Info,
        border: 'border-[var(--ds-info-border)]',
        iconColor: 'text-[var(--ds-info)]',
    },
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
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
                    {toasts.map((t) => {
                        const { icon: Icon, border, iconColor } = typeStyles[t.type];
                        return (
                            <motion.div
                                key={t.id}
                                initial={{ opacity: 0, x: 40, scale: 0.95 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.16 } }}
                                transition={{ duration: 0.22, ease: [0, 0, 0.2, 1] }}
                                className={[
                                    'pointer-events-auto flex items-center gap-3 px-4 py-3',
                                    'rounded-lg border min-w-[260px] max-w-[380px]',
                                    'bg-base-4',
                                    border,
                                ].join(' ')}
                                style={{ boxShadow: 'var(--ds-shadow-xl)' }}
                            >
                                <Icon className={`h-4 w-4 flex-shrink-0 ${iconColor}`} />
                                <span className="text-[13px] font-medium flex-1 text-content-1 leading-snug">
                                    {t.message}
                                </span>
                                <button
                                    onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                                    className="text-content-3 hover:text-content-1 transition-colors duration-[100ms] flex-shrink-0"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </motion.div>
                        );
                    })}
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
