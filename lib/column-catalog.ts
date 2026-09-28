// ── Column catalogue ────────────────────────────────────────────────────────
// Commercial stationary phases and the dimension option lists that go with
// them, keyed by technique family. Feeds the structured column selector in
// Step 2 of the query form; the selector composes a canonical column string
// into the existing `column` field, so nothing downstream has to change.
//
// The catalogue is a convenience, never a constraint: a column that is not
// listed can always be typed in free text.

export type ColumnFamily = 'gc' | 'lc' | 'ic' | 'sfc' | 'sec';

export interface ColumnPhase {
  /** Commercial name as printed on the column box, e.g. "DB-5ms". */
  name: string;
  vendor: string;
  /** Group heading in the catalogue list. */
  chemistry: string;
  /** One line on what the phase is for. */
  description: string;
}

export type ColumnDimensionKey = 'length' | 'id' | 'film' | 'particle';

export interface ColumnDimensionSpec {
  key: ColumnDimensionKey;
  label: string;
  unit: string;
  options: string[];
}

export interface ColumnFamilySpec {
  family: ColumnFamily;
  label: string;
  phasePlaceholder: string;
  phases: ColumnPhase[];
  /** Always three: the dimensions that define a column in this family. */
  dimensions: ColumnDimensionSpec[];
}

// ─── GC ──────────────────────────────────────────────────────────────

