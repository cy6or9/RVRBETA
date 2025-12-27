// /src/pages/admin/edit/[id].js
// Article editing has been disabled

import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function EditArticlePage() {
  const router = useRouter();
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Checking permissions…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-6 text-center space-y-4">
          <h1 className="text-xl font-semibold">Access Denied</h1>
          <p className="text-muted-foreground">
            You don&apos;t have permission to view this page.
          </p>
          <Button onClick={() => router.push("/")}>Go to Homepage</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/admin")}
            className="mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <Card className="p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Article Editing Disabled</h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Article editing through the admin panel has been disabled. Please
              contact the site administrator if you need to modify content.
            </p>
          </div>

          <div className="flex justify-center gap-3">
            <Button onClick={() => router.push("/admin")}>
              Back to Admin
            </Button>
            <Button variant="outline" onClick={() => router.push("/")}>
              Go to Homepage
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
