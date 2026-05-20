import { Code2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-border py-12 bg-secondary/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                <Code2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold">CodeJudge</span>
            </div>
            <p className="text-muted-foreground text-sm">
              Empowering programming education worldwide.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-foreground transition">
                  Features
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition">
                  Documentation
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-foreground transition">
                  About
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition">
                  Contact
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-foreground transition">
                  Privacy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition">
                  Terms
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition">
                  Security
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border pt-8 flex flex-col sm:flex-row justify-between items-center text-sm text-muted-foreground">
          <p>&copy; 2024 CodeJudge. All rights reserved.</p>
          <div className="flex gap-6 mt-4 sm:mt-0">
            <a href="#" className="hover:text-foreground transition">
              Twitter
            </a>
            <a href="#" className="hover:text-foreground transition">
              GitHub
            </a>
            <a href="#" className="hover:text-foreground transition">
              Discord
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