const GC_PHASES: ColumnPhase[] = [
  // 100% dimethylpolysiloxane
  { name: 'DB-1', vendor: 'Agilent J&W', chemistry: 'Non-polar (100% dimethylpolysiloxane)', description: 'General-purpose non-polar; hydrocarbons, solvents, petroleum' },
  { name: 'DB-1ms', vendor: 'Agilent J&W', chemistry: 'Non-polar (100% dimethylpolysiloxane)', description: 'Low-bleed non-polar for MS detection' },
  { name: 'HP-1', vendor: 'Agilent J&W', chemistry: 'Non-polar (100% dimethylpolysiloxane)', description: 'Non-polar general purpose' },
  { name: 'Rtx-1', vendor: 'Restek', chemistry: 'Non-polar (100% dimethylpolysiloxane)', description: 'Non-polar, high temperature limit' },
  { name: 'Rxi-1ms', vendor: 'Restek', chemistry: 'Non-polar (100% dimethylpolysiloxane)', description: 'Low-bleed non-polar for GC-MS' },
  { name: 'ZB-1', vendor: 'Phenomenex', chemistry: 'Non-polar (100% dimethylpolysiloxane)', description: 'Non-polar general purpose' },
  { name: 'CP-Sil 5 CB', vendor: 'Agilent (Varian)', chemistry: 'Non-polar (100% dimethylpolysiloxane)', description: 'Non-polar, bonded and cross-linked' },
  { name: 'TG-1MS', vendor: 'Thermo Scientific', chemistry: 'Non-polar (100% dimethylpolysiloxane)', description: 'Low-bleed non-polar for MS' },
  { name: 'HP-PONA', vendor: 'Agilent J&W', chemistry: 'Non-polar (100% dimethylpolysiloxane)', description: 'High-resolution hydrocarbon (PONA) analysis' },

  // 5% phenyl — the workhorse
  { name: 'DB-5ms', vendor: 'Agilent J&W', chemistry: '5% phenyl (general purpose / MS)', description: 'Low-bleed workhorse phase; semivolatiles, pesticides, GC-MS' },
  { name: 'DB-5ms UI', vendor: 'Agilent J&W', chemistry: '5% phenyl (general purpose / MS)', description: 'Ultra-inert 5% phenyl for active analytes' },
  { name: 'DB-5', vendor: 'Agilent J&W', chemistry: '5% phenyl (general purpose / MS)', description: 'Classic 5% phenyl, FID and general use' },
  { name: 'HP-5ms', vendor: 'Agilent J&W', chemistry: '5% phenyl (general purpose / MS)', description: 'Low-bleed 5% phenyl for MS detection' },
  { name: 'HP-5ms Ultra Inert', vendor: 'Agilent J&W', chemistry: '5% phenyl (general purpose / MS)', description: 'Ultra-inert low-bleed 5% phenyl' },
  { name: 'HP-5', vendor: 'Agilent J&W', chemistry: '5% phenyl (general purpose / MS)', description: 'General-purpose 5% phenyl' },
  { name: 'Rtx-5', vendor: 'Restek', chemistry: '5% phenyl (general purpose / MS)', description: 'General-purpose 5% phenyl' },
  { name: 'Rxi-5ms', vendor: 'Restek', chemistry: '5% phenyl (general purpose / MS)', description: 'Low-bleed 5% phenyl for GC-MS' },
  { name: 'Rxi-5Sil MS', vendor: 'Restek', chemistry: '5% phenyl (general purpose / MS)', description: 'Low-bleed, highly inert silarylene 5% phenyl' },
  { name: 'ZB-5MS', vendor: 'Phenomenex', chemistry: '5% phenyl (general purpose / MS)', description: 'Low-bleed 5% phenyl for MS' },
  { name: 'ZB-5MSplus', vendor: 'Phenomenex', chemistry: '5% phenyl (general purpose / MS)', description: 'Inert, low-bleed 5% phenyl' },
  { name: 'ZB-5', vendor: 'Phenomenex', chemistry: '5% phenyl (general purpose / MS)', description: 'General-purpose 5% phenyl' },
  { name: 'VF-5ms', vendor: 'Agilent (Varian)', chemistry: '5% phenyl (general purpose / MS)', description: 'Low-bleed 5% phenyl for MS' },
  { name: 'CP-Sil 8 CB', vendor: 'Agilent (Varian)', chemistry: '5% phenyl (general purpose / MS)', description: '5% phenyl, bonded and cross-linked' },
  { name: 'TG-5MS', vendor: 'Thermo Scientific', chemistry: '5% phenyl (general purpose / MS)', description: 'Low-bleed 5% phenyl for MS' },
  { name: 'TG-5SilMS', vendor: 'Thermo Scientific', chemistry: '5% phenyl (general purpose / MS)', description: 'Silarylene 5% phenyl, very low bleed' },
  { name: 'SLB-5ms', vendor: 'Supelco', chemistry: '5% phenyl (general purpose / MS)', description: 'Low-bleed silphenylene 5% phenyl' },
  { name: 'DB-XLB', vendor: 'Agilent J&W', chemistry: '5% phenyl (general purpose / MS)', description: 'Extra-low-bleed, alternative selectivity to 5% phenyl' },

  // Mid-polarity
  { name: 'DB-17ms', vendor: 'Agilent J&W', chemistry: 'Mid-polar (17–50% phenyl)', description: '50%-phenyl-equivalent; pesticides, drugs, phthalates' },
  { name: 'DB-17', vendor: 'Agilent J&W', chemistry: 'Mid-polar (17–50% phenyl)', description: '50% phenyl, mid-polarity selectivity' },
  { name: 'HP-50+', vendor: 'Agilent J&W', chemistry: 'Mid-polar (17–50% phenyl)', description: '50% phenyl general purpose' },
  { name: 'Rtx-50', vendor: 'Restek', chemistry: 'Mid-polar (17–50% phenyl)', description: '50% phenyl mid-polarity' },
  { name: 'Rxi-17Sil MS', vendor: 'Restek', chemistry: 'Mid-polar (17–50% phenyl)', description: 'Low-bleed mid-polar silarylene for MS' },
  { name: 'ZB-50', vendor: 'Phenomenex', chemistry: 'Mid-polar (17–50% phenyl)', description: '50% phenyl mid-polarity' },
  { name: 'DB-35ms', vendor: 'Agilent J&W', chemistry: 'Mid-polar (17–50% phenyl)', description: '35% phenyl, low bleed; nitrogen/phosphorus pesticides' },
  { name: 'Rtx-35', vendor: 'Restek', chemistry: 'Mid-polar (17–50% phenyl)', description: '35% phenyl mid-polarity' },
  { name: 'TG-35MS', vendor: 'Thermo Scientific', chemistry: 'Mid-polar (17–50% phenyl)', description: '35% phenyl low bleed' },
  { name: 'DB-1701', vendor: 'Agilent J&W', chemistry: 'Cyanopropylphenyl (1701)', description: '14% cyanopropylphenyl; pesticides, herbicides' },
  { name: 'Rtx-1701', vendor: 'Restek', chemistry: 'Cyanopropylphenyl (1701)', description: '14% cyanopropylphenyl selectivity' },
  { name: 'ZB-1701', vendor: 'Phenomenex', chemistry: 'Cyanopropylphenyl (1701)', description: '14% cyanopropylphenyl selectivity' },
  { name: 'CP-Sil 19 CB', vendor: 'Agilent (Varian)', chemistry: 'Cyanopropylphenyl (1701)', description: 'Cyanopropylphenyl, bonded' },

  // Volatiles / 624
  { name: 'DB-624', vendor: 'Agilent J&W', chemistry: 'Volatiles (624 / VOC)', description: '6% cyanopropylphenyl; purge-and-trap VOC, residual solvents' },
  { name: 'DB-624 UI', vendor: 'Agilent J&W', chemistry: 'Volatiles (624 / VOC)', description: 'Ultra-inert 624 for VOC and residual solvents' },
  { name: 'Rtx-624', vendor: 'Restek', chemistry: 'Volatiles (624 / VOC)', description: '624 phase for volatiles' },
  { name: 'Rxi-624Sil MS', vendor: 'Restek', chemistry: 'Volatiles (624 / VOC)', description: 'Low-bleed 624 silarylene for VOC by MS' },
  { name: 'ZB-624', vendor: 'Phenomenex', chemistry: 'Volatiles (624 / VOC)', description: '624 phase for volatiles' },
  { name: 'VF-624ms', vendor: 'Agilent (Varian)', chemistry: 'Volatiles (624 / VOC)', description: 'Low-bleed 624 for MS' },
  { name: 'TG-624', vendor: 'Thermo Scientific', chemistry: 'Volatiles (624 / VOC)', description: '624 phase for volatiles' },
  { name: 'DB-VRX', vendor: 'Agilent J&W', chemistry: 'Volatiles (624 / VOC)', description: 'Optimised for volatile organics by GC-MS' },
  { name: 'Rtx-VMS', vendor: 'Restek', chemistry: 'Volatiles (624 / VOC)', description: 'Volatile organics, fast VOC methods' },

  // Polar WAX / PEG
  { name: 'DB-WAX', vendor: 'Agilent J&W', chemistry: 'Polar (PEG / WAX)', description: 'Polyethylene glycol; alcohols, flavours, fragrances' },
  { name: 'DB-WAXetr', vendor: 'Agilent J&W', chemistry: 'Polar (PEG / WAX)', description: 'Extended-temperature-range PEG' },
  { name: 'HP-INNOWax', vendor: 'Agilent J&W', chemistry: 'Polar (PEG / WAX)', description: 'High-temperature PEG, low bleed' },
  { name: 'Stabilwax', vendor: 'Restek', chemistry: 'Polar (PEG / WAX)', description: 'Bonded PEG for polar analytes' },
  { name: 'Rtx-Wax', vendor: 'Restek', chemistry: 'Polar (PEG / WAX)', description: 'PEG phase, general polar use' },
  { name: 'ZB-WAXplus', vendor: 'Phenomenex', chemistry: 'Polar (PEG / WAX)', description: 'Inert, high-temperature PEG' },
  { name: 'CP-Wax 52 CB', vendor: 'Agilent (Varian)', chemistry: 'Polar (PEG / WAX)', description: 'Bonded PEG' },
  { name: 'Supelcowax 10', vendor: 'Supelco', chemistry: 'Polar (PEG / WAX)', description: 'PEG for flavours, fragrances, FAME' },
  { name: 'TG-WAXMS', vendor: 'Thermo Scientific', chemistry: 'Polar (PEG / WAX)', description: 'Low-bleed PEG for MS' },
  { name: 'DB-FFAP', vendor: 'Agilent J&W', chemistry: 'Acid-modified PEG (FFAP)', description: 'Nitroterephthalic-acid-modified PEG; free fatty acids, phenols' },
  { name: 'HP-FFAP', vendor: 'Agilent J&W', chemistry: 'Acid-modified PEG (FFAP)', description: 'Acidic analytes, free fatty acids' },
  { name: 'Stabilwax-DA', vendor: 'Restek', chemistry: 'Acid-modified PEG (FFAP)', description: 'Acid-deactivated PEG for acids and amines' },
  { name: 'Nukol', vendor: 'Supelco', chemistry: 'Acid-modified PEG (FFAP)', description: 'Acid-modified PEG for volatile free fatty acids' },

  // Highly polar / FAME
  { name: 'HP-88', vendor: 'Agilent J&W', chemistry: 'Highly polar (cyanopropyl / FAME)', description: '88% cyanopropyl; cis/trans FAME separation' },
  { name: 'SP-2560', vendor: 'Supelco', chemistry: 'Highly polar (cyanopropyl / FAME)', description: '100 m biscyanopropyl for FAME isomers' },
  { name: 'CP-Sil 88', vendor: 'Agilent (Varian)', chemistry: 'Highly polar (cyanopropyl / FAME)', description: 'Biscyanopropyl for FAME and trans fats' },
  { name: 'Rt-2560', vendor: 'Restek', chemistry: 'Highly polar (cyanopropyl / FAME)', description: 'Biscyanopropyl FAME column' },
  { name: 'Omegawax', vendor: 'Supelco', chemistry: 'Highly polar (cyanopropyl / FAME)', description: 'PEG optimised for FAME' },
  { name: 'DB-23', vendor: 'Agilent J&W', chemistry: 'Highly polar (cyanopropyl / FAME)', description: '50% cyanopropyl for FAME' },
  { name: 'DB-225', vendor: 'Agilent J&W', chemistry: 'Highly polar (cyanopropyl / FAME)', description: '50% cyanopropylphenyl, polar selectivity' },
  { name: 'DB-200', vendor: 'Agilent J&W', chemistry: 'Highly polar (cyanopropyl / FAME)', description: 'Trifluoropropyl phase, unique selectivity' },
  { name: 'DB-210', vendor: 'Agilent J&W', chemistry: 'Highly polar (cyanopropyl / FAME)', description: '50% trifluoropropyl, halogenated selectivity' },

  // PLOT / gas analysis
  { name: 'HP-PLOT Q', vendor: 'Agilent J&W', chemistry: 'PLOT (permanent gases / light hydrocarbons)', description: 'Divinylbenzene PLOT; CO₂, light hydrocarbons, solvents' },
  { name: 'Rt-Q-BOND', vendor: 'Restek', chemistry: 'PLOT (permanent gases / light hydrocarbons)', description: 'Q-type PLOT for CO₂ and C1–C3 hydrocarbons' },
  { name: 'HP-PLOT U', vendor: 'Agilent J&W', chemistry: 'PLOT (permanent gases / light hydrocarbons)', description: 'Polar PLOT for polar volatiles and gases' },
  { name: 'Rt-U-BOND', vendor: 'Restek', chemistry: 'PLOT (permanent gases / light hydrocarbons)', description: 'U-type PLOT for polar volatiles' },
  { name: 'HP-PLOT Molesieve 5A', vendor: 'Agilent J&W', chemistry: 'PLOT (permanent gases / light hydrocarbons)', description: 'Molecular sieve; H₂, O₂, N₂, CH₄, CO separation' },
  { name: 'Rt-Msieve 5A', vendor: 'Restek', chemistry: 'PLOT (permanent gases / light hydrocarbons)', description: 'Molecular sieve for permanent gases' },
  { name: 'HP-PLOT Al₂O₃ "S"', vendor: 'Agilent J&W', chemistry: 'PLOT (permanent gases / light hydrocarbons)', description: 'Alumina PLOT for light hydrocarbon isomers' },
  { name: 'Rt-Alumina BOND/MAPD', vendor: 'Restek', chemistry: 'PLOT (permanent gases / light hydrocarbons)', description: 'Alumina PLOT for C1–C5 hydrocarbons' },
  { name: 'GS-GasPro', vendor: 'Agilent J&W', chemistry: 'PLOT (permanent gases / light hydrocarbons)', description: 'Bonded silica PLOT; sulfur gases, light hydrocarbons' },
  { name: 'CP-PoraBOND Q', vendor: 'Agilent (Varian)', chemistry: 'PLOT (permanent gases / light hydrocarbons)', description: 'Porous polymer PLOT, low particle release' },

  // Application-specific
  { name: 'Rtx-CLPesticides', vendor: 'Restek', chemistry: 'Application-specific', description: 'Organochlorine pesticides, ECD methods' },
  { name: 'Rtx-CLPesticides2', vendor: 'Restek', chemistry: 'Application-specific', description: 'Confirmation column for pesticide methods' },
  { name: 'DB-EUPAH', vendor: 'Agilent J&W', chemistry: 'Application-specific', description: 'EU-regulated polycyclic aromatic hydrocarbons' },
  { name: 'Rxi-PAH', vendor: 'Restek', chemistry: 'Application-specific', description: 'PAH isomer separation' },
  { name: 'DB-ALC1', vendor: 'Agilent J&W', chemistry: 'Application-specific', description: 'Blood alcohol, primary column' },
  { name: 'DB-ALC2', vendor: 'Agilent J&W', chemistry: 'Application-specific', description: 'Blood alcohol, confirmation column' },
  { name: 'Rtx-BAC Plus 1', vendor: 'Restek', chemistry: 'Application-specific', description: 'Blood alcohol analysis, primary' },
  { name: 'Rtx-BAC Plus 2', vendor: 'Restek', chemistry: 'Application-specific', description: 'Blood alcohol analysis, confirmation' },
  { name: 'Cyclosil-B', vendor: 'Agilent J&W', chemistry: 'Chiral', description: 'Cyclodextrin chiral phase for enantiomers' },
  { name: 'CP-Chirasil-Dex CB', vendor: 'Agilent (Varian)', chemistry: 'Chiral', description: 'Bonded cyclodextrin chiral phase' },
  { name: 'Rt-βDEXsm', vendor: 'Restek', chemistry: 'Chiral', description: 'Permethylated β-cyclodextrin chiral phase' },
  { name: 'Astec CHIRALDEX G-TA', vendor: 'Supelco', chemistry: 'Chiral', description: 'Trifluoroacetyl γ-cyclodextrin chiral phase' },
];

