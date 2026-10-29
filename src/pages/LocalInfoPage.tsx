import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";

const RESOURCES = [
  {
    title: "Find Your Local Utility",
    icon: "🏠",
    description: "Some of the easiest incentives to obtain are from your local electric, gas, and water utilities, which often run their own rebate and efficiency programs.",
    steps: [
      "Check your recent utility bill to find your provider's name.",
      "Visit their website and search for \"rebates,\" \"incentives,\" or \"energy efficiency programs.\"",
      "Many utilities offer free home energy audits. All you have to do is call and ask.",
      "Low-income assistance programs (like LIHEAP) are often administered through utilities.",
    ],
    link: { label: "LIHEAP — Low Income Energy Assistance", url: "https://www.acf.hhs.gov/ocs/low-income-home-energy-assistance-program-liheap" },
  },
  {
    title: "Rewiring America's Savings Calculator",
    icon: "⚡",
    description: "Rewiring America maintains a comprehensive database of federal, state, and local electrification incentives. Their calculator estimates your personal savings based on income and location.",
    steps: [
      "Visit the Rewiring America IRA Savings Calculator.",
      "Enter your zip code and household income.",
      "Browse available rebates for heat pumps, solar, EVs, and more.",
      "Results include both federal IRA rebates and relevant state/local programs.",
    ],
    link: { label: "Rewiring America Savings Calculator", url: "https://www.rewiringamerica.org/app/ira-calculator" },
  },
  {
    title: "DSIRE — State Incentive Database",
    icon: "📋",
    description: "The Database of State Incentives for Renewables & Efficiency (DSIRE) is the most comprehensive source of information on U.S. incentives and policies for renewable energy and energy efficiency.",
    steps: [
      "Visit DSIRE and select your state from the map.",
      "Filter by technology (solar, efficiency, EVs, etc.) and incentive type.",
      "Review the details, eligibility, and links to official program pages.",
      "DSIRE is updated regularly and is maintained by N.C. Clean Energy Technology Center.",
    ],
    link: { label: "DSIRE Database", url: "https://www.dsireusa.org/" },
  },
  {
    title: "Contact Your Local Government",
    icon: "🏛️",
    description: "County and municipal governments may offer additional programs not listed in state or federal databases, such as composting, recycling, and weatherization grants.",
    steps: [
      "Search \"[your city or county] sustainability programs\" or \"green incentives.\"",
      "Check your local government website for environmental or public works departments.",
      "Attend city council or county board meetings where new programs are discussed.",
      "Ask about Community Development Block Grants (CDBG) that may fund local green initiatives.",
    ],
    link: { label: "HUD Community Development Block Grants", url: "https://www.hud.gov/program_offices/comm_planning/cdbg" },
  },
  {
    title: "Energy.gov Tax Credits Guide",
    icon: "💰",
    description: "The Department of Energy provides a guide to all current federal tax credits for energy-efficient home improvements and clean energy installations.",
    steps: [
      "Visit Energy.gov/save for the latest federal incentives.",
      "Use their tool to identify which credits apply to your planned upgrades.",
      "Download IRS Form 5695 for claiming residential energy credits.",
      "Consult a tax professional to ensure you maximize your deductions.",
    ],
    link: { label: "Energy.gov Save Money & Energy", url: "https://www.energy.gov/save" },
  },
];

const sectionVariants = {
  hidden: { opacity: 0, y: 16, filter: "blur(4px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)" },
};

export default function LocalInfoPage() {
  return (
    <div className="container py-12 max-w-4xl">
      <p className="text-sm text-muted-foreground mb-1">
        <Link to="/" className="hover:text-foreground transition-colors">Home</Link> / Local Programs
      </p>
      <h1 className="font-serif text-3xl md:text-4xl mb-2">Local Programs & Resources</h1>
      <p className="text-muted-foreground mb-10 max-w-2xl">
        Beyond the programs listed on RISE, there are many other ways to find incentives in your area. Here is how to navigate local resources.
      </p>

      <div className="space-y-6">
        {RESOURCES.map((resource, i) => (
          <motion.div
            key={resource.title}
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="rounded-xl border bg-card p-6 md:p-8"
          >
            <div className="flex items-start gap-4 mb-4">
              <span className="text-3xl shrink-0">{resource.icon}</span>
              <div>
                <h2 className="font-serif text-xl md:text-2xl text-card-foreground">
                  <a
                    href={resource.link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary hover:underline transition-colors"
                  >
                    {resource.title}
                  </a>
                </h2>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{resource.description}</p>
              </div>
            </div>

            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground ml-12 mb-4">
              {resource.steps.map((step, j) => (
                <li key={j} className="leading-relaxed">{step}</li>
              ))}
            </ol>

            <div className="ml-12">
              <a
                href={resource.link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                {resource.link.label} <ExternalLink size={14} />
              </a>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-12 rounded-xl border border-secondary/40 bg-secondary/10 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Know of a resource we should include?{" "}
          <Link to="/contact" className="text-primary font-medium hover:underline">Let us know</Link>
        </p>
      </div>
    </div>
  );
}
