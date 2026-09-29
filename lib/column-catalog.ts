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

  { name: 'Rxi-1HT', vendor: 'Restek', chemistry: 'Non-polar (100% dimethylpolysiloxane)', description: 'High-temperature non-polar to 400 °C; waxes, triglycerides' },
  { name: 'MXT-1', vendor: 'Restek', chemistry: 'Non-polar (100% dimethylpolysiloxane)', description: 'Siltek-treated metal column, non-polar; rugged field and process GC' },
  { name: 'ZB-1XT SimDist', vendor: 'Phenomenex', chemistry: 'Non-polar (100% dimethylpolysiloxane)', description: 'Simulated distillation of petroleum fractions' },
  { name: 'BPX1', vendor: 'Trajan (SGE)', chemistry: 'Non-polar (100% dimethylpolysiloxane)', description: 'Polysilphenylene-siloxane non-polar, high thermal stability' },
  { name: 'BP1 PONA', vendor: 'Trajan (SGE)', chemistry: 'Non-polar (100% dimethylpolysiloxane)', description: 'Thick-film non-polar for detailed hydrocarbon analysis' },
  { name: 'SolGel-1ms', vendor: 'Trajan (SGE)', chemistry: 'Non-polar (100% dimethylpolysiloxane)', description: 'Sol-gel non-polar, very low bleed for MS' },

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

  { name: 'DB-5ht', vendor: 'Agilent J&W', chemistry: '5% phenyl (general purpose / MS)', description: 'High-temperature 5% phenyl to 400 °C; waxes, triglycerides' },
  { name: 'Rxi-5HT', vendor: 'Restek', chemistry: '5% phenyl (general purpose / MS)', description: 'High-temperature low-bleed 5% phenyl' },
  { name: 'ZB-5plus', vendor: 'Phenomenex', chemistry: '5% phenyl (general purpose / MS)', description: 'Inert 5% phenyl with extended temperature limit' },
  { name: 'BPX5', vendor: 'Trajan (SGE)', chemistry: '5% phenyl (general purpose / MS)', description: '5% phenyl polysilphenylene-siloxane; routine general purpose' },
  { name: 'HT5', vendor: 'Trajan (SGE)', chemistry: '5% phenyl (general purpose / MS)', description: 'Carborane-siloxane phase to 450 °C; high-boiling analytes' },

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
  { name: 'Rxi-XLB', vendor: 'Restek', chemistry: 'Mid-polar (17–50% phenyl)', description: 'Low-bleed proprietary phase, alternative selectivity to 5% phenyl' },
  { name: 'ZB-XLB', vendor: 'Phenomenex', chemistry: 'Mid-polar (17–50% phenyl)', description: 'Extra-low-bleed mid-polarity phase for GC-MS' },
  { name: 'ZB-XLB-HT', vendor: 'Phenomenex', chemistry: 'Mid-polar (17–50% phenyl)', description: 'High-temperature extra-low-bleed phase' },
  { name: 'Rxi-35Sil MS', vendor: 'Restek', chemistry: 'Mid-polar (17–50% phenyl)', description: 'Low-bleed 35% phenyl for MS; pesticides, drugs' },
  { name: 'ZB-35', vendor: 'Phenomenex', chemistry: 'Mid-polar (17–50% phenyl)', description: '35% phenyl general mid-polarity phase' },
  { name: 'BPX35', vendor: 'Trajan (SGE)', chemistry: 'Mid-polar (17–50% phenyl)', description: '35% phenyl polysilphenylene-siloxane' },
  { name: 'BPX50', vendor: 'Trajan (SGE)', chemistry: 'Mid-polar (17–50% phenyl)', description: '50% phenyl polysilphenylene-siloxane; drugs, pesticides' },
  { name: 'DB-1701', vendor: 'Agilent J&W', chemistry: 'Cyanopropylphenyl (1701)', description: '14% cyanopropylphenyl; pesticides, herbicides' },
  { name: 'Rtx-1701', vendor: 'Restek', chemistry: 'Cyanopropylphenyl (1701)', description: '14% cyanopropylphenyl selectivity' },
  { name: 'ZB-1701', vendor: 'Phenomenex', chemistry: 'Cyanopropylphenyl (1701)', description: '14% cyanopropylphenyl selectivity' },
  { name: 'CP-Sil 19 CB', vendor: 'Agilent (Varian)', chemistry: 'Cyanopropylphenyl (1701)', description: 'Cyanopropylphenyl, bonded' },
  { name: 'Rtx-1301', vendor: 'Restek', chemistry: 'Cyanopropylphenyl (1701)', description: '6% cyanopropylphenyl, USP G43 equivalent' },
  { name: 'Rxi-1301Sil MS', vendor: 'Restek', chemistry: 'Cyanopropylphenyl (1701)', description: 'Low-bleed cyanopropylphenyl for MS' },
  { name: 'ZB-1701P', vendor: 'Phenomenex', chemistry: 'Cyanopropylphenyl (1701)', description: 'Base-deactivated 14% cyanopropylphenyl for basic analytes' },

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
  { name: 'DB-Select 624 UI', vendor: 'Agilent J&W', chemistry: 'Volatiles (624 / VOC)', description: 'Ultra-inert 624 for residual solvents by USP <467>' },
  { name: 'CP-Select 624 CB', vendor: 'Agilent (Varian)', chemistry: 'Volatiles (624 / VOC)', description: 'Bonded 624 phase for residual solvent screening' },
  { name: 'ZB-624plus', vendor: 'Phenomenex', chemistry: 'Volatiles (624 / VOC)', description: 'Extended-temperature 624 for volatiles' },
  { name: 'Rtx-502.2', vendor: 'Restek', chemistry: 'Volatiles (624 / VOC)', description: 'EPA 502.2/524 volatiles, thick film' },
  { name: 'Rtx-VRX', vendor: 'Restek', chemistry: 'Volatiles (624 / VOC)', description: 'Volatile organics by purge and trap' },
  { name: 'BPX-VOLATILES', vendor: 'Trajan (SGE)', chemistry: 'Volatiles (624 / VOC)', description: 'Dedicated volatiles phase for purge and trap' },

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
  { name: 'ZB-WAX', vendor: 'Phenomenex', chemistry: 'Polar (PEG / WAX)', description: 'Polyethylene glycol; alcohols, ketones, aldehydes' },
  { name: 'Stabilwax-DB', vendor: 'Restek', chemistry: 'Polar (PEG / WAX)', description: 'Base-deactivated PEG for amines' },
  { name: 'Stabilwax-MS', vendor: 'Restek', chemistry: 'Polar (PEG / WAX)', description: 'Low-bleed PEG for GC-MS' },
  { name: 'BP20 (WAX)', vendor: 'Trajan (SGE)', chemistry: 'Polar (PEG / WAX)', description: 'Polar PEG phase for alcohols and solvents' },
  { name: 'SolGel-WAX', vendor: 'Trajan (SGE)', chemistry: 'Polar (PEG / WAX)', description: 'Sol-gel PEG, extended lifetime at high temperature' },
  { name: 'DB-FFAP', vendor: 'Agilent J&W', chemistry: 'Acid-modified PEG (FFAP)', description: 'Nitroterephthalic-acid-modified PEG; free fatty acids, phenols' },
  { name: 'HP-FFAP', vendor: 'Agilent J&W', chemistry: 'Acid-modified PEG (FFAP)', description: 'Acidic analytes, free fatty acids' },
  { name: 'Stabilwax-DA', vendor: 'Restek', chemistry: 'Acid-modified PEG (FFAP)', description: 'Acid-deactivated PEG for acids and amines' },
  { name: 'Nukol', vendor: 'Supelco', chemistry: 'Acid-modified PEG (FFAP)', description: 'Acid-modified PEG for volatile free fatty acids' },
  { name: 'ZB-FFAP', vendor: 'Phenomenex', chemistry: 'Acid-modified PEG (FFAP)', description: 'Acid-modified PEG for free fatty acids and phenols' },
  { name: 'BP21 (FFAP)', vendor: 'Trajan (SGE)', chemistry: 'Acid-modified PEG (FFAP)', description: 'FFAP phase for free fatty acids' },
  { name: 'TG-WaxMS A', vendor: 'Thermo Scientific', chemistry: 'Acid-modified PEG (FFAP)', description: 'Acid-modified PEG for organic acids by MS' },

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
  { name: 'Rtx-200', vendor: 'Restek', chemistry: 'Highly polar (cyanopropyl / FAME)', description: 'Trifluoropropyl-methyl; unique selectivity for electron-rich analytes' },
  { name: 'Rtx-200MS', vendor: 'Restek', chemistry: 'Highly polar (cyanopropyl / FAME)', description: 'Low-bleed trifluoropropyl phase for MS' },
  { name: 'Rtx-2330', vendor: 'Restek', chemistry: 'Highly polar (cyanopropyl / FAME)', description: 'Biscyanopropyl/cyanopropylphenyl; cis/trans FAME isomers' },
  { name: 'ZB-FAME', vendor: 'Phenomenex', chemistry: 'Highly polar (cyanopropyl / FAME)', description: 'Dedicated fatty acid methyl ester phase' },
  { name: 'BPX70', vendor: 'Trajan (SGE)', chemistry: 'Highly polar (cyanopropyl / FAME)', description: '70% cyanopropyl polysilphenylene-siloxane for FAMEs' },
  { name: 'BPX90', vendor: 'Trajan (SGE)', chemistry: 'Highly polar (cyanopropyl / FAME)', description: '90% cyanopropyl; highest FAME cis/trans resolution' },

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

  { name: 'Rt-S-BOND', vendor: 'Restek', chemistry: 'PLOT (permanent gases / light hydrocarbons)', description: 'Silica PLOT for light hydrocarbons and sulfur gases' },
  { name: 'Rt-QS-BOND', vendor: 'Restek', chemistry: 'PLOT (permanent gases / light hydrocarbons)', description: 'Porous polymer PLOT, Q/S hybrid selectivity' },
  { name: 'Rt-XLSulfur', vendor: 'Restek', chemistry: 'PLOT (permanent gases / light hydrocarbons)', description: 'Sulfur gas analysis with minimal reactivity' },
  { name: 'MXT-Alumina BOND/MAPD', vendor: 'Restek', chemistry: 'PLOT (permanent gases / light hydrocarbons)', description: 'Metal alumina PLOT for MAPD in olefin streams' },
  { name: 'CP-Molsieve 5A', vendor: 'Agilent (Varian)', chemistry: 'PLOT (permanent gases / light hydrocarbons)', description: 'Molecular sieve PLOT for permanent gases' },

  // Application-specific
  { name: 'Rtx-CLPesticides', vendor: 'Restek', chemistry: 'Application-specific', description: 'Organochlorine pesticides, ECD methods' },
  { name: 'Rtx-CLPesticides2', vendor: 'Restek', chemistry: 'Application-specific', description: 'Confirmation column for pesticide methods' },
  { name: 'DB-EUPAH', vendor: 'Agilent J&W', chemistry: 'Application-specific', description: 'EU-regulated polycyclic aromatic hydrocarbons' },
  { name: 'Rxi-PAH', vendor: 'Restek', chemistry: 'Application-specific', description: 'PAH isomer separation' },
  { name: 'DB-ALC1', vendor: 'Agilent J&W', chemistry: 'Application-specific', description: 'Blood alcohol, primary column' },
  { name: 'DB-ALC2', vendor: 'Agilent J&W', chemistry: 'Application-specific', description: 'Blood alcohol, confirmation column' },
  { name: 'Rtx-BAC Plus 1', vendor: 'Restek', chemistry: 'Application-specific', description: 'Blood alcohol analysis, primary' },
  { name: 'Rtx-BAC Plus 2', vendor: 'Restek', chemistry: 'Application-specific', description: 'Blood alcohol analysis, confirmation' },
  { name: 'Rtx-OPPesticides', vendor: 'Restek', chemistry: 'Application-specific', description: 'Organophosphorus pesticides, primary column' },
  { name: 'Rtx-OPPesticides2', vendor: 'Restek', chemistry: 'Application-specific', description: 'Organophosphorus pesticides, confirmation column' },
  { name: 'Rxi-SVOCms', vendor: 'Restek', chemistry: 'Application-specific', description: 'Semivolatiles by EPA 8270, optimised for MS' },
  { name: 'ZB-SemiVolatiles', vendor: 'Phenomenex', chemistry: 'Application-specific', description: 'Semivolatile organics, EPA 8270 profile' },
  { name: 'ZB-MultiResidue-1', vendor: 'Phenomenex', chemistry: 'Application-specific', description: 'Multiresidue pesticide screening, primary' },
  { name: 'ZB-MultiResidue-2', vendor: 'Phenomenex', chemistry: 'Application-specific', description: 'Multiresidue pesticide screening, confirmation' },
  { name: 'Rxi-dioxin2', vendor: 'Restek', chemistry: 'Application-specific', description: 'Dioxin and furan congener separation' },
  { name: 'BPX-DXN', vendor: 'Trajan (SGE)', chemistry: 'Application-specific', description: 'Dioxin congener phase for 2,3,7,8-TCDD' },
  { name: 'Rtx-PCB', vendor: 'Restek', chemistry: 'Application-specific', description: 'PCB congener analysis' },
  { name: 'HT8-PCB', vendor: 'Trajan (SGE)', chemistry: 'Application-specific', description: 'PCB congeners at high temperature' },
  { name: 'Rxi-65TG', vendor: 'Restek', chemistry: 'Application-specific', description: 'Triglycerides in edible oils' },
  { name: 'Rtx-Biodiesel TG', vendor: 'Restek', chemistry: 'Application-specific', description: 'Free and total glycerin in biodiesel, EN 14105' },
  { name: 'BPX-BIOD', vendor: 'Trajan (SGE)', chemistry: 'Application-specific', description: 'Biodiesel methyl ester and glycerol analysis' },
  { name: 'Rtx-2887', vendor: 'Restek', chemistry: 'Application-specific', description: 'Boiling point distribution by ASTM D2887' },
  { name: 'Rtx-DHA-100', vendor: 'Restek', chemistry: 'Application-specific', description: 'Detailed hydrocarbon analysis of gasoline' },
  { name: 'Rtx-1614', vendor: 'Restek', chemistry: 'Application-specific', description: 'Brominated diphenyl ethers by EPA 1614' },
  { name: 'Rtx-440', vendor: 'Restek', chemistry: 'Application-specific', description: 'Proprietary phase for PAHs and semivolatiles' },
  { name: 'Rtx-G43', vendor: 'Restek', chemistry: 'Application-specific', description: 'USP G43 phase for residual solvents' },
  { name: 'Rtx-G27', vendor: 'Restek', chemistry: 'Application-specific', description: 'USP G27 phase, 5% phenyl methyl equivalent' },
  { name: 'ZB-Drug-1', vendor: 'Phenomenex', chemistry: 'Application-specific', description: 'Drugs of abuse screening by GC-MS' },
  { name: 'ZB-BAC-1', vendor: 'Phenomenex', chemistry: 'Application-specific', description: 'Blood alcohol, primary column' },
  { name: 'ZB-BAC-2', vendor: 'Phenomenex', chemistry: 'Application-specific', description: 'Blood alcohol, confirmation column' },
  { name: 'ZB-Bioethanol', vendor: 'Phenomenex', chemistry: 'Application-specific', description: 'Fuel ethanol and fermentation volatiles' },
  { name: 'Cyclosil-B', vendor: 'Agilent J&W', chemistry: 'Chiral', description: 'Cyclodextrin chiral phase for enantiomers' },
  { name: 'CP-Chirasil-Dex CB', vendor: 'Agilent (Varian)', chemistry: 'Chiral', description: 'Bonded cyclodextrin chiral phase' },
  { name: 'Rt-βDEXsm', vendor: 'Restek', chemistry: 'Chiral', description: 'Permethylated β-cyclodextrin chiral phase' },
  { name: 'Astec CHIRALDEX G-TA', vendor: 'Supelco', chemistry: 'Chiral', description: 'Trifluoroacetyl γ-cyclodextrin chiral phase' },
  { name: 'Rt-βDEXsa', vendor: 'Restek', chemistry: 'Chiral', description: 'Permethylated β-cyclodextrin, tert-butyl; broad chiral screening' },
  { name: 'Rt-βDEXse', vendor: 'Restek', chemistry: 'Chiral', description: 'β-cyclodextrin with alternative chiral selectivity' },
  { name: 'Rt-βDEXcst', vendor: 'Restek', chemistry: 'Chiral', description: 'Cyclodextrin phase for chiral terpenes and flavours' },
  { name: 'Rt-γDEXsa', vendor: 'Restek', chemistry: 'Chiral', description: 'γ-cyclodextrin for larger chiral analytes' },
  { name: 'CYDEX-B', vendor: 'Trajan (SGE)', chemistry: 'Chiral', description: 'β-cyclodextrin chiral phase' },
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
    options: ['0.10', '0.15', '0.18', '0.20', '0.25', '0.33', '0.40', '0.50', '1.00', '1.20', '1.40', '1.50', '1.80', '2.00', '3.00', '5.00', '10.00', '15.00', '20.00', '30.00'],
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

  { name: 'ACQUITY UPLC BEH Shield RP18', vendor: 'Waters', chemistry: 'Reversed phase — C18', description: 'Embedded carbamate, alternative selectivity to BEH C18' },
  { name: 'ACQUITY Premier HSS T3', vendor: 'Waters', chemistry: 'Reversed phase — C18', description: 'MaxPeak surface with polar-retentive T3 bonding' },
  { name: 'XSelect CSH C18', vendor: 'Waters', chemistry: 'Reversed phase — C18', description: 'Charged-surface HPLC C18 for basic analytes' },
  { name: 'XSelect Premier CSH C18', vendor: 'Waters', chemistry: 'Reversed phase — C18', description: 'Charged surface plus MaxPeak hardware for metal-sensitive work' },
  { name: 'Atlantis Premier BEH C18 AX', vendor: 'Waters', chemistry: 'Reversed phase — C18', description: 'Mixed-mode C18/anion exchange for polar acids' },
  { name: 'CORTECS UPLC C18+', vendor: 'Waters', chemistry: 'Reversed phase — C18', description: 'Solid-core, positively charged surface for bases' },
  { name: 'Nova-Pak C18', vendor: 'Waters', chemistry: 'Reversed phase — C18', description: 'Legacy 4 µm C18 still specified in many validated methods' },
  { name: 'Spherisorb ODS2', vendor: 'Waters', chemistry: 'Reversed phase — C18', description: 'Classic bonded silica C18 for legacy HPLC methods' },
  { name: 'ZORBAX RRHD Eclipse Plus C18', vendor: 'Agilent', chemistry: 'Reversed phase — C18', description: '1.8 µm rapid-resolution high-definition C18 to 1200 bar' },
  { name: 'Poroshell 120 Bonus-RP', vendor: 'Agilent', chemistry: 'Reversed phase — C18', description: 'Solid-core embedded amide, shielded silanols' },
  { name: 'Pursuit XRs C18', vendor: 'Agilent', chemistry: 'Reversed phase — C18', description: 'Fully porous high-coverage C18 for HPLC' },
  { name: 'Polaris C18-A', vendor: 'Agilent', chemistry: 'Reversed phase — C18', description: 'Polar-modified C18 with aqueous stability' },
  { name: 'Accucore Vanquish C18', vendor: 'Thermo Scientific', chemistry: 'Reversed phase — C18', description: '1.5 µm solid-core C18 for Vanquish UHPLC' },
  { name: 'Hypersil GOLD aQ', vendor: 'Thermo Scientific', chemistry: 'Reversed phase — C18', description: 'Polar-endcapped C18, stable in 100% aqueous' },
  { name: 'Acclaim RSLC 120 C18', vendor: 'Thermo Scientific', chemistry: 'Reversed phase — C18', description: '2.2 µm C18 for rapid separation LC' },
  { name: 'Shim-pack Scepter C18-120', vendor: 'Shimadzu', chemistry: 'Reversed phase — C18', description: 'Hybrid organic-silica C18, scalable 1.9/3/5 µm' },
  { name: 'Shim-pack Velox C18', vendor: 'Shimadzu', chemistry: 'Reversed phase — C18', description: 'Core-shell C18 for fast HPLC and UHPLC' },
  { name: 'Shim-pack GIST C18', vendor: 'Shimadzu', chemistry: 'Reversed phase — C18', description: 'Fully porous general-purpose C18' },
  { name: 'Shim-pack NovaCore C18-HB', vendor: 'Shimadzu', chemistry: 'Reversed phase — C18', description: 'Core-shell C18, high-buffer tolerance' },
  { name: 'Luna Omega C18', vendor: 'Phenomenex', chemistry: 'Reversed phase — C18', description: 'Fully porous 1.6 µm C18 with high inertness' },
  { name: 'Luna Omega PS C18', vendor: 'Phenomenex', chemistry: 'Reversed phase — C18', description: 'Positively charged surface C18 for basic analytes' },
  { name: 'InertSustainSwift C18', vendor: 'GL Sciences', chemistry: 'Reversed phase — C18', description: 'Low-backpressure C18 for fast analysis' },
  { name: 'Chromolith HighResolution RP-18e', vendor: 'Merck', chemistry: 'Reversed phase — C18', description: 'Second-generation monolith, higher plate count' },

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

  { name: 'XSelect HSS PFP', vendor: 'Waters', chemistry: 'Reversed phase — phenyl / PFP / C8', description: 'Pentafluorophenyl on high-strength silica' },
  { name: 'CORTECS Shield RP18', vendor: 'Waters', chemistry: 'Reversed phase — phenyl / PFP / C8', description: 'Solid-core embedded carbamate, aqueous compatible' },
  { name: 'Kinetex Phenyl-Hexyl', vendor: 'Phenomenex', chemistry: 'Reversed phase — phenyl / PFP / C8', description: 'Core-shell phenyl-hexyl, π-π selectivity' },
  { name: 'Luna Phenyl-Hexyl', vendor: 'Phenomenex', chemistry: 'Reversed phase — phenyl / PFP / C8', description: 'Fully porous phenyl-hexyl for aromatics' },
  { name: 'ZORBAX Eclipse Plus Phenyl-Hexyl', vendor: 'Agilent', chemistry: 'Reversed phase — phenyl / PFP / C8', description: 'Low-activity phenyl-hexyl for bases and aromatics' },
  { name: 'Poroshell 120 EC-C8', vendor: 'Agilent', chemistry: 'Reversed phase — phenyl / PFP / C8', description: 'Solid-core C8, shorter retention than C18' },
  { name: 'Accucore Phenyl-Hexyl', vendor: 'Thermo Scientific', chemistry: 'Reversed phase — phenyl / PFP / C8', description: 'Solid-core phenyl-hexyl' },
  { name: 'Hypersil GOLD PFP', vendor: 'Thermo Scientific', chemistry: 'Reversed phase — phenyl / PFP / C8', description: 'Pentafluorophenyl for halogenated and polar analytes' },
  { name: 'Raptor FluoroPhenyl', vendor: 'Restek', chemistry: 'Reversed phase — phenyl / PFP / C8', description: 'Core-shell PFP, widely used in LC-MS/MS panels' },
  { name: 'Hypercarb', vendor: 'Thermo Scientific', chemistry: 'Reversed phase — phenyl / PFP / C8', description: 'Porous graphitic carbon; very polar and structurally similar analytes' },

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

  { name: 'ACQUITY Premier BEH Amide', vendor: 'Waters', chemistry: 'HILIC / normal phase', description: 'Amide HILIC on MaxPeak surface; glycans, polar metabolites' },
  { name: 'InfinityLab Poroshell 120 HILIC-Z', vendor: 'Agilent', chemistry: 'HILIC / normal phase', description: 'Zwitterionic HILIC, bio-inert hardware' },
  { name: 'SeQuant ZIC-cHILIC', vendor: 'Merck', chemistry: 'HILIC / normal phase', description: 'Phosphorylcholine zwitterionic HILIC, reversed charge order' },
  { name: 'Luna Omega SUGAR', vendor: 'Phenomenex', chemistry: 'HILIC / normal phase', description: 'Dedicated carbohydrate phase, no amine additive needed' },
  { name: 'Accucore 150 Amide HILIC', vendor: 'Thermo Scientific', chemistry: 'HILIC / normal phase', description: 'Solid-core amide HILIC, 150 Å' },
  { name: 'Ascentis Express HILIC', vendor: 'Supelco', chemistry: 'HILIC / normal phase', description: 'Fused-core bare silica HILIC' },
  { name: 'Intrada Amino Acid', vendor: 'Imtakt', chemistry: 'HILIC / normal phase', description: 'Amino acid analysis without derivatisation' },

  // Chiral
  { name: 'CHIRALPAK IA', vendor: 'Daicel', chemistry: 'Chiral', description: 'Immobilised amylose tris(3,5-dimethylphenylcarbamate)' },
  { name: 'CHIRALPAK IB', vendor: 'Daicel', chemistry: 'Chiral', description: 'Immobilised cellulose tris(3,5-dimethylphenylcarbamate)' },
  { name: 'CHIRALPAK IC', vendor: 'Daicel', chemistry: 'Chiral', description: 'Immobilised cellulose tris(3,5-dichlorophenylcarbamate)' },
  { name: 'CHIRALPAK IG', vendor: 'Daicel', chemistry: 'Chiral', description: 'Immobilised amylose, broad solvent compatibility' },
  { name: 'CHIRALPAK AD-H', vendor: 'Daicel', chemistry: 'Chiral', description: 'Coated amylose, normal phase' },
  { name: 'CHIRALCEL OD-H', vendor: 'Daicel', chemistry: 'Chiral', description: 'Coated cellulose, normal phase' },
  { name: 'Lux Cellulose-1', vendor: 'Phenomenex', chemistry: 'Chiral', description: 'Coated cellulose chiral selector' },
  { name: 'Lux Amylose-1', vendor: 'Phenomenex', chemistry: 'Chiral', description: 'Coated amylose chiral selector' },

  { name: 'CHIRALPAK IB N', vendor: 'Daicel', chemistry: 'Chiral', description: 'Immobilised cellulose, narrower particle distribution' },
  { name: 'CHIRALPAK ID', vendor: 'Daicel', chemistry: 'Chiral', description: 'Immobilised amylose tris(3-chlorophenylcarbamate)' },
  { name: 'CHIRALPAK IE', vendor: 'Daicel', chemistry: 'Chiral', description: 'Immobilised amylose tris(3,5-dichlorophenylcarbamate)' },
  { name: 'CHIRALPAK IF', vendor: 'Daicel', chemistry: 'Chiral', description: 'Immobilised amylose, AZ-H selector equivalent' },
  { name: 'CHIRALPAK IH', vendor: 'Daicel', chemistry: 'Chiral', description: 'Immobilised amylose, complementary to IG' },
  { name: 'CHIRALPAK AS-H', vendor: 'Daicel', chemistry: 'Chiral', description: 'Coated amylose tris(S)-α-methylbenzylcarbamate' },
  { name: 'CHIRALPAK AY-H', vendor: 'Daicel', chemistry: 'Chiral', description: 'Coated amylose tris(5-chloro-2-methylphenylcarbamate)' },
  { name: 'CHIRALPAK AZ-H', vendor: 'Daicel', chemistry: 'Chiral', description: 'Coated amylose tris(3-chloro-4-methylphenylcarbamate)' },
  { name: 'CHIRALCEL OJ-H', vendor: 'Daicel', chemistry: 'Chiral', description: 'Coated cellulose tris(4-methylbenzoate)' },
  { name: 'CHIRALCEL OZ-H', vendor: 'Daicel', chemistry: 'Chiral', description: 'Coated cellulose tris(3-chloro-4-methylphenylcarbamate)' },
  { name: 'Lux Cellulose-2', vendor: 'Phenomenex', chemistry: 'Chiral', description: 'Coated cellulose tris(3-chloro-4-methylphenylcarbamate)' },
  { name: 'Lux Cellulose-3', vendor: 'Phenomenex', chemistry: 'Chiral', description: 'Coated cellulose tris(4-methylbenzoate)' },
  { name: 'Lux Amylose-2', vendor: 'Phenomenex', chemistry: 'Chiral', description: 'Coated amylose with alternative selectivity' },
  { name: 'Lux i-Cellulose-5', vendor: 'Phenomenex', chemistry: 'Chiral', description: 'Immobilised cellulose, broad solvent compatibility' },
  { name: 'Lux i-Amylose-1', vendor: 'Phenomenex', chemistry: 'Chiral', description: 'Immobilised amylose, tolerates THF and chloroform' },
  { name: 'CHIRAL ART Amylose-SA', vendor: 'YMC', chemistry: 'Chiral', description: 'Immobilised amylose, robust under strong solvents' },
  { name: 'CHIRAL ART Cellulose-SB', vendor: 'YMC', chemistry: 'Chiral', description: 'Immobilised cellulose chiral selector' },
  { name: 'CHIROBIOTIC T', vendor: 'Supelco', chemistry: 'Chiral', description: 'Teicoplanin macrocyclic glycopeptide; amino acids, acids' },
  { name: 'CYCLOBOND I 2000', vendor: 'Supelco', chemistry: 'Chiral', description: 'β-cyclodextrin bonded phase for chiral LC' },
  { name: 'Whelk-O 1', vendor: 'Regis', chemistry: 'Chiral', description: 'Pirkle-type brush phase for aryl-containing enantiomers' },

  // SEC / IEX for bio work run on LC systems
  { name: 'ACQUITY BEH200 SEC', vendor: 'Waters', chemistry: 'Size exclusion / ion exchange', description: 'Protein SEC, 200 Å' },
  { name: 'ACQUITY BEH125 SEC', vendor: 'Waters', chemistry: 'Size exclusion / ion exchange', description: 'Peptide SEC, 125 Å' },
  { name: 'AdvanceBio SEC 300Å', vendor: 'Agilent', chemistry: 'Size exclusion / ion exchange', description: 'Aggregate analysis of monoclonal antibodies' },
  { name: 'Yarra SEC-3000', vendor: 'Phenomenex', chemistry: 'Size exclusion / ion exchange', description: 'Protein SEC' },
  { name: 'TSKgel G3000SWxl', vendor: 'Tosoh', chemistry: 'Size exclusion / ion exchange', description: 'Classic protein SEC column' },
  { name: 'ProPac SAX-10', vendor: 'Thermo Scientific', chemistry: 'Size exclusion / ion exchange', description: 'Strong anion exchange for proteins' },
  { name: 'ProPac WCX-10', vendor: 'Thermo Scientific', chemistry: 'Size exclusion / ion exchange', description: 'Weak cation exchange, charge variants' },
  { name: 'MAbPac SCX-10', vendor: 'Thermo Scientific', chemistry: 'Size exclusion / ion exchange', description: 'Strong cation exchange for mAb charge variants' },
  { name: 'GTxResolve Premier SEC 1000Å', vendor: 'Waters', chemistry: 'Size exclusion / ion exchange', description: 'Wide-pore SEC for AAV capsids and large biomolecules' },
  { name: 'GTxResolve Premier BEH SEC 450Å', vendor: 'Waters', chemistry: 'Size exclusion / ion exchange', description: 'Low-adsorption SEC for 100–500 Å analytes' },
  { name: 'Protein-Pak Hi Res Q', vendor: 'Waters', chemistry: 'Size exclusion / ion exchange', description: '5 µm quaternary amine SAX for protein charge variants' },
  { name: 'Gen-Pak FAX', vendor: 'Waters', chemistry: 'Size exclusion / ion exchange', description: 'Anion exchange for nucleic acids and oligonucleotides' },
  { name: 'AdvanceBio SEC 130Å', vendor: 'Agilent', chemistry: 'Size exclusion / ion exchange', description: 'Peptide and small-protein SEC' },
  { name: 'Bio SEC-3', vendor: 'Agilent', chemistry: 'Size exclusion / ion exchange', description: '3 µm aqueous SEC, bio-inert hardware' },
  { name: 'Bio mAb NP5', vendor: 'Agilent', chemistry: 'Size exclusion / ion exchange', description: 'Non-porous weak cation exchange for mAb charge variants' },
  { name: 'TSKgel UP-SW mAb', vendor: 'Tosoh', chemistry: 'Size exclusion / ion exchange', description: 'High-resolution mAb monomer/aggregate separation' },
  { name: 'MAbPac Protein A', vendor: 'Thermo Scientific', chemistry: 'Size exclusion / ion exchange', description: 'Protein A affinity for mAb titre and DAR work' },
  { name: 'GlycanPac AXH-1', vendor: 'Thermo Scientific', chemistry: 'Size exclusion / ion exchange', description: 'Mixed-mode amide/anion exchange for labelled glycans' },

  // Oligonucleotide / nucleic acid
  { name: 'XBridge Premier Oligonucleotide BEH C18 300Å', vendor: 'Waters', chemistry: 'Reversed phase — oligonucleotide / nucleic acid', description: 'IP-RP separation of synthetic oligos; MaxPeak surface, 2.5 µm' },
  { name: 'ACQUITY Premier Oligonucleotide C18 130Å', vendor: 'Waters', chemistry: 'Reversed phase — oligonucleotide / nucleic acid', description: 'UPLC-scale oligonucleotide IP-RP on MaxPeak surface' },
  { name: 'GTxResolve Premier BEH Amide 300Å', vendor: 'Waters', chemistry: 'Reversed phase — oligonucleotide / nucleic acid', description: 'HILIC for oligonucleotides and viral proteins, 1.7 µm' },
  { name: 'AdvanceBio Oligonucleotide', vendor: 'Agilent', chemistry: 'Reversed phase — oligonucleotide / nucleic acid', description: 'Bio-inert IP-RP column for DNA and RNA oligos' },
  { name: 'DNAPac RP', vendor: 'Thermo Scientific', chemistry: 'Reversed phase — oligonucleotide / nucleic acid', description: 'Polymeric reversed phase for oligonucleotide IP-RP' },
  { name: 'DNAPac PA200', vendor: 'Thermo Scientific', chemistry: 'Reversed phase — oligonucleotide / nucleic acid', description: 'Polymeric strong anion exchange, high-resolution oligo purity' },
  { name: 'DNAPac PA200 RS', vendor: 'Thermo Scientific', chemistry: 'Reversed phase — oligonucleotide / nucleic acid', description: 'Rapid-separation anion exchange for oligos' },
  { name: 'DNAPac PA100', vendor: 'Thermo Scientific', chemistry: 'Reversed phase — oligonucleotide / nucleic acid', description: 'Anion exchange for DNA and RNA fragments' },
  { name: 'SurePac Oligo RP MDi', vendor: 'Thermo Scientific', chemistry: 'Reversed phase — oligonucleotide / nucleic acid', description: 'Supermacroporous 4 µm resin for oligos and double-stranded nucleic acids' },
  { name: 'Clarity Oligo-RP', vendor: 'Phenomenex', chemistry: 'Reversed phase — oligonucleotide / nucleic acid', description: 'Polymeric-coated silica for oligonucleotide IP-RP' },

  // Peptide / protein reversed phase (wide pore)
  { name: 'ACQUITY UPLC Peptide BEH C18 130Å', vendor: 'Waters', chemistry: 'Reversed phase — peptide / protein (wide pore)', description: 'Peptide mapping and digest separations' },
  { name: 'XBridge Premier Peptide BEH C18 300Å', vendor: 'Waters', chemistry: 'Reversed phase — peptide / protein (wide pore)', description: 'Wide-pore peptide and small-protein RP on MaxPeak surface' },
  { name: 'BioResolve RP mAb Polyphenyl', vendor: 'Waters', chemistry: 'Reversed phase — peptide / protein (wide pore)', description: 'Wide-pore polyphenyl for intact and subunit mAb analysis' },
  { name: 'AdvanceBio Peptide Mapping', vendor: 'Agilent', chemistry: 'Reversed phase — peptide / protein (wide pore)', description: 'Peptide mapping of biotherapeutic digests' },
  { name: 'AdvanceBio Peptide Plus', vendor: 'Agilent', chemistry: 'Reversed phase — peptide / protein (wide pore)', description: 'Peptide RP stable at low and high pH' },
  { name: 'AdvanceBio RP-mAb', vendor: 'Agilent', chemistry: 'Reversed phase — peptide / protein (wide pore)', description: 'Wide-pore RP for intact mAbs and fragments' },
  { name: 'MAbPac RP', vendor: 'Thermo Scientific', chemistry: 'Reversed phase — peptide / protein (wide pore)', description: 'Polymeric wide-pore RP for intact proteins at high temperature' },
  { name: 'Aeris WIDEPORE XB-C18', vendor: 'Phenomenex', chemistry: 'Reversed phase — peptide / protein (wide pore)', description: 'Core-shell wide-pore C18 for proteins and large peptides' },
  { name: 'bioZen Peptide XB-C18', vendor: 'Phenomenex', chemistry: 'Reversed phase — peptide / protein (wide pore)', description: 'Bio-inert core-shell C18 for peptide mapping' },
  { name: 'Jupiter C4 300Å', vendor: 'Phenomenex', chemistry: 'Reversed phase — peptide / protein (wide pore)', description: 'Wide-pore C4 for intact proteins' },
  { name: 'Shim-pack Arata Peptide C18', vendor: 'Shimadzu', chemistry: 'Reversed phase — peptide / protein (wide pore)', description: 'Low-adsorption peptide C18 with high recovery' },

  // Mixed-mode
  { name: 'Acclaim Trinity P1', vendor: 'Thermo Scientific', chemistry: 'Mixed-mode', description: 'RP plus anion and cation exchange; counterions and APIs in one run' },
  { name: 'Acclaim Trinity P2', vendor: 'Thermo Scientific', chemistry: 'Mixed-mode', description: 'Mixed-mode for choline, amino acids and organic acids' },
  { name: 'Acclaim Mixed-Mode WAX-1', vendor: 'Thermo Scientific', chemistry: 'Mixed-mode', description: 'Reversed phase with weak anion exchange' },
  { name: 'Acclaim Mixed-Mode HILIC-1', vendor: 'Thermo Scientific', chemistry: 'Mixed-mode', description: 'Reversed phase plus HILIC retention of polar analytes' },
  { name: 'Scherzo SS-C18', vendor: 'Imtakt', chemistry: 'Mixed-mode', description: 'C18 with strong anion and cation exchange; zwitterions' },
  { name: 'Scherzo SM-C18', vendor: 'Imtakt', chemistry: 'Mixed-mode', description: 'C18 with moderate ion-exchange density' },
  { name: 'Scherzo SW-C18', vendor: 'Imtakt', chemistry: 'Mixed-mode', description: 'C18 with weak ion exchange for basic drugs' },
  { name: 'Primesep 100', vendor: 'SIELC', chemistry: 'Mixed-mode', description: 'Reversed phase with embedded acidic ion-pairing group' },
  { name: 'Obelisc R', vendor: 'SIELC', chemistry: 'Mixed-mode', description: 'Hydrophobic ligand with embedded anion and surface cation exchange' },
  { name: 'Obelisc N', vendor: 'SIELC', chemistry: 'Mixed-mode', description: 'Hydrophilic mixed-mode for very polar and ionic analytes' },

  // GPC / polymer SEC run on an LC or GPC system
  { name: 'PLgel MIXED-C', vendor: 'Agilent', chemistry: 'GPC / polymer SEC', description: 'Organic GPC, wide linear calibration in THF' },
  { name: 'PLgel MIXED-D', vendor: 'Agilent', chemistry: 'GPC / polymer SEC', description: 'Organic GPC for oligomers and low-MW polymers' },
  { name: 'PLgel Olexis', vendor: 'Agilent', chemistry: 'GPC / polymer SEC', description: 'High-temperature GPC of polyolefins' },
  { name: 'PL aquagel-OH MIXED-H', vendor: 'Agilent', chemistry: 'GPC / polymer SEC', description: 'Aqueous GPC of water-soluble polymers' },
  { name: 'Styragel HR 4E', vendor: 'Waters', chemistry: 'GPC / polymer SEC', description: 'Styrene-divinylbenzene GPC for oligomers and additives' },
  { name: 'Styragel HMW 6E', vendor: 'Waters', chemistry: 'GPC / polymer SEC', description: 'High-molecular-weight GPC with low polymer shear' },
  { name: 'Shodex KF-804', vendor: 'Shodex', chemistry: 'GPC / polymer SEC', description: 'THF GPC for polystyrene-calibrated polymers' },
  { name: 'Shodex KD-806M', vendor: 'Shodex', chemistry: 'GPC / polymer SEC', description: 'DMF GPC for polar polymers' },
  { name: 'Shodex HFIP-806M', vendor: 'Shodex', chemistry: 'GPC / polymer SEC', description: 'HFIP GPC for polyesters and polyamides' },
  { name: 'TSKgel GMHHR-M', vendor: 'Tosoh', chemistry: 'GPC / polymer SEC', description: 'Mixed-bed organic GPC, broad MW range' },
  { name: 'TSKgel SuperMultipore HZ-M', vendor: 'Tosoh', chemistry: 'GPC / polymer SEC', description: 'Semi-micro organic GPC, fast analysis' },
  { name: 'TSKgel Alpha-M', vendor: 'Tosoh', chemistry: 'GPC / polymer SEC', description: 'Polar organic solvent GPC (DMF, water)' },

  // Preparative
  { name: 'XBridge BEH C18 OBD Prep', vendor: 'Waters', chemistry: 'Preparative', description: 'Scale-up of XBridge BEH methods, 5 µm OBD hardware' },
  { name: 'XBridge Premier Oligonucleotide BEH C18 300Å OBD Prep', vendor: 'Waters', chemistry: 'Preparative', description: 'Preparative oligonucleotide purification, 5 µm' },
  { name: 'XBridge Premier Peptide BEH C18 300Å OBD Prep', vendor: 'Waters', chemistry: 'Preparative', description: 'Preparative peptide purification, 5 µm' },
  { name: 'SunFire Prep C18 OBD', vendor: 'Waters', chemistry: 'Preparative', description: 'Low-pH robust preparative C18' },
  { name: 'Luna AXIA C18(2)', vendor: 'Phenomenex', chemistry: 'Preparative', description: 'Axial-compression prep hardware, Luna C18 packing' },
  { name: 'Kinetex AXIA Prep C18', vendor: 'Phenomenex', chemistry: 'Preparative', description: 'Core-shell prep column for high-throughput purification' },
  { name: 'YMC-Actus Triart C18', vendor: 'YMC', chemistry: 'Preparative', description: 'Hybrid-particle preparative C18, wide pH range' },
];