const GC_DIMENSIONS: ColumnDimensionSpec[] = [
  {
    key: 'length', label: 'Length', unit: 'm',
    options: ['5', '10', '15', '20', '25', '30', '40', '50', '60', '75', '100', '105'],
  },
  {
    key: 'id', label: 'Inner diameter', unit: 'mm',
    options: ['0.10', '0.15', '0.18', '0.20', '0.25', '0.32', '0.45', '0.53'],
  },
  {
    key: 'film', label: 'Film thickness', unit: 'µm',
    options: ['0.10', '0.15', '0.18', '0.20', '0.25', '0.33', '0.40', '0.50', '1.00', '1.20', '1.40', '1.50', '3.00', '5.00'],
  },
];

// ─── LC (HPLC, UHPLC, LC-MS, prep LC) ────────────────────────────────

const LC_PHASES: ColumnPhase[] = [
  // Reversed phase C18
  { name: 'ACQUITY UPLC BEH C18', vendor: 'Waters', chemistry: 'Reversed phase — C18', description: 'Hybrid particle, wide pH range 1–12; UPLC workhorse' },
  { name: 'ACQUITY UPLC HSS T3', vendor: 'Waters', chemistry: 'Reversed phase — C18', description: 'Silica C18, trifunctional; retains polar analytes' },
  { name: 'ACQUITY UPLC CSH C18', vendor: 'Waters', chemistry: 'Reversed phase — C18', description: 'Charged-surface hybrid; basic analytes at low ionic strength' },
  { name: 'ACQUITY Premier BEH C18', vendor: 'Waters', chemistry: 'Reversed phase — C18', description: 'MaxPeak surface, reduces metal-chelating analyte loss' },
  { name: 'XBridge BEH C18', vendor: 'Waters', chemistry: 'Reversed phase — C18', description: 'Hybrid HPLC column, high-pH stable' },
  { name: 'XSelect HSS T3', vendor: 'Waters', chemistry: 'Reversed phase — C18', description: 'Polar-retentive HPLC C18' },
  { name: 'Atlantis T3', vendor: 'Waters', chemistry: 'Reversed phase — C18', description: 'Aqueous-compatible C18 for polar compounds' },
  { name: 'Symmetry C18', vendor: 'Waters', chemistry: 'Reversed phase — C18', description: 'Classic, highly reproducible C18' },
  { name: 'SunFire C18', vendor: 'Waters', chemistry: 'Reversed phase — C18', description: 'Low-pH robust C18, scalable to prep' },
  { name: 'CORTECS C18', vendor: 'Waters', chemistry: 'Reversed phase — C18', description: 'Solid-core C18, high efficiency at lower pressure' },
  { name: 'CORTECS T3', vendor: 'Waters', chemistry: 'Reversed phase — C18', description: 'Solid-core, polar-retentive' },
  { name: 'Zorbax Eclipse Plus C18', vendor: 'Agilent', chemistry: 'Reversed phase — C18', description: 'Low-activity C18, excellent peak shape for bases' },
  { name: 'Zorbax Extend-C18', vendor: 'Agilent', chemistry: 'Reversed phase — C18', description: 'High-pH stable C18 (to pH 11.5)' },
  { name: 'Zorbax SB-C18', vendor: 'Agilent', chemistry: 'Reversed phase — C18', description: 'Sterically protected, low-pH stable' },
  { name: 'Zorbax Bonus-RP', vendor: 'Agilent', chemistry: 'Reversed phase — C18', description: 'Embedded amide, shielded silanols for bases' },
  { name: 'Poroshell 120 EC-C18', vendor: 'Agilent', chemistry: 'Reversed phase — C18', description: 'Superficially porous C18, UHPLC-like efficiency on HPLC' },
  { name: 'Poroshell 120 SB-C18', vendor: 'Agilent', chemistry: 'Reversed phase — C18', description: 'Solid-core, low-pH stable' },
  { name: 'Poroshell HPH-C18', vendor: 'Agilent', chemistry: 'Reversed phase — C18', description: 'Solid-core, high-pH stable' },
  { name: 'Kinetex C18', vendor: 'Phenomenex', chemistry: 'Reversed phase — C18', description: 'Core-shell C18, very high efficiency' },
  { name: 'Kinetex XB-C18', vendor: 'Phenomenex', chemistry: 'Reversed phase — C18', description: 'Isobutyl side-chain C18, improved basic peak shape' },
  { name: 'Kinetex EVO C18', vendor: 'Phenomenex', chemistry: 'Reversed phase — C18', description: 'Organo-silica core-shell, pH 1–12' },
  { name: 'Kinetex Polar C18', vendor: 'Phenomenex', chemistry: 'Reversed phase — C18', description: 'Polar-modified core-shell, 100% aqueous compatible' },
  { name: 'Luna C18(2)', vendor: 'Phenomenex', chemistry: 'Reversed phase — C18', description: 'Classic fully porous C18' },
  { name: 'Luna Omega Polar C18', vendor: 'Phenomenex', chemistry: 'Reversed phase — C18', description: 'Polar-modified, retains very polar analytes' },
  { name: 'Gemini NX-C18', vendor: 'Phenomenex', chemistry: 'Reversed phase — C18', description: 'Organo-silica hybrid, pH 1–12' },
  { name: 'Synergi Hydro-RP', vendor: 'Phenomenex', chemistry: 'Reversed phase — C18', description: 'Polar-endcapped, aqueous-stable C18' },
  { name: 'Synergi Fusion-RP', vendor: 'Phenomenex', chemistry: 'Reversed phase — C18', description: 'Embedded polar group, mixed-mode selectivity' },
  { name: 'Hypersil GOLD', vendor: 'Thermo Scientific', chemistry: 'Reversed phase — C18', description: 'Ultra-pure silica C18, symmetric peaks' },
  { name: 'Accucore C18', vendor: 'Thermo Scientific', chemistry: 'Reversed phase — C18', description: 'Solid-core C18' },
  { name: 'Accucore aQ', vendor: 'Thermo Scientific', chemistry: 'Reversed phase — C18', description: 'Solid-core, aqueous-compatible' },
  { name: 'Hypersil BDS C18', vendor: 'Thermo Scientific', chemistry: 'Reversed phase — C18', description: 'Base-deactivated C18' },
  { name: 'Acclaim 120 C18', vendor: 'Thermo Scientific', chemistry: 'Reversed phase — C18', description: 'General-purpose C18 for HPLC and LC-MS' },
  { name: 'Ascentis Express C18', vendor: 'Supelco', chemistry: 'Reversed phase — C18', description: 'Fused-core C18' },
  { name: 'YMC-Triart C18', vendor: 'YMC', chemistry: 'Reversed phase — C18', description: 'Organic-inorganic hybrid, wide pH range' },
  { name: 'InertSustain C18', vendor: 'GL Sciences', chemistry: 'Reversed phase — C18', description: 'High inertness for basic compounds' },
  { name: 'InertSustain AQ-C18', vendor: 'GL Sciences', chemistry: 'Reversed phase — C18', description: '100% aqueous compatible C18' },
  { name: 'Chromolith Performance RP-18e', vendor: 'Merck', chemistry: 'Reversed phase — C18', description: 'Monolithic silica, very low backpressure' },
  { name: 'Purospher STAR RP-18e', vendor: 'Merck', chemistry: 'Reversed phase — C18', description: 'Endcapped C18 for acidic and basic analytes' },
  { name: 'Raptor ARC-18', vendor: 'Restek', chemistry: 'Reversed phase — C18', description: 'Core-shell C18, acid-resistant bonding' },
  { name: 'Force C18', vendor: 'Restek', chemistry: 'Reversed phase — C18', description: 'Fully porous C18 for HPLC and LC-MS' },

  // Other reversed phases
  { name: 'Kinetex Biphenyl', vendor: 'Phenomenex', chemistry: 'Reversed phase — phenyl / PFP / C8', description: 'Biphenyl selectivity for aromatics and positional isomers' },
  { name: 'Raptor Biphenyl', vendor: 'Restek', chemistry: 'Reversed phase — phenyl / PFP / C8', description: 'Core-shell biphenyl, widely used in LC-MS/MS screening' },
  { name: 'Poroshell 120 Phenyl-Hexyl', vendor: 'Agilent', chemistry: 'Reversed phase — phenyl / PFP / C8', description: 'Solid-core phenyl-hexyl, π-π selectivity' },
  { name: 'XSelect CSH Phenyl-Hexyl', vendor: 'Waters', chemistry: 'Reversed phase — phenyl / PFP / C8', description: 'Charged-surface phenyl-hexyl for basic analytes' },
  { name: 'Kinetex F5', vendor: 'Phenomenex', chemistry: 'Reversed phase — phenyl / PFP / C8', description: 'Pentafluorophenyl, alternative selectivity for polar/halogenated' },
  { name: 'Ascentis Express F5', vendor: 'Supelco', chemistry: 'Reversed phase — phenyl / PFP / C8', description: 'Fused-core PFP' },
  { name: 'Zorbax SB-Phenyl', vendor: 'Agilent', chemistry: 'Reversed phase — phenyl / PFP / C8', description: 'Sterically protected phenyl' },
  { name: 'Zorbax Eclipse XDB-C8', vendor: 'Agilent', chemistry: 'Reversed phase — phenyl / PFP / C8', description: 'Double-endcapped C8, shorter retention than C18' },
  { name: 'XBridge BEH C8', vendor: 'Waters', chemistry: 'Reversed phase — phenyl / PFP / C8', description: 'Hybrid C8, high-pH stable' },
  { name: 'Luna C8(2)', vendor: 'Phenomenex', chemistry: 'Reversed phase — phenyl / PFP / C8', description: 'Fully porous C8' },

  // HILIC
  { name: 'ACQUITY UPLC BEH Amide', vendor: 'Waters', chemistry: 'HILIC / normal phase', description: 'Amide HILIC; sugars, glycans, very polar analytes' },
  { name: 'ACQUITY UPLC BEH HILIC', vendor: 'Waters', chemistry: 'HILIC / normal phase', description: 'Unbonded hybrid silica HILIC' },
  { name: 'Atlantis HILIC Silica', vendor: 'Waters', chemistry: 'HILIC / normal phase', description: 'Silica HILIC for polar bases' },
  { name: 'SeQuant ZIC-HILIC', vendor: 'Merck', chemistry: 'HILIC / normal phase', description: 'Zwitterionic HILIC, robust polar retention' },
  { name: 'SeQuant ZIC-pHILIC', vendor: 'Merck', chemistry: 'HILIC / normal phase', description: 'Polymeric zwitterionic HILIC for metabolomics' },
  { name: 'Luna HILIC', vendor: 'Phenomenex', chemistry: 'HILIC / normal phase', description: 'Cross-linked diol HILIC' },
  { name: 'Kinetex HILIC', vendor: 'Phenomenex', chemistry: 'HILIC / normal phase', description: 'Core-shell bare silica HILIC' },
  { name: 'Syncronis HILIC', vendor: 'Thermo Scientific', chemistry: 'HILIC / normal phase', description: 'Zwitterionic HILIC' },
  { name: 'Poroshell 120 HILIC', vendor: 'Agilent', chemistry: 'HILIC / normal phase', description: 'Solid-core bare silica HILIC' },
  { name: 'Zorbax RX-SIL', vendor: 'Agilent', chemistry: 'HILIC / normal phase', description: 'Bare silica for normal phase' },
  { name: 'Zorbax NH2', vendor: 'Agilent', chemistry: 'HILIC / normal phase', description: 'Amino phase; carbohydrates, normal phase' },
  { name: 'Zorbax SB-CN', vendor: 'Agilent', chemistry: 'HILIC / normal phase', description: 'Cyano phase, intermediate polarity' },
  { name: 'InertSustain Amide', vendor: 'GL Sciences', chemistry: 'HILIC / normal phase', description: 'Amide HILIC for sugars and polar metabolites' },

  // Chiral
  { name: 'CHIRALPAK IA', vendor: 'Daicel', chemistry: 'Chiral', description: 'Immobilised amylose tris(3,5-dimethylphenylcarbamate)' },
  { name: 'CHIRALPAK IB', vendor: 'Daicel', chemistry: 'Chiral', description: 'Immobilised cellulose tris(3,5-dimethylphenylcarbamate)' },
  { name: 'CHIRALPAK IC', vendor: 'Daicel', chemistry: 'Chiral', description: 'Immobilised cellulose tris(3,5-dichlorophenylcarbamate)' },
  { name: 'CHIRALPAK IG', vendor: 'Daicel', chemistry: 'Chiral', description: 'Immobilised amylose, broad solvent compatibility' },
  { name: 'CHIRALPAK AD-H', vendor: 'Daicel', chemistry: 'Chiral', description: 'Coated amylose, normal phase' },
  { name: 'CHIRALCEL OD-H', vendor: 'Daicel', chemistry: 'Chiral', description: 'Coated cellulose, normal phase' },
  { name: 'Lux Cellulose-1', vendor: 'Phenomenex', chemistry: 'Chiral', description: 'Coated cellulose chiral selector' },
  { name: 'Lux Amylose-1', vendor: 'Phenomenex', chemistry: 'Chiral', description: 'Coated amylose chiral selector' },

  // SEC / IEX for bio work run on LC systems
  { name: 'ACQUITY BEH200 SEC', vendor: 'Waters', chemistry: 'Size exclusion / ion exchange', description: 'Protein SEC, 200 Å' },
  { name: 'ACQUITY BEH125 SEC', vendor: 'Waters', chemistry: 'Size exclusion / ion exchange', description: 'Peptide SEC, 125 Å' },
  { name: 'AdvanceBio SEC 300Å', vendor: 'Agilent', chemistry: 'Size exclusion / ion exchange', description: 'Aggregate analysis of monoclonal antibodies' },
  { name: 'Yarra SEC-3000', vendor: 'Phenomenex', chemistry: 'Size exclusion / ion exchange', description: 'Protein SEC' },
  { name: 'TSKgel G3000SWxl', vendor: 'Tosoh', chemistry: 'Size exclusion / ion exchange', description: 'Classic protein SEC column' },
  { name: 'ProPac SAX-10', vendor: 'Thermo Scientific', chemistry: 'Size exclusion / ion exchange', description: 'Strong anion exchange for proteins' },
  { name: 'ProPac WCX-10', vendor: 'Thermo Scientific', chemistry: 'Size exclusion / ion exchange', description: 'Weak cation exchange, charge variants' },
  { name: 'MAbPac SCX-10', vendor: 'Thermo Scientific', chemistry: 'Size exclusion / ion exchange', description: 'Strong cation exchange for mAb charge variants' },
];

