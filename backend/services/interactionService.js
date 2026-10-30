/**
 * ============================================================================
 * MEDASSIST AI - EDUCATIONAL MEDICATION PAIR NAME CHECK
 * ============================================================================
 * Role:
 *   Performs deterministic name matching for a short list of possible
 *   interactions mentioned in a user question. It does not know which
 *   medicines a person takes, their dose, timing, or clinical history.
 *
 * Scope:
 *   A limited set of medication-name pairs for educational caution. The list
 *   has not been clinically validated and is not a reconciliation engine:
 *   - Anticoagulants/Antiplatelets + NSAIDs/Aspirin (Major Bleeding)
 *   - PDE5 Inhibitors + Nitrates (Profound Refractory Hypotension)
 *   - Serotonergic Opioids/Agents + SSRIs/SNRIs (Serotonin Syndrome)
 *   - ACE Inhibitors/ARBs + K-sparing Diuretics/Potassium (Fatal Hyperkalemia)
 *   - Methotrexate + Trimethoprim-Sulfamethoxazole (Bone Marrow Suppression)
 *   - Fluoroquinolones + Systemic Corticosteroids (Tendon Rupture)
 *   - Benzodiazepines + Opioids (Profound CNS/Respiratory Depression)
 *   - Lithium + NSAIDs/ACE Inhibitors (Lithium Neurotoxicity)
 *   - Allopurinol/Febuxostat + Azathioprine/6-Mercaptopurine (Severe Pancytopenia)
 *   - Methotrexate + NSAIDs/Aspirin (Fatal Bone Marrow Suppression & AKI)
 * ============================================================================
 */

