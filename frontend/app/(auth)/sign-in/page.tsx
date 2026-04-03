import SignIn from "@/components/auth/sign-in";

export default function SignInPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-[#0a0e1a] p-4 relative overflow-hidden">
            {/* Background gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-900/10 blur-3xl opacity-50" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-900/10 blur-3xl opacity-50" />
            </div>

            <div className="z-10 w-full">
                <SignIn />
            </div>
        </div>
    );
}
