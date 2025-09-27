
"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Anchor, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function GeneralLoginPage() {
    const router = useRouter();
  return (
    <div className="flex items-center justify-center py-12 px-4 bg-primary/10 min-h-[calc(100vh-152px)]">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-bold font-headline">Log In</CardTitle>
          <CardDescription>
            Are you an Exporter or a Carrier?
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
            <Button variant="outline" size="lg" className="h-20 text-lg" onClick={() => router.push('/login/exporter')}>
                <Anchor className="mr-4 h-8 w-8" />
                I'm an Exporter
            </Button>
            <Button variant="outline" size="lg" className="h-20 text-lg" onClick={() => router.push('/login/carrier')}>
                <Truck className="mr-4 h-8 w-8" />
                I'm a Carrier
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