const HIGH_RISK_INTERACTION_RULES = [
  {
    pair: "Anticoagulant / Antiplatelet + NSAIDs / Aspirin",
    drugA: "Anticoagulants / Antiplatelets (e.g., Warfarin, Eliquis, Plavix)",
    drugB: "NSAIDs / Aspirin (e.g., Ibuprofen, Naproxen, Aspirin)",
    severity: "CRITICAL",
    drugsA: [
      /\bwarfarin\b/i, /\bcoumadin\b/i, /\bjantoven\b/i,
      /\bapixaban\b/i, /\beliquis\b/i,
      /\brivaroxaban\b/i, /\bxarelto\b/i,
      /\bdabigatran\b/i, /\bpradaxa\b/i,
      /\bedoxaban\b/i, /\bsavaysa\b/i,
      /\bclopidogrel\b/i, /\bplavix\b/i,
      /\bticagrelor\b/i, /\bbrilinta\b/i,
      /\bprasugrel\b/i, /\beffient\b/i,
      /\bheparin\b/i, /\benoxaparin\b/i, /\blovenox\b/i,
    ],
    drugsB: [
      /\baspirin\b/i, /\bacetylsalicylic acid\b/i,
      /\bibuprofen\b/i, /\bmotrin\b/i, /\badvil\b/i,
      /\bnaproxen\b/i, /\baleve\b/i, /\bnaprosyn\b/i,
      /\bdiclofenac\b/i, /\bvoltaren\b/i,
      /\bcelecoxib\b/i, /\bcelebrex\b/i,
      /\bmeloxicam\b/i, /\bmobic\b/i,
      /\bketorolac\b/i, /\btoradol\b/i,
      /\bindomethacin\b/i, /\bindocin\b/i,
    ],
    description: "Concurrent use significantly elevates gastrointestinal ulceration, systemic bleeding, and intracranial hemorrhage risks.",
  },
  {
    pair: "PDE5 Inhibitor + Nitrate Vasodilator",
    drugA: "PDE5 Inhibitors (e.g., Sildenafil, Tadalafil)",
    drugB: "Nitrates (e.g., Nitroglycerin, Isosorbide)",
    severity: "CRITICAL",
    drugsA: [
      /\bsildenafil\b/i, /\bviagra\b/i, /\brevatio\b/i,
      /\btadalafil\b/i, /\bcialis\b/i, /\badcirca\b/i,
      /\bvardenafil\b/i, /\blevitra\b/i,
      /\bavanafil\b/i, /\bstendra\b/i,
    ],
    drugsB: [
      /\bnitroglycerin\b/i, /\bnitrostat\b/i, /\bnitrolingual\b/i, /\bnitro-dur\b/i,
      /\bisosorbide mononitrate\b/i, /\bimdur\b/i,
      /\bisosorbide dinitrate\b/i, /\bisordil\b/i,
      /\bnitroprusside\b/i, /\bamyl nitrate\b/i, /\bpoppers\b/i,
    ],
    description: "Absolute contraindication: Causes synergistic cyclic GMP accumulation leading to profound, refractory systemic hypotension, syncope, and cardiovascular collapse.",
  },
  {
    pair: "Tramadol / Opioids + SSRIs / SNRIs (Serotonergic Toxicity)",
    drugA: "Serotonergic Analgesics (e.g., Tramadol, Meperidine)",
    drugB: "SSRIs / SNRIs (e.g., Fluoxetine, Sertraline, Venlafaxine)",
    severity: "HIGH",
    drugsA: [
      /\btramadol\b/i, /\bultram\b/i,
      /\bmeperidine\b/i, /\bdemerol\b/i,
      /\bmethadone\b/i,
      /\bdextromethorphan\b/i,
    ],
    drugsB: [
      /\bfluoxetine\b/i, /\bprozac\b/i,
      /\bsertraline\b/i, /\bzoloft\b/i,
      /\bparoxetine\b/i, /\bpaxil\b/i,
      /\bcitalopram\b/i, /\bcelexa\b/i,
      /\bescitalopram\b/i, /\blexapro\b/i,
      /\bvenlafaxine\b/i, /\beffexor\b/i,
      /\bduloxetine\b/i, /\bcymbalta\b/i,
    ],
    description: "Substantially elevates risk of Serotonin Syndrome (altered mental status, neuromuscular excitability, autonomic instability) and lowers seizure threshold.",
  },
  {
    pair: "ACE Inhibitor / ARB + Potassium-Sparing Diuretic / Potassium",
    drugA: "ACE Inhibitors / ARBs (e.g., Lisinopril, Losartan)",
    drugB: "Potassium-Sparing Diuretics / Supplements (e.g., Spironolactone, K-Dur)",
    severity: "HIGH",
    drugsA: [
      /\blisinopril\b/i, /\bprinivil\b/i, /\bzestril\b/i,
      /\benalapril\b/i, /\bvasotec\b/i,
      /\bramipril\b/i, /\baltace\b/i,
      /\blosartan\b/i, /\bcozaar\b/i,
      /\bvalsartan\b/i, /\bdiovan\b/i,
    ],
    drugsB: [
      /\bspironolactone\b/i, /\baldactone\b/i,
      /\beplerenone\b/i, /\binspra\b/i,
      /\btriamterene\b/i, /\bdyrenium\b/i,
      /\bamiloride\b/i,
      /\bpotassium chloride\b/i, /\bk-dur\b/i, /\bmicro-k\b/i, /\bpotassium supplement\b/i,
    ],
    description: "Additive potassium retention elevates the risk of life-threatening hyperkalemia (>5.5 mEq/L) and fatal cardiac conduction blocks.",
  },
  {
    pair: "Methotrexate + Trimethoprim-Sulfamethoxazole",
    drugA: "Methotrexate",
    drugB: "Trimethoprim-Sulfamethoxazole (Bactrim / Septra)",
    severity: "CRITICAL",
    drugsA: [
      /\bmethotrexate\b/i, /\btrexall\b/i, /\botrexup\b/i, /\brasuvo\b/i,
    ],
    drugsB: [
      /\btrimethoprim\b/i, /\bsulfamethoxazole\b/i,
      /\bbactrim\b/i, /\bseptra\b/i, /\bco-trimoxazole\b/i,
    ],
    description: "Trimethoprim reduces renal excretion and displaces methotrexate from plasma protein binding, precipitating severe pancytopenia and acute bone marrow suppression.",
  },
  {
    pair: "Fluoroquinolone + Systemic Corticosteroid",
    drugA: "Fluoroquinolones (e.g., Ciprofloxacin, Levofloxacin)",
    drugB: "Systemic Corticosteroids (e.g., Prednisone, Dexamethasone)",
    severity: "HIGH",
    drugsA: [
      /\bciprofloxacin\b/i, /\bcipro\b/i,
      /\blevofloxacin\b/i, /\blevaquin\b/i,
      /\bmoxifloxacin\b/i, /\bavelox\b/i,
    ],
    drugsB: [
      /\bprednisone\b/i, /\bprednisolone\b/i,
      /\bdexamethasone\b/i, /\bdecadron\b/i,
      /\bmethylprednisolone\b/i, /\bmedrol\b/i,
    ],
    description: "Synergistic tendon collagen degradation markedly increases the risk of severe tendinitis and Achilles tendon rupture (FDA Black Box Warning).",
  },
  {
    pair: "Benzodiazepine / Sedative + Opioid",
    drugA: "Benzodiazepines (e.g., Alprazolam, Lorazepam, Diazepam)",
    drugB: "Opioid Analgesics (e.g., Oxycodone, Morphine, Fentanyl)",
    severity: "CRITICAL",
    drugsA: [
      /\balprazolam\b/i, /\bxanax\b/i,
      /\bdiazepam\b/i, /\bvalium\b/i,
      /\blorazepam\b/i, /\bativan\b/i,
      /\bclonazepam\b/i, /\bklonopin\b/i,
    ],
    drugsB: [
      /\boxycodone\b/i, /\boxycontin\b/i, /\bpercocet\b/i,
      /\bhydrocodone\b/i, /\bvicodin\b/i, /\bnorco\b/i,
      /\bmorphine\b/i, /\bfentanyl\b/i, /\bduragesic\b/i,
      /\bhydromorphone\b/i, /\bdilaudid\b/i,
    ],
    description: "Profound central nervous system and respiratory depression, coma, and fatal overdose resulting from combined GABA and mu-opioid receptor depression (FDA Black Box Warning).",
  },
  {
    pair: "Lithium + NSAIDs / ACE Inhibitors",
    drugA: "Lithium (Eskalith, Lithobid)",
    drugB: "NSAIDs / ACE Inhibitors (e.g., Ibuprofen, Lisinopril)",
    severity: "HIGH",
    drugsA: [
      /\blithium\b/i, /\beskalith\b/i, /\blithobid\b/i,
    ],
    drugsB: [
      /\bibuprofen\b/i, /\bmotrin\b/i, /\badvil\b/i,
      /\bnaproxen\b/i, /\baleve\b/i,
      /\bdiclofenac\b/i, /\bcelecoxib\b/i,
      /\blisinopril\b/i, /\benalapril\b/i, /\bramipril\b/i,
    ],
    description: "Inhibition of renal prostaglandins reduces lithium clearance by up to 40%, precipitating severe lithium neurotoxicity, ataxia, seizures, and nephrotoxicity.",
  },
  {
    pair: "Statin + Strong CYP3A4 Inhibitor / Fibrate",
    drugA: "CYP3A4-Metabolized Statins (e.g., Simvastatin, Atorvastatin, Lovastatin)",
    drugB: "Strong CYP3A4 Inhibitors / Fibrates (e.g., Clarithromycin, Gemfibrozil)",
    severity: "CRITICAL",
    drugsA: [
      /\bsimvastatin\b/i, /\bzocor\b/i,
      /\batorvastatin\b/i, /\blipitor\b/i,
      /\blovastatin\b/i, /\bmevacor\b/i,
    ],
    drugsB: [
      /\bclarithromycin\b/i, /\bbiaxin\b/i,
      /\berythromycin\b/i,
      /\bgemfibrozil\b/i, /\blopid\b/i,
      /\bitraconazole\b/i, /\bsporanox\b/i,
      /\bketoconazole\b/i, /\bnizoral\b/i,
    ],
    description: "Potent metabolic inhibition markedly elevates systemic statin exposure, substantially increasing risks of severe rhabdomyolysis, myopathy, and acute renal failure (FDA Black Box Warning).",
  },
  {
    pair: "Warfarin + Azole Antifungal",
    drugA: "Warfarin (Coumadin)",
    drugB: "Azole Antifungals (e.g., Fluconazole, Voriconazole)",
    severity: "CRITICAL",
    drugsA: [
      /\bwarfarin\b/i, /\bcoumadin\b/i, /\bjantoven\b/i,
    ],
    drugsB: [
      /\bfluconazole\b/i, /\bdiflucan\b/i,
      /\bvoriconazole\b/i, /\bvfend\b/i,
      /\bketoconazole\b/i, /\bitraconazole\b/i,
      /\bposaconazole\b/i,
    ],
    description: "Inhibition of CYP2C9 dramatically reduces clearance of active S-warfarin, causing severe INR elevations and dangerous systemic bleeding events.",
  },
  {
    pair: "Digoxin + Amiodarone / Verapamil",
    drugA: "Digoxin (Lanoxin)",
    drugB: "P-glycoprotein / AV Node Inhibitors (e.g., Amiodarone, Verapamil)",
    severity: "HIGH",
    drugsA: [
      /\bdigoxin\b/i, /\blanoxin\b/i,
    ],
    drugsB: [
      /\bamiodarone\b/i, /\bpacerone\b/i, /\bcordarone\b/i,
      /\bverapamil\b/i, /\bcalan\b/i, /\bisoptin\b/i,
    ],
    description: "P-glycoprotein inhibition reduces renal and biliary digoxin clearance, doubling serum digoxin levels and worsening heart block and life-threatening digitalis arrhythmias.",
  },
  {
    pair: "MAO Inhibitor + SSRI / SNRI / Sympathomimetic",
    drugA: "MAO Inhibitors (e.g., Phenelzine, Tranylcypromine, Selegiline)",
    drugB: "Serotonergic Agents / Sympathomimetics (e.g., Sertraline, Pseudoephedrine)",
    severity: "CRITICAL",
    drugsA: [
      /\bphenelzine\b/i, /\bnardil\b/i,
      /\btranylcypromine\b/i, /\bparnate\b/i,
      /\bselegiline\b/i, /\bemsam\b/i, /\beldepryl\b/i,
      /\bisocarboxazid\b/i, /\bmarplan\b/i,
    ],
    drugsB: [
      /\bfluoxetine\b/i, /\bprozac\b/i,
      /\bsertraline\b/i, /\bzoloft\b/i,
      /\bparoxetine\b/i, /\bpaxil\b/i,
      /\bcitalopram\b/i, /\bescitalopram\b/i,
      /\bvenlafaxine\b/i, /\bduloxetine\b/i,
      /\bpseudoephedrine\b/i, /\bsudafed\b/i,
    ],
    description: "Contraindicated combination: precipitous catecholamine and serotonin accumulation can induce fatal hyperthermia, malignant hypertensive crisis, and severe Serotonin Syndrome.",
  },
  {
    pair: "Allopurinol / Febuxostat + Azathioprine / 6-Mercaptopurine",
    drugA: "Xanthine Oxidase Inhibitors (e.g., Allopurinol, Febuxostat)",
    drugB: "Thiopurines (e.g., Azathioprine, 6-Mercaptopurine)",
    severity: "CRITICAL",
    drugsA: [
      /\ballopurinol\b/i, /\bzyloprim\b/i, /\baloprim\b/i,
      /\bfebuxostat\b/i, /\buloric\b/i,
    ],
    drugsB: [
      /\bazathioprine\b/i, /\bimuran\b/i, /\bazasan\b/i,
      /\b6-mercaptopurine\b/i, /\b6-mp\b/i, /\bpurinethol\b/i, /\bpurixan\b/i,
    ],
    description: "Major contraindication: Xanthine oxidase inhibition blocks thiopurine degradation, precipitating severe active metabolite accumulation, life-threatening bone marrow suppression, and profound pancytopenia.",
  },
  {
    pair: "Methotrexate + NSAIDs / High-Dose Aspirin",
    drugA: "Methotrexate (e.g., Rheumatrex, Trexall)",
    drugB: "NSAIDs / Aspirin (e.g., Ibuprofen, Naproxen, Ketorolac, High-Dose Aspirin)",
    severity: "CRITICAL",
    drugsA: [
      /\bmethotrexate\b/i, /\btrexall\b/i, /\botrexup\b/i, /\brasuvo\b/i, /\brheumatrex\b/i,
    ],
    drugsB: [
      /\bibuprofen\b/i, /\bmotrin\b/i, /\badvil\b/i,
      /\bnaproxen\b/i, /\baleve\b/i, /\bnaprosyn\b/i,
      /\bketorolac\b/i, /\btoradol\b/i,
      /\bmeloxicam\b/i, /\bmobic\b/i,
      /\bdiclofenac\b/i, /\bvoltaren\b/i,
      /\bindomethacin\b/i, /\bindocin\b/i,
      /\bcelecoxib\b/i, /\bcelebrex\b/i,
      /\baspirin\b/i, /\bacetylsalicylic acid\b/i,
    ],
    description: "Inhibition of renal prostaglandin synthesis and competitive tubular secretion blockage by NSAIDs markedly reduces renal methotrexate clearance, precipitating life-threatening bone marrow suppression, pancytopenia, and acute kidney injury (FDA Black Box Warning).",
  },
];

/**
 * Screen input text for known high-risk drug-drug interaction pairs.
 * @param {string} text - User prompt or generated answer text
 * @returns {Array<Object>} Array of detected interaction warning objects
 */
function detectDrugInteractions(text) {
  if (typeof text !== "string" || !text.trim()) return [];
  const normalized = text.toLowerCase();
  const detected = [];

  for (const rule of HIGH_RISK_INTERACTION_RULES) {
    const hasA = rule.drugsA.some((p) => p.test(normalized));
    const hasB = rule.drugsB.some((p) => p.test(normalized));
    if (hasA && hasB) {
      detected.push({
        pair: rule.pair,
        drugA: rule.drugA,
        drugB: rule.drugB,
        severity: rule.severity,
        description: rule.description,
        clinicalRecommendation: "This text mentions a potentially interacting medication pair. If you are considering or taking both, check with your prescriber or pharmacist. Do not change prescribed medicines based on this app.",
      });
    }
  }

  return detected;
}

module.exports = {
  detectDrugInteractions,
  HIGH_RISK_INTERACTION_RULES,
};
