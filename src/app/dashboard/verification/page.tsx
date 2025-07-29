
"use client";

import { ShieldCheck } from "lucide-react";

export default function VerificationPage() {
  return (
    <div className="container py-6 md:py-10">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold font-headline">Verification Center</h1>
        </div>

        <div className="border rounded-lg p-12 text-center bg-card dark:bg-card">
            <div className="flex justify-center mb-4">
                <ShieldCheck className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Verification Dashboard Coming Soon</h2>
            <p className="text-muted-foreground">This section will contain tools for employee to manage user and document verifications. Stay tuned!</p>
        </div>
    </div>
  );
}