const LC_DIMENSIONS: ColumnDimensionSpec[] = [
  {
    key: 'length', label: 'Length', unit: 'mm',
    options: ['20', '30', '50', '75', '100', '125', '150', '200', '250', '300'],
  },
  {
    key: 'id', label: 'Inner diameter', unit: 'mm',
    options: ['1.0', '2.0', '2.1', '3.0', '4.0', '4.6', '7.8', '8.0', '10', '19', '21.2', '30', '50'],
  },
  {
    key: 'particle', label: 'Particle size', unit: 'µm',
    options: ['1.3', '1.5', '1.6', '1.7', '1.8', '1.9', '2.5', '2.6', '2.7', '3.0', '3.5', '4.0', '5.0', '7.0', '10', '13', '20'],
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
  { name: 'Dionex IonPac AS4A-SC', vendor: 'Thermo Scientific', chemistry: 'Anion exchange', description: 'Legacy carbonate-eluent column, common anions' },
  { name: 'Dionex IonPac AS9-HC', vendor: 'Thermo Scientific', chemistry: 'Anion exchange', description: 'High-capacity carbonate eluent; oxyhalides and common anions' },
  { name: 'Dionex IonPac AS11', vendor: 'Thermo Scientific', chemistry: 'Anion exchange', description: 'Hydroxide gradient for organic acids and inorganic anions' },
  { name: 'Dionex IonPac AS12A', vendor: 'Thermo Scientific', chemistry: 'Anion exchange', description: 'Carbonate eluent, chloride/sulfate from fluoride' },
  { name: 'Dionex IonPac AS16', vendor: 'Thermo Scientific', chemistry: 'Anion exchange', description: 'Hydroxide eluent for polarisable anions; thiocyanate, perchlorate' },
  { name: 'Dionex IonPac AS17-C', vendor: 'Thermo Scientific', chemistry: 'Anion exchange', description: 'Low-capacity hydroxide gradient, trace anions in water' },
  { name: 'Dionex IonPac AS21', vendor: 'Thermo Scientific', chemistry: 'Anion exchange', description: 'Trace perchlorate by IC-MS/MS' },
  { name: 'Dionex IonPac AS24', vendor: 'Thermo Scientific', chemistry: 'Anion exchange', description: 'Haloacetic acids and bromate by IC-MS/MS' },
  { name: 'Dionex IonPac AS25', vendor: 'Thermo Scientific', chemistry: 'Anion exchange', description: 'Sulfide, sulfite and other reactive anions' },
  { name: 'Dionex IonPac AS27', vendor: 'Thermo Scientific', chemistry: 'Anion exchange', description: 'Haloacetic acids in drinking water, EPA 557' },
  { name: 'Dionex IonPac AS28-Fast-4µm', vendor: 'Thermo Scientific', chemistry: 'Anion exchange', description: '4 µm particle, fast hydroxide-eluent common anions' },
  { name: 'Dionex IonPac AS30', vendor: 'Thermo Scientific', chemistry: 'Anion exchange', description: 'High-capacity hydroxide column for complex matrices' },
  { name: 'Dionex IonPac AS31', vendor: 'Thermo Scientific', chemistry: 'Anion exchange', description: 'Organic acids and inorganic anions in one run' },
  { name: 'Dionex IonPac AS7', vendor: 'Thermo Scientific', chemistry: 'Anion exchange', description: 'Specialty column for polyvalent anions and cyanide' },
  { name: 'Dionex IonPac CS5A', vendor: 'Thermo Scientific', chemistry: 'Cation exchange', description: 'Mixed-bed column for transition metals and lanthanides' },
  { name: 'Dionex IonPac CS14', vendor: 'Thermo Scientific', chemistry: 'Cation exchange', description: 'Amines and alkanolamines with MSA eluent' },
  { name: 'Dionex IonPac CS18', vendor: 'Thermo Scientific', chemistry: 'Cation exchange', description: 'Polar amines and small organic cations' },
  { name: 'Dionex IonPac CS19', vendor: 'Thermo Scientific', chemistry: 'Cation exchange', description: 'Aliphatic amines and common cations, MS compatible' },
  { name: 'Dionex IonPac CS20', vendor: 'Thermo Scientific', chemistry: 'Cation exchange', description: 'High-capacity column for hydrophilic amines' },
  { name: 'Metrosep A Supp 4', vendor: 'Metrohm', chemistry: 'Anion exchange', description: 'Standard anions with low backpressure' },
  { name: 'Metrosep A Supp 10', vendor: 'Metrohm', chemistry: 'Anion exchange', description: 'High-capacity anion column for complex matrices' },
  { name: 'Metrosep A Supp 16', vendor: 'Metrohm', chemistry: 'Anion exchange', description: 'Hydroxide-selective anion column for trace work' },
  { name: 'Shodex IC SI-50 4E', vendor: 'Shodex', chemistry: 'Anion exchange', description: 'Suppressed anion column, higher performance than SI-90' },
  { name: 'Shodex IC NI-424', vendor: 'Shodex', chemistry: 'Anion exchange', description: 'Non-suppressed anion analysis on a standard HPLC system' },
  { name: 'Shodex IC YS-50', vendor: 'Shodex', chemistry: 'Cation exchange', description: 'Non-suppressed cation column, mono- and divalent cations' },
  { name: 'Hamilton PRP-X100', vendor: 'Hamilton', chemistry: 'Anion exchange', description: 'Polymeric anion exchange; arsenic speciation, ppb anions' },
  { name: 'Hamilton RCX-10', vendor: 'Hamilton', chemistry: 'Anion exchange', description: 'Polymeric hydroxide-eluent anion exchange' },
  { name: 'Dionex IonPac ICE-AS1', vendor: 'Thermo Scientific', chemistry: 'Ion exclusion', description: 'Ion exclusion for organic acids and weak acids' },
  { name: 'Hamilton PRP-X300', vendor: 'Hamilton', chemistry: 'Ion exclusion', description: 'Sulfonated PS-DVB; alcohols and organic acids by ion exclusion' },
  { name: 'Dionex CarboPac PA1', vendor: 'Thermo Scientific', chemistry: 'Carbohydrate (HPAE-PAD)', description: 'Routine mono-, di- and oligosaccharides by HPAE-PAD' },
  { name: 'Dionex CarboPac PA10', vendor: 'Thermo Scientific', chemistry: 'Carbohydrate (HPAE-PAD)', description: 'High-resolution mono- and disaccharides, isocratic' },
  { name: 'Dionex CarboPac PA20', vendor: 'Thermo Scientific', chemistry: 'Carbohydrate (HPAE-PAD)', description: 'Fast mono/disaccharide and sialic acid analysis' },
  { name: 'Dionex CarboPac PA200', vendor: 'Thermo Scientific', chemistry: 'Carbohydrate (HPAE-PAD)', description: 'First choice for oligosaccharide separations' },
  { name: 'Dionex CarboPac MA1', vendor: 'Thermo Scientific', chemistry: 'Carbohydrate (HPAE-PAD)', description: 'Sugar alcohols and N-acetamido sugars' },
  { name: 'Dionex CarboPac SA10', vendor: 'Thermo Scientific', chemistry: 'Carbohydrate (HPAE-PAD)', description: 'Fast sugar analysis in food and beverage matrices' },
];

const IC_DIMENSIONS: ColumnDimensionSpec[] = [
  { key: 'length', label: 'Length', unit: 'mm', options: ['50', '100', '150', '200', '250'] },
  { key: 'id', label: 'Inner diameter', unit: 'mm', options: ['0.4', '2.0', '3.0', '4.0', '4.6'] },
  { key: 'particle', label: 'Particle size', unit: 'µm', options: ['4.0', '5.0', '5.5', '6.5', '7.5', '8.5', '9.0', '10', '11', '13'] },
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
  { name: 'Viridis Silica 2-EP', vendor: 'Waters', chemistry: 'Achiral SFC', description: 'Preparative 2-ethylpyridine silica for basic analytes' },
  { name: 'Princeton 2-Ethylpyridine', vendor: 'Princeton Chromatography', chemistry: 'Achiral SFC', description: '2-ethylpyridine phase for SFC method screening' },
  { name: 'CHIRALPAK IA-3', vendor: 'Daicel', chemistry: 'Chiral SFC', description: 'Immobilised amylose, 3 µm for SFC screening' },
  { name: 'CHIRALPAK IC-3', vendor: 'Daicel', chemistry: 'Chiral SFC', description: 'Immobilised cellulose tris(3,5-dichlorophenylcarbamate), 3 µm' },
  { name: 'CHIRALPAK ID-3', vendor: 'Daicel', chemistry: 'Chiral SFC', description: 'Immobilised amylose tris(3-chlorophenylcarbamate), 3 µm' },
  { name: 'CHIRALPAK IE-3', vendor: 'Daicel', chemistry: 'Chiral SFC', description: 'Immobilised amylose tris(3,5-dichlorophenylcarbamate), 3 µm' },
  { name: 'CHIRALPAK AS-3', vendor: 'Daicel', chemistry: 'Chiral SFC', description: 'Coated amylose (S)-α-methylbenzylcarbamate, 3 µm' },
  { name: 'CHIRALPAK AY-3', vendor: 'Daicel', chemistry: 'Chiral SFC', description: 'Coated amylose, 3 µm for SFC screening' },
  { name: 'CHIRALPAK AZ-3', vendor: 'Daicel', chemistry: 'Chiral SFC', description: 'Coated amylose, complementary SFC selectivity' },
  { name: 'CHIRALCEL OD-3', vendor: 'Daicel', chemistry: 'Chiral SFC', description: 'Coated cellulose tris(3,5-dimethylphenylcarbamate), 3 µm' },
  { name: 'CHIRALCEL OZ-3', vendor: 'Daicel', chemistry: 'Chiral SFC', description: 'Coated cellulose, 3 µm for SFC' },
  { name: 'Lux Amylose-2', vendor: 'Phenomenex', chemistry: 'Chiral SFC', description: 'Coated amylose chiral phase for SFC' },
  { name: 'Lux i-Cellulose-5', vendor: 'Phenomenex', chemistry: 'Chiral SFC', description: 'Immobilised cellulose, tolerates strong SFC modifiers' },
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
  { name: 'Superdex 30 Increase 10/300 GL', vendor: 'Cytiva', chemistry: 'Preparative / analytical SEC', description: 'Peptides and small proteins below 10 kDa' },
  { name: 'Superdex 200 Increase 5/150 GL', vendor: 'Cytiva', chemistry: 'Preparative / analytical SEC', description: 'Fast analytical-scale protein SEC, small sample volumes' },
  { name: 'Superose 12 10/300 GL', vendor: 'Cytiva', chemistry: 'Preparative / analytical SEC', description: 'Protein SEC 1–300 kDa' },
  { name: 'HiLoad 16/600 Superdex 75 pg', vendor: 'Cytiva', chemistry: 'Preparative / analytical SEC', description: 'Preparative SEC for 3–70 kDa proteins' },
  { name: 'HiPrep 16/60 Sephacryl S-200 HR', vendor: 'Cytiva', chemistry: 'Preparative / analytical SEC', description: 'Preparative SEC, 5–250 kDa' },
  { name: 'HiPrep 16/60 Sephacryl S-300 HR', vendor: 'Cytiva', chemistry: 'Preparative / analytical SEC', description: 'Preparative SEC, 10–1500 kDa' },
  { name: 'TSKgel G2000SWxl', vendor: 'Tosoh', chemistry: 'Analytical SEC (silica)', description: 'Peptides and small proteins by GFC' },
  { name: 'TSKgel UP-SW mAb', vendor: 'Tosoh', chemistry: 'Analytical SEC (silica)', description: 'High-resolution mAb monomer, dimer and fragment separation' },
  { name: 'Bio SEC-3', vendor: 'Agilent', chemistry: 'Analytical SEC (silica)', description: '3 µm aqueous SEC on bio-inert hardware' },
  { name: 'GTxResolve Premier SEC 1000Å', vendor: 'Waters', chemistry: 'Analytical SEC (silica)', description: 'Wide-pore SEC for AAV capsids and large biomolecules' },
  { name: 'Shodex KW-802.5', vendor: 'Shodex', chemistry: 'Analytical SEC (silica)', description: 'Aqueous SEC for proteins up to 150 kDa' },
  { name: 'HiTrap Q FF', vendor: 'Cytiva', chemistry: 'Ion exchange (FPLC)', description: 'Prepacked strong anion exchange, high flow' },
  { name: 'HiTrap SP FF', vendor: 'Cytiva', chemistry: 'Ion exchange (FPLC)', description: 'Prepacked strong cation exchange, high flow' },
  { name: 'HiTrap DEAE FF', vendor: 'Cytiva', chemistry: 'Ion exchange (FPLC)', description: 'Weak anion exchange for gentle protein binding' },
  { name: 'HiTrap Capto Q', vendor: 'Cytiva', chemistry: 'Ion exchange (FPLC)', description: 'Process-grade strong anion exchange in a prepacked column' },
  { name: 'HiTrap Capto SP ImpRes', vendor: 'Cytiva', chemistry: 'Ion exchange (FPLC)', description: 'High-resolution strong cation exchange' },
  { name: 'Capto Q HiRes 5/50', vendor: 'Cytiva', chemistry: 'Ion exchange (FPLC)', description: 'Prepacked high-resolution anion exchange for screening' },
  { name: 'Capto S HiRes 5/50', vendor: 'Cytiva', chemistry: 'Ion exchange (FPLC)', description: 'Prepacked high-resolution cation exchange for screening' },
  { name: 'HisTrap HP', vendor: 'Cytiva', chemistry: 'Affinity (FPLC)', description: 'Ni Sepharose IMAC for His-tagged protein capture' },
  { name: 'HisTrap FF crude', vendor: 'Cytiva', chemistry: 'Affinity (FPLC)', description: 'IMAC directly from unclarified lysate' },
  { name: 'HisTrap excel', vendor: 'Cytiva', chemistry: 'Affinity (FPLC)', description: 'IMAC tolerant of reducing agents and high loads' },
  { name: 'HiTrap MabSelect SuRe', vendor: 'Cytiva', chemistry: 'Affinity (FPLC)', description: 'Alkali-tolerant protein A for mAb capture' },
  { name: 'HiTrap MabSelect PrismA', vendor: 'Cytiva', chemistry: 'Affinity (FPLC)', description: 'High-capacity, caustic-stable protein A' },
  { name: 'HiTrap Protein A HP', vendor: 'Cytiva', chemistry: 'Affinity (FPLC)', description: 'Analytical-scale protein A affinity' },
  { name: 'HiTrap Protein G HP', vendor: 'Cytiva', chemistry: 'Affinity (FPLC)', description: 'Protein G affinity for IgG subclasses' },
  { name: 'GSTrap FF', vendor: 'Cytiva', chemistry: 'Affinity (FPLC)', description: 'Glutathione affinity for GST-tagged proteins' },
  { name: 'HiTrap Streptavidin HP', vendor: 'Cytiva', chemistry: 'Affinity (FPLC)', description: 'Biotinylated ligand and analyte capture' },
  { name: 'HiTrap Heparin HP', vendor: 'Cytiva', chemistry: 'Affinity (FPLC)', description: 'Pseudo-affinity for coagulation factors and DNA-binding proteins' },
  { name: 'HiTrap Phenyl HP', vendor: 'Cytiva', chemistry: 'Hydrophobic interaction (FPLC)', description: 'Phenyl HIC for aggregate and variant removal' },
  { name: 'HiTrap Butyl HP', vendor: 'Cytiva', chemistry: 'Hydrophobic interaction (FPLC)', description: 'Butyl HIC, milder hydrophobicity than phenyl' },
  { name: 'HiTrap Octyl FF', vendor: 'Cytiva', chemistry: 'Hydrophobic interaction (FPLC)', description: 'Octyl HIC for strongly polar proteins' },
  { name: 'HiTrap Capto Phenyl ImpRes', vendor: 'Cytiva', chemistry: 'Hydrophobic interaction (FPLC)', description: 'High-resolution phenyl HIC' },
  { name: 'HiTrap Desalting', vendor: 'Cytiva', chemistry: 'Desalting / buffer exchange', description: 'Sephadex G-25 buffer exchange, 5 mL format' },
  { name: 'HiPrep 26/10 Desalting', vendor: 'Cytiva', chemistry: 'Desalting / buffer exchange', description: 'Preparative desalting up to 15 mL sample' },
  { name: 'PLgel MIXED-C', vendor: 'Agilent', chemistry: 'GPC / polymer SEC', description: 'Organic GPC, wide linear calibration in THF' },
  { name: 'PLgel Olexis', vendor: 'Agilent', chemistry: 'GPC / polymer SEC', description: 'High-temperature GPC of polyolefins' },
  { name: 'PL aquagel-OH MIXED-H', vendor: 'Agilent', chemistry: 'GPC / polymer SEC', description: 'Aqueous GPC of water-soluble polymers' },
  { name: 'Styragel HR 4E', vendor: 'Waters', chemistry: 'GPC / polymer SEC', description: 'Styrene-divinylbenzene GPC for oligomers and additives' },
  { name: 'Shodex KF-804', vendor: 'Shodex', chemistry: 'GPC / polymer SEC', description: 'THF GPC for polystyrene-calibrated polymers' },
  { name: 'TSKgel GMHHR-M', vendor: 'Tosoh', chemistry: 'GPC / polymer SEC', description: 'Mixed-bed organic GPC, broad MW range' },
];

const SEC_DIMENSIONS: ColumnDimensionSpec[] = [
  { key: 'length', label: 'Length', unit: 'mm', options: ['25', '50', '100', '150', '200', '250', '300', '600'] },
  { key: 'id', label: 'Inner diameter', unit: 'mm', options: ['4.6', '5.0', '6.0', '7.8', '8.0', '10', '16', '21.2', '26'] },
  { key: 'particle', label: 'Particle size', unit: 'µm', options: ['1.7', '2.0', '3.0', '4.0', '5.0', '8.6', '13', '34', '45', '75', '90'] },
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