const LC_DIMENSIONS: ColumnDimensionSpec[] = [
  {
    key: 'length', label: 'Length', unit: 'mm',
    options: ['20', '30', '50', '75', '100', '125', '150', '200', '250', '300'],
  },
  {
    key: 'id', label: 'Inner diameter', unit: 'mm',
    options: ['1.0', '2.1', '3.0', '4.6', '7.8', '10', '21.2', '30', '50'],
  },
  {
    key: 'particle', label: 'Particle size', unit: 'µm',
    options: ['1.6', '1.7', '1.8', '2.5', '2.6', '2.7', '3.0', '3.5', '4.0', '5.0', '10'],
  },
];

// ─── IC ──────────────────────────────────────────────────────────────

const IC_PHASES: ColumnPhase[] = [
  { name: 'Dionex IonPac AS11-HC', vendor: 'Thermo Scientific', chemistry: 'Anion exchange', description: 'High-capacity, complex inorganic and organic anions' },
  { name: 'Dionex IonPac AS14A', vendor: 'Thermo Scientific', chemistry: 'Anion exchange', description: 'Carbonate eluent, common anions' },
  { name: 'Dionex IonPac AS15', vendor: 'Thermo Scientific', chemistry: 'Anion exchange', description: 'Trace anions in high-purity water' },
  { name: 'Dionex IonPac AS18', vendor: 'Thermo Scientific', chemistry: 'Anion exchange', description: 'Hydroxide eluent, standard seven anions' },
  { name: 'Dionex IonPac AS19', vendor: 'Thermo Scientific', chemistry: 'Anion exchange', description: 'Oxyhalides, bromate in drinking water' },
  { name: 'Dionex IonPac AS20', vendor: 'Thermo Scientific', chemistry: 'Anion exchange', description: 'Perchlorate trace analysis' },
  { name: 'Dionex IonPac AS22', vendor: 'Thermo Scientific', chemistry: 'Anion exchange', description: 'Carbonate eluent, fast common anions' },
  { name: 'Dionex IonPac AS23', vendor: 'Thermo Scientific', chemistry: 'Anion exchange', description: 'Anions plus bromate, carbonate eluent' },
  { name: 'Dionex IonPac CS12A', vendor: 'Thermo Scientific', chemistry: 'Cation exchange', description: 'Group I/II cations and ammonium' },
  { name: 'Dionex IonPac CS16', vendor: 'Thermo Scientific', chemistry: 'Cation exchange', description: 'High-capacity, sodium/ammonium disparate ratios' },
  { name: 'Dionex IonPac CS17', vendor: 'Thermo Scientific', chemistry: 'Cation exchange', description: 'Hydrophobic amines and biogenic amines' },
  { name: 'Metrosep A Supp 5', vendor: 'Metrohm', chemistry: 'Anion exchange', description: 'Standard anions, carbonate eluent' },
  { name: 'Metrosep A Supp 7', vendor: 'Metrohm', chemistry: 'Anion exchange', description: 'High-resolution anion separation' },
  { name: 'Metrosep C 4', vendor: 'Metrohm', chemistry: 'Cation exchange', description: 'Standard cations' },
  { name: 'Metrosep C 6', vendor: 'Metrohm', chemistry: 'Cation exchange', description: 'Cations with improved resolution' },
  { name: 'Shodex IC SI-90 4E', vendor: 'Shodex', chemistry: 'Anion exchange', description: 'Common anions, carbonate eluent' },
];

