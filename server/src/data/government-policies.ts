export interface GovernmentPolicy {
  code: string;
  name: string;
  ministry: string;
  description: string;
  sectors: string[];
  benefits: string[];
  eligibility_criteria: string[];
  health_score_impact: string;
  relevance_weight: number;
}

const POLICY_CATALOG: GovernmentPolicy[] = [
  {
    code: "UDYAM",
    name: "Udyam Registration",
    ministry: "MSME Ministry",
    description:
      "Official MSME registration portal enabling priority sector lending, subsidies, and tender preferences.",
    sectors: ["general"],
    benefits: [
      "Collateral-free loans up to ₹2 Cr",
      "Lower interest rates",
      "Tender set-asides",
      "ISO certification reimbursement",
    ],
    eligibility_criteria: ["Investment and turnover within MSME limits", "Valid Aadhaar-linked registration"],
    health_score_impact: "positive",
    relevance_weight: 1.0,
  },
  {
    code: "CGTMSE",
    name: "Credit Guarantee Fund Trust for Micro and Small Enterprises",
    ministry: "MSME Ministry / DFS",
    description: "Collateral-free credit guarantee for MSME loans up to ₹5 Cr.",
    sectors: ["general"],
    benefits: ["Up to 85% guarantee cover", "No third-party collateral required", "Faster loan sanction"],
    eligibility_criteria: ["Udyam-registered MSME", "New or existing MSE borrower", "Member lending institution"],
    health_score_impact: "positive",
    relevance_weight: 0.95,
  },
  {
    code: "PMMY",
    name: "Pradhan Mantri MUDRA Yojana",
    ministry: "DFS",
    description: "Micro-finance scheme for non-corporate, non-farm small/micro enterprises.",
    sectors: ["general", "trading", "services"],
    benefits: ["Shishu (up to ₹50K)", "Kishore (₹50K–5L)", "Tarun (₹5L–20L)", "No collateral for small loans"],
    eligibility_criteria: ["Non-corporate small business", "Credit requirement up to ₹20L"],
    health_score_impact: "positive",
    relevance_weight: 0.85,
  },
  {
    code: "PLI_AUTO",
    name: "Production Linked Incentive — Automobile & Auto Components",
    ministry: "Heavy Industries",
    description: "PLI scheme boosting domestic auto component manufacturing and EV supply chain.",
    sectors: ["auto_components", "manufacturing"],
    benefits: ["4–13% incentive on incremental sales", "EV component priority", "Import substitution tailwind"],
    eligibility_criteria: ["Minimum investment threshold", "Domestic value addition norms", "Global group revenue criteria"],
    health_score_impact: "positive",
    relevance_weight: 0.9,
  },
  {
    code: "PLI_ADV_CHEM",
    name: "PLI — Advanced Chemistry Cell Battery Storage",
    ministry: "Heavy Industries",
    description: "Incentivises ACC battery manufacturing for EV and energy storage ecosystems.",
    sectors: ["auto_components", "electronics", "renewable_energy"],
    benefits: ["Incentive on cell sales", "EV ecosystem demand boost", "Energy storage market access"],
    eligibility_criteria: ["Minimum 5 GWh capacity commitment", "Domestic manufacturing"],
    health_score_impact: "positive",
    relevance_weight: 0.75,
  },
  {
    code: "CLCSS",
    name: "Credit Linked Capital Subsidy Scheme",
    ministry: "MSME Ministry",
    description: "15% capital subsidy for technology upgradation in MSME manufacturing.",
    sectors: ["manufacturing", "auto_components", "textiles", "food_processing"],
    benefits: ["15% subsidy on institutional finance", "Technology modernisation", "Improved productivity"],
    eligibility_criteria: ["Udyam-registered", "Eligible plant & machinery", "Approved technology"],
    health_score_impact: "positive",
    relevance_weight: 0.8,
  },
  {
    code: "ZED",
    name: "Zero Defect Zero Effect (ZED) Certification",
    ministry: "MSME Ministry",
    description: "Quality and sustainability certification programme for MSME manufacturers.",
    sectors: ["manufacturing", "auto_components", "electronics"],
    benefits: [
      "Quality benchmarking",
      "Export readiness",
      "Green manufacturing recognition",
      "Subsidy on certification cost",
    ],
    eligibility_criteria: ["Manufacturing MSME", "Commitment to quality standards"],
    health_score_impact: "positive",
    relevance_weight: 0.7,
  },
  {
    code: "SAMADHAN",
    name: "MSME Samadhaan — Delayed Payment Monitoring",
    ministry: "MSME Ministry",
    description: "Portal for filing delayed payment complaints against buyers (Section 16 MSMED Act).",
    sectors: ["general"],
    benefits: ["Recovery of delayed payments with interest", "Buyer blacklisting", "Improved receivables cycle"],
    eligibility_criteria: ["Udyam-registered supplier", "Undisputed dues from buyer"],
    health_score_impact: "positive",
    relevance_weight: 0.75,
  },
  {
    code: "MAKE_IN_INDIA",
    name: "Make in India 2.0",
    ministry: "Commerce & DPIIT",
    description: "National manufacturing push with sector-specific production targets and FDI facilitation.",
    sectors: ["manufacturing", "auto_components", "electronics", "pharma"],
    benefits: ["FDI facilitation", "Industrial corridor access", "Domestic demand preference in govt procurement"],
    eligibility_criteria: ["Manufacturing entity in focus sectors"],
    health_score_impact: "positive",
    relevance_weight: 0.8,
  },
  {
    code: "SOLAR_ROOFTOP",
    name: "PM-KUSUM / Rooftop Solar Subsidy",
    ministry: "MNRE",
    description: "Subsidies for solar rooftop installations reducing energy costs and Scope 2 emissions.",
    sectors: ["manufacturing", "auto_components", "food_processing", "general"],
    benefits: ["Up to 40% capital subsidy", "Reduced electricity costs", "Carbon footprint reduction"],
    eligibility_criteria: ["Own rooftop or lease agreement", "DISCOM approval", "Eligible installer"],
    health_score_impact: "positive",
    relevance_weight: 0.7,
  },
  {
    code: "GECL",
    name: "Emergency Credit Line Guarantee Scheme (ECLGS successor)",
    ministry: "DFS",
    description: "Guaranteed emergency credit for MSMEs during economic stress periods.",
    sectors: ["general"],
    benefits: ["Additional working capital", "Guarantee cover", "Moratorium options"],
    eligibility_criteria: ["GST-compliant MSME", "Satisfactory account conduct"],
    health_score_impact: "positive",
    relevance_weight: 0.65,
  },
  {
    code: "PLI_TEXTILE",
    name: "PLI — Textiles (MMF & Technical Textiles)",
    ministry: "Textiles",
    description: "Production linked incentive for man-made fibre and technical textiles.",
    sectors: ["textiles"],
    benefits: ["Incentive on incremental turnover", "Export competitiveness"],
    eligibility_criteria: ["Minimum investment", "MMF or technical textile production"],
    health_score_impact: "positive",
    relevance_weight: 0.85,
  },
  {
    code: "FPO_FARM",
    name: "PM Formalisation of Micro Food Processing Enterprises",
    ministry: "Food Processing",
    description: "Support for micro food processing enterprises with credit-linked subsidy.",
    sectors: ["food_processing"],
    benefits: ["35% capital subsidy", "Branding support", "Capacity building"],
    eligibility_criteria: ["Food processing MSME", "Udyam-registered"],
    health_score_impact: "positive",
    relevance_weight: 0.85,
  },
  {
    code: "STARTUP_INDIA",
    name: "Startup India Seed Fund Scheme",
    ministry: "DPIIT",
    description: "Seed funding and incubation support for DPIIT-recognised startups.",
    sectors: ["services", "electronics", "general"],
    benefits: ["Seed funding up to ₹50L", "Incubation support", "Tax exemptions (eligible startups)"],
    eligibility_criteria: ["DPIIT-recognised startup", "Innovative product/service"],
    health_score_impact: "positive",
    relevance_weight: 0.6,
  },
  {
    code: "BEE_STAR",
    name: "BEE Star Label / PAT Scheme",
    ministry: "Power",
    description: "Energy efficiency labelling and Perform-Achieve-Trade for designated consumers.",
    sectors: ["manufacturing", "auto_components"],
    benefits: ["Energy cost reduction", "Regulatory compliance", "Green finance eligibility"],
    eligibility_criteria: ["Designated energy consumer or voluntary labelling"],
    health_score_impact: "positive",
    relevance_weight: 0.65,
  },
];

