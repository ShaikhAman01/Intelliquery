'use client';

import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface User {
    id: string;
    email: string;
    name: string;
    image?: string | null;
    emailVerified?: boolean;
}

interface Session {
    user: User;
}

export function useSession() {
    const { data, isPending } = authClient.useSession();
    const session = (data as unknown as Session | null) ?? null;

    return {
        session,
        user: session?.user ?? null,
        isLoading: isPending,
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