const IC_DIMENSIONS: ColumnDimensionSpec[] = [
  { key: 'length', label: 'Length', unit: 'mm', options: ['50', '100', '150', '200', '250'] },
  { key: 'id', label: 'Inner diameter', unit: 'mm', options: ['0.4', '2.0', '3.0', '4.0', '4.6'] },
  { key: 'particle', label: 'Particle size', unit: 'µm', options: ['4.0', '5.0', '5.5', '6.5', '7.5', '9.0', '11', '13'] },
];

// ─── SFC ─────────────────────────────────────────────────────────────

const SFC_PHASES: ColumnPhase[] = [
  { name: 'ACQUITY UPC² BEH', vendor: 'Waters', chemistry: 'Achiral SFC', description: 'Unbonded hybrid silica, general-purpose SFC' },
  { name: 'ACQUITY UPC² BEH 2-EP', vendor: 'Waters', chemistry: 'Achiral SFC', description: '2-ethylpyridine; basic analytes in SFC' },
  { name: 'ACQUITY UPC² CSH Fluoro-Phenyl', vendor: 'Waters', chemistry: 'Achiral SFC', description: 'Charged-surface fluorophenyl selectivity' },
  { name: 'ACQUITY UPC² HSS C18 SB', vendor: 'Waters', chemistry: 'Achiral SFC', description: 'High-strength silica C18 for SFC' },
  { name: 'Torus DIOL', vendor: 'Waters', chemistry: 'Achiral SFC', description: 'Diol phase, polar analyte retention' },
  { name: 'Torus 1-AA', vendor: 'Waters', chemistry: 'Achiral SFC', description: '1-aminoanthracene, basic analytes' },
  { name: 'Torus 2-PIC', vendor: 'Waters', chemistry: 'Achiral SFC', description: '2-picolylamine, strong basic retention' },
  { name: 'Torus DEA', vendor: 'Waters', chemistry: 'Achiral SFC', description: 'Diethylamine phase' },
  { name: 'Viridis BEH', vendor: 'Waters', chemistry: 'Achiral SFC', description: 'Preparative SFC hybrid silica' },
  { name: 'Princeton PPU', vendor: 'Princeton Chromatography', chemistry: 'Achiral SFC', description: 'Polar bonded SFC phase' },
  { name: 'CHIRALPAK IG-3', vendor: 'Daicel', chemistry: 'Chiral SFC', description: 'Immobilised amylose, 3 µm for SFC' },
  { name: 'CHIRALPAK AD-3', vendor: 'Daicel', chemistry: 'Chiral SFC', description: 'Coated amylose, 3 µm for SFC screening' },
  { name: 'CHIRALCEL OJ-3', vendor: 'Daicel', chemistry: 'Chiral SFC', description: 'Coated cellulose, 3 µm for SFC screening' },
  { name: 'Lux Cellulose-2', vendor: 'Phenomenex', chemistry: 'Chiral SFC', description: 'Coated cellulose chiral phase for SFC' },
];

