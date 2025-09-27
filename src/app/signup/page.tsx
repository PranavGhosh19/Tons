
"use client";

import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Anchor, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GeneralSignupPage() {
    const router = useRouter();

  return (
    <div className="flex items-center justify-center py-12 px-4 bg-primary/10 min-h-[calc(100vh-152px)]">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-bold font-headline">
            Create an Account
          </CardTitle>
          <CardDescription>
            Join as an Exporter or a Carrier.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
            <Button variant="outline" size="lg" className="h-20 text-lg" onClick={() => router.push('/signup/exporter')}>
                <Anchor className="mr-4 h-8 w-8" />
                Sign up as Exporter
            </Button>
            <Button variant="outline" size="lg" className="h-20 text-lg" onClick={() => router.push('/signup/carrier')}>
                <Truck className="mr-4 h-8 w-8" />
                Sign up as Carrier
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
