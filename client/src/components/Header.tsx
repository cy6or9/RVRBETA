import { Link, useLocation } from "wouter";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Local News" },
    { href: "/news", label: "News" },
    { href: "/community", label: "Community" },
    { href: "/events", label: "Events" },
    { href: "/weather", label: "Weather" },
    { href: "/river-conditions", label: "River Conditions" },
  ];

  return (
    <header className="w-full sticky top-0 z-50 bg-white shadow-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* The bar is now 50% taller than before */}
        <div className="flex items-center justify-between h-20 sm:h-20">
          {/* Site Title */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold tracking-tight text-green-800">
              River Valley Report
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <span
                  className={`text-sm font-medium cursor-pointer transition-colors hover:text-green-600 ${
                    location === item.href ? "text-green-700" : "text-gray-800"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle menu"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X /> : <Menu />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {menuOpen && (
        <nav className="md:hidden bg-white border-t border-border shadow-md">
          <ul className="flex flex-col py-4 px-6 space-y-4">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>
                  <span
                    className={`block text-base font-medium ${
                      location === item.href
                        ? "text-blue-600"
                        : "text-gray-800 hover:text-blue-600"
                    }`}
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