// ─── SEC / FPLC ──────────────────────────────────────────────────────

const SEC_PHASES: ColumnPhase[] = [
  { name: 'Superdex 200 Increase 10/300 GL', vendor: 'Cytiva', chemistry: 'Preparative / analytical SEC', description: 'Protein separation 10–600 kDa' },
  { name: 'Superdex 75 Increase 10/300 GL', vendor: 'Cytiva', chemistry: 'Preparative / analytical SEC', description: 'Protein separation 3–70 kDa' },
  { name: 'Superose 6 Increase 10/300 GL', vendor: 'Cytiva', chemistry: 'Preparative / analytical SEC', description: 'Broad range 5–5000 kDa, complexes and aggregates' },
  { name: 'HiLoad 16/600 Superdex 200 pg', vendor: 'Cytiva', chemistry: 'Preparative / analytical SEC', description: 'Preparative protein SEC' },
  { name: 'TSKgel G3000SWxl', vendor: 'Tosoh', chemistry: 'Analytical SEC (silica)', description: 'Protein SEC, aggregate quantitation' },
  { name: 'TSKgel G4000SWxl', vendor: 'Tosoh', chemistry: 'Analytical SEC (silica)', description: 'Larger proteins and complexes' },
  { name: 'TSKgel UP-SW3000', vendor: 'Tosoh', chemistry: 'Analytical SEC (silica)', description: '2 µm UHPLC SEC for mAb aggregates' },
  { name: 'ACQUITY BEH200 SEC', vendor: 'Waters', chemistry: 'Analytical SEC (silica)', description: 'Hybrid SEC, 200 Å protein analysis' },
  { name: 'AdvanceBio SEC 300Å', vendor: 'Agilent', chemistry: 'Analytical SEC (silica)', description: 'mAb aggregate analysis' },
  { name: 'Yarra SEC-3000', vendor: 'Phenomenex', chemistry: 'Analytical SEC (silica)', description: 'Protein SEC' },
  { name: 'Shodex KW-803', vendor: 'Shodex', chemistry: 'Analytical SEC (silica)', description: 'Aqueous SEC for proteins and polymers' },
  { name: 'Mono Q 5/50 GL', vendor: 'Cytiva', chemistry: 'Ion exchange (FPLC)', description: 'Strong anion exchange, high resolution' },
  { name: 'Mono S 5/50 GL', vendor: 'Cytiva', chemistry: 'Ion exchange (FPLC)', description: 'Strong cation exchange, high resolution' },
  { name: 'HiTrap Q HP', vendor: 'Cytiva', chemistry: 'Ion exchange (FPLC)', description: 'Prepacked strong anion exchange' },
  { name: 'HiTrap SP HP', vendor: 'Cytiva', chemistry: 'Ion exchange (FPLC)', description: 'Prepacked strong cation exchange' },
];