const SECTOR_ALIASES: Record<string, string> = {
  manufacturing: "manufacturing",
  auto: "auto_components",
  auto_components: "auto_components",
  automotive: "auto_components",
  food: "food_processing",
  food_processing: "food_processing",
  textile: "textiles",
  textiles: "textiles",
  electronics: "electronics",
  pharma: "pharma",
  services: "services",
  trading: "trading",
  renewable: "renewable_energy",
  renewable_energy: "renewable_energy",
};

function normalizeSector(sector: string): string {
  const key = sector.toLowerCase().trim().replace(/ /g, "_");
  return SECTOR_ALIASES[key] ?? key;
}

export function getApplicablePolicies(sector: string, productCategories?: string[]): GovernmentPolicy[] {
  const normalized = normalizeSector(sector);
  const applicable: GovernmentPolicy[] = [];

  for (const policy of POLICY_CATALOG) {
    if (policy.sectors.includes("general") || policy.sectors.includes(normalized)) {
      applicable.push(policy);
      continue;
    }
    if (productCategories?.length) {
      const productText = productCategories.join(" ").toLowerCase();
      if (
        policy.code === "PLI_AUTO" &&
        ["auto", "component", "ev", "chassis", "forging"].some((k) => productText.includes(k))
      ) {
        applicable.push(policy);
      }
    }
  }

  return applicable.sort((a, b) => b.relevance_weight - a.relevance_weight);
}

export function toPolicyResponse(policy: GovernmentPolicy) {
  return {
    code: policy.code,
    name: policy.name,
    ministry: policy.ministry,
    description: policy.description,
    benefits: policy.benefits,
    eligibility_criteria: policy.eligibility_criteria,
    health_score_impact: policy.health_score_impact,
  };
}
