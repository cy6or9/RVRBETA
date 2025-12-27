// /src/pages/admin/index.js
// Admin User Privileges Dashboard
// Displays all users with their subscription tier, login stats, and location data

import { useState, useMemo } from "react";
import { useRouter } from "next/router";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Search,
  Users,
  Loader2,
  Clock,
  MapPin,
  ArrowUpDown,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function AdminUserPrivilegesPage() {
  const router = useRouter();
  const { isAdmin, loading } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [tierFilter, setTierFilter] = useState("All");
  const [sortBy, setSortBy] = useState("lastLogin"); // "lastLogin" | "timeSpent"

  const {
    data: users = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const response = await fetch("/api/admin/users");
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      return response.json();
    },
    retry: false, // Don't retry on failure to prevent infinite loops
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });

  // Format time spent online
  const formatTimeSpent = (seconds) => {
    if (!seconds || seconds === 0) return "—";
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  // Format last login date
  const formatLastLogin = (isoString) => {
    if (!isoString) return "Never";
    
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(date);
    } catch {
      return "Invalid date";
    }
  };

  // Get badge color based on tier
  const getTierBadgeVariant = (tier) => {
    switch (tier) {
      case "Premium":
        return "default";
      case "Plus":
        return "secondary";
      default:
        return "outline";
    }
  };

  // Filter and sort users
  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users.filter((user) => {
      // Filter by search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        if (!user.email?.toLowerCase().includes(term)) {
          return false;
        }
      }

      // Filter by tier
      if (tierFilter !== "All" && user.privileges?.tier !== tierFilter) {
        return false;
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === "lastLogin") {
        // Sort by last login (newest first)
        const aTime = a.stats?.lastLoginAtRaw || 0;
        const bTime = b.stats?.lastLoginAtRaw || 0;
        return bTime - aTime;
      } else if (sortBy === "timeSpent") {
        // Sort by time spent (highest first)
        const aTime = a.stats?.totalOnlineSeconds || 0;
        const bTime = b.stats?.totalOnlineSeconds || 0;
        return bTime - aTime;
      }
      return 0;
    });

    return filtered;
  }, [users, searchTerm, tierFilter, sortBy]);

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/")}
              className="hidden sm:inline-flex"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Admin
              </p>
              <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <Users className="w-5 h-5" />
                User Privileges
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <Card className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Filters and Search */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Active Users</h2>
              <p className="text-sm text-muted-foreground">
                View and manage user subscriptions and activity
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              {/* Tier Filter */}
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="px-3 py-2 border rounded-md bg-background text-sm"
              >
                <option value="All">All Tiers</option>
                <option value="Basic">Basic</option>
                <option value="Plus">Plus</option>
                <option value="Premium">Premium</option>
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border rounded-md bg-background text-sm"
              >
                <option value="lastLogin">Last Login</option>
                <option value="timeSpent">Time Spent</option>
              </select>

              {/* Search */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email…"
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 bg-muted/50">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Total Users
              </p>
              <p className="text-2xl font-bold">{users.length}</p>
            </Card>
            <Card className="p-4 bg-muted/50">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Premium Users
              </p>
              <p className="text-2xl font-bold">
                {users.filter((u) => u.privileges?.tier === "Premium").length}
              </p>
            </Card>
            <Card className="p-4 bg-muted/50">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Plus Users
              </p>
              <p className="text-2xl font-bold">
                {users.filter((u) => u.privileges?.tier === "Plus").length}
              </p>
            </Card>
          </div>

          {/* Users List */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="py-10 text-center text-destructive">
              <p className="font-medium mb-2">Error loading users</p>
              <p className="text-sm">{error.message}</p>
            </div>
          ) : filteredAndSortedUsers.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <p className="font-medium mb-2">No users found</p>
              <p className="text-sm">
                {searchTerm || tierFilter !== "All"
                  ? "Try adjusting your filters."
                  : "No users have logged in yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAndSortedUsers.map((user) => (
                <div
                  key={user.uid}
                  className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  {/* User Info */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{user.email}</h3>
                      <Badge variant={getTierBadgeVariant(user.privileges?.tier)}>
                        {user.privileges?.tier || "Basic"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      {/* Last Login */}
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">
                          {formatLastLogin(user.stats?.lastLoginAt)}
                        </span>
                      </div>

                      {/* Location */}
                      {user.lastLocation ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">
                            {user.lastLocation.city && user.lastLocation.state
                              ? `${user.lastLocation.city}, ${user.lastLocation.state}`
                              : `${user.lastLocation.lat.toFixed(4)}, ${user.lastLocation.lon.toFixed(4)}`}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          <span className="italic">No location</span>
                        </div>
                      )}
                    </div>

                    {/* Coordinates (if location exists) */}
                    {user.lastLocation && (
                      <p className="text-xs text-muted-foreground">
                        Coordinates: {user.lastLocation.lat.toFixed(6)},{" "}
                        {user.lastLocation.lon.toFixed(6)}
                      </p>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex flex-row lg:flex-col gap-4 lg:gap-2 lg:items-end lg:text-right">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Time Online
                      </p>
                      <p className="text-lg font-semibold">
                        {formatTimeSpent(user.stats?.totalOnlineSeconds)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}