const SEC_DIMENSIONS: ColumnDimensionSpec[] = [
  { key: 'length', label: 'Length', unit: 'mm', options: ['50', '100', '150', '200', '250', '300', '600'] },
  { key: 'id', label: 'Inner diameter', unit: 'mm', options: ['4.6', '5.0', '6.0', '7.8', '10', '16', '21.2'] },
  { key: 'particle', label: 'Particle size', unit: 'µm', options: ['1.7', '2.0', '3.0', '4.0', '5.0', '8.6', '13', '34'] },
];

// ─── Family registry ─────────────────────────────────────────────────

export const COLUMN_FAMILIES: Record<ColumnFamily, ColumnFamilySpec> = {
  gc: {
    family: 'gc', label: 'GC capillary column',
    phasePlaceholder: 'e.g. DB-5ms',
    phases: GC_PHASES, dimensions: GC_DIMENSIONS,
  },
  lc: {
    family: 'lc', label: 'LC column',
    phasePlaceholder: 'e.g. Zorbax Eclipse Plus C18',
    phases: LC_PHASES, dimensions: LC_DIMENSIONS,
  },
  ic: {
    family: 'ic', label: 'IC column',
    phasePlaceholder: 'e.g. Dionex IonPac AS18',
    phases: IC_PHASES, dimensions: IC_DIMENSIONS,
  },
  sfc: {
    family: 'sfc', label: 'SFC column',
    phasePlaceholder: 'e.g. Torus 2-PIC',
    phases: SFC_PHASES, dimensions: LC_DIMENSIONS,
  },
  sec: {
    family: 'sec', label: 'SEC / FPLC column',
    phasePlaceholder: 'e.g. Superdex 200 Increase',
    phases: SEC_PHASES, dimensions: SEC_DIMENSIONS,
  },
};

