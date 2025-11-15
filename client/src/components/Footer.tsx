import { Link } from "wouter";
import { Facebook, Twitter, Instagram, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Footer() {
  const categories = [
    { name: "Local News", href: "/category/local" },
    { name: "News", href: "/category/news" },
    { name: "Community", href: "/category/community" },
    { name: "Events", href: "/category/events" },
    { name: "Weather", href: "/category/weather" },
  ];

  const about = [
    { name: "About Us", href: "/about" },
    { name: "Contact", href: "/contact" },
    { name: "Advertise", href: "/advertise" },
    { name: "Privacy Policy", href: "/privacy" },
  ];

  return (
    <footer className="bg-card border-t mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-bold mb-4 text-primary">River Valley Report</h3>
            <p className="text-sm text-muted-foreground">
              Your trusted source for local news, weather, and community stories.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Categories</h4>
            <ul className="space-y-2">
              {categories.map((category) => (
                <li key={category.name}>
                  <Link href={category.href}>
                    <span className="text-sm text-muted-foreground hover-elevate active-elevate-2 inline-block px-2 py-1 -ml-2 rounded-md" data-testid={`link-footer-category-${category.name.toLowerCase().replace(/\s+/g, '-')}`}>
                      {category.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">About</h4>
            <ul className="space-y-2">
              {about.map((item) => (
                <li key={item.name}>
                  <Link href={item.href}>
                    <span className="text-sm text-muted-foreground hover-elevate active-elevate-2 inline-block px-2 py-1 -ml-2 rounded-md" data-testid={`link-footer-${item.name.toLowerCase().replace(/\s+/g, '-')}`}>
                      {item.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Follow Us</h4>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" data-testid="button-social-facebook">
                <Facebook className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" data-testid="button-social-twitter">
                <Twitter className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" data-testid="button-social-instagram">
                <Instagram className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" data-testid="button-social-email">
                <Mail className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} River Valley Report. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
