'use client';

import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useEffect, useState, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface User {
    id: string;
    email: string;
    name: string;
    image?: string | null;
}

interface Session {
    user: User;
}

/**
 * Hook to get the current session. Returns { session, user, isLoading }.
 * Session comes from Better Auth client.
 */
export function useSession() {
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        authClient.getSession().then(({ data, error }) => {
            if (cancelled) return;
            if (data && !error) {
                setSession(data as unknown as Session);
            } else {
                setSession(null);
            }
            setIsLoading(false);
        });

        return () => { cancelled = true; };
    }, []);

    return {
        session,
        user: session?.user ?? null,
        isLoading,
    };
}

/**
 * Auth guard — redirects to /sign-in if not authenticated.
 * Wrap around any page that requires login.
 */
export function AuthGuard({ children }: { children: ReactNode; }) {
    const { session, isLoading } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !session) {
            router.replace('/sign-in');
        }
    }, [isLoading, session, router]);

    if (isLoading) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading session...</p>
                </div>
            </div>
        );
    }

    if (!session) {
        return null; // Redirect happening
    }

    return <>{children}</>;
}