const FAMILY_BY_TECHNIQUE: Record<string, ColumnFamily> = {
  GC: 'gc', GCMS: 'gc',
  HPLC: 'lc', UHPLC: 'lc', LCMS: 'lc', PrepLC: 'lc',
  IC: 'ic',
  SFC: 'sfc',
  SECMALS: 'sec', FPLC: 'sec',
};

/** The column family a technique uses, or null when it has no column. */
export function getColumnFamily(technique: string): ColumnFamily | null {
  return FAMILY_BY_TECHNIQUE[technique] ?? null;
}

export function getColumnFamilySpec(technique: string): ColumnFamilySpec | null {
  const family = getColumnFamily(technique);
  return family ? COLUMN_FAMILIES[family] : null;
}

/** Catalogue entries grouped by chemistry, in catalogue order. */
export function groupPhasesByChemistry(phases: ColumnPhase[]): Array<{ chemistry: string; phases: ColumnPhase[] }> {
  const groups: Array<{ chemistry: string; phases: ColumnPhase[] }> = [];
  for (const phase of phases) {
    const last = groups.find(g => g.chemistry === phase.chemistry);
    if (last) last.phases.push(phase);
    else groups.push({ chemistry: phase.chemistry, phases: [phase] });
  }
  return groups;
}

// ─── Composition and parsing ─────────────────────────────────────────

export interface ColumnParts {
  phase: string;
  length: string;
  id: string;
  film: string;
  particle: string;
}

export const EMPTY_COLUMN_PARTS: ColumnParts = { phase: '', length: '', id: '', film: '', particle: '' };

/**
 * Build the canonical column string stored in `column`.
 * GC:  "DB-5ms 30 m × 0.25 mm × 0.25 µm"
 * LC:  "Zorbax Eclipse Plus C18 150 × 4.6 mm, 3.5 µm"
 */
export function composeColumnString(family: ColumnFamily, parts: ColumnParts): string {
  const phase = parts.phase.trim();
  if (family === 'gc') {
    const dims = [
      parts.length && `${parts.length} m`,
      parts.id && `${parts.id} mm`,
      parts.film && `${parts.film} µm`,
    ].filter(Boolean).join(' × ');
    return [phase, dims].filter(Boolean).join(' ').trim();
  }

  const size = parts.length && parts.id
    ? `${parts.length} × ${parts.id} mm`
    : parts.length ? `${parts.length} mm`
    : parts.id ? `${parts.id} mm i.d.`
    : '';
  const particle = parts.particle ? `${parts.particle} µm` : '';
  const dims = [size, particle].filter(Boolean).join(', ');
  return [phase, dims].filter(Boolean).join(' ').trim();
}

/**
 * Best-effort recovery of the parts from a previously composed (or hand-typed)
 * column string, so reopening the form does not lose the selection.
 */
export function parseColumnString(family: ColumnFamily, value: string): ColumnParts {
  const text = value.trim();
  if (!text) return { ...EMPTY_COLUMN_PARTS };

  const parts: ColumnParts = { ...EMPTY_COLUMN_PARTS };
  let remainder = text;

  const take = (pattern: RegExp, assign: (m: RegExpExecArray) => void) => {
    const m = pattern.exec(remainder);
    if (m) {
      assign(m);
      remainder = remainder.replace(m[0], ' ');
    }
  };

  if (family === 'gc') {
    take(/(\d+(?:\.\d+)?)\s*m\b(?!m)/i, m => { parts.length = m[1]; });
    take(/(\d+(?:\.\d+)?)\s*mm\b/i, m => { parts.id = m[1]; });
    take(/(\d+(?:\.\d+)?)\s*(?:µ|u)m\b/i, m => { parts.film = m[1]; });
  } else {
    take(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*mm\b/i, m => { parts.length = m[1]; parts.id = m[2]; });
    if (!parts.length) take(/(\d+(?:\.\d+)?)\s*mm\b/i, m => { parts.length = m[1]; });
    take(/(\d+(?:\.\d+)?)\s*(?:µ|u)m\b/i, m => { parts.particle = m[1]; });
  }

  parts.phase = remainder.replace(/[×x,]/g, ' ').replace(/\s+/g, ' ').trim();
  return parts;
}

/** The extra_context keys the selector publishes alongside the composed string. */
export function columnContextKeys(family: ColumnFamily): Record<string, keyof ColumnParts> {
  return family === 'gc'
    ? { column_phase: 'phase', column_length: 'length', column_id: 'id', column_film: 'film' }
    : { column_phase: 'phase', column_length: 'length', column_id: 'id', column_particle: 'particle' };
}
