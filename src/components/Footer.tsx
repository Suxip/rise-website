import { Link } from "react-router-dom";
import riseLogo from "@/assets/rise-logo.png";

export default function Footer() {
  return (
    <footer className="border-t bg-card mt-auto">
      <div className="container py-10 grid gap-8 sm:grid-cols-3">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <img src={riseLogo} alt="RISE logo" className="h-10 w-auto" />
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Residential Incentives for Sustainability and Environmentalism. Helping every household access tax rebates, programs, and incentives.
          </p>
        </div>
        <div>
          <h4 className="font-sans text-sm font-semibold mb-3 text-foreground">Navigate</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/" className="hover:text-foreground transition-colors">Home</Link></li>
            <li><Link to="/states" className="hover:text-foreground transition-colors">State Programs</Link></li>
            <li><Link to="/federal" className="hover:text-foreground transition-colors">Federal Programs</Link></li>
            <li><Link to="/local" className="hover:text-foreground transition-colors">Local Programs</Link></li>
            <li><Link to="/about" className="hover:text-foreground transition-colors">About Us</Link></li>
            <li><Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-sans text-sm font-semibold mb-3 text-foreground">Get in Touch</h4>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Questions, corrections, or suggestions? Reach out to us directly.
          </p>
          <a
            href="mailto:rise_initiative@cornell.edu"
            className="text-sm font-medium text-primary hover:underline"
          >
            rise_initiative@cornell.edu
          </a>
        </div>
      </div>
      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        © 2026 RISE.
      </div>
    </footer>
  );
}
