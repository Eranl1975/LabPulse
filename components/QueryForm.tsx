'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Technique, LabReport, RankedAnswer } from '@/lib/types';
import type { TextOutput, ManagerOutput } from '@/agents/presentation/types';
import { addReport } from '@/lib/reportStore';
import { exportAsText, exportAsCSV } from '@/lib/export';
import ReportModal from './ReportModal';
import ModeSwitcher, { type DisplayMode } from './ModeSwitcher';
import AnswerDisplay from './AnswerDisplay';
import ComboInput from './ComboInput';
import CleaningProcedureButton from './CleaningProcedureButton';
import EmailTroubleshootingDialog from './EmailTroubleshootingDialog';

// ── Option lists ──────────────────────────────────────────────────────────────

const TECHNIQUE_OPTIONS = ['HPLC', 'LCMS', 'GC', 'GCMS', 'UHPLC', 'IC', 'CE', 'SFC', 'TGA', 'DSC', 'FPLC', 'SPPS', 'XRD', 'DLS', 'Titration', 'KF', 'KFO', 'CD', 'SEM', 'Sputter', 'BET', 'SECMALS', 'TEM', 'Raman', 'ssNMR', 'NMR', 'PrepLC'] as const;

const VENDOR_OPTIONS = [
  'Agilent', 'Waters', 'Thermo Fisher', 'Dionex', 'TA Instruments', 'Cytiva', 'Shimadzu', 'SCIEX',
  'Restek', 'PerkinElmer', 'Bruker', 'Phenomenex', 'Sigma-Aldrich', 'Bio-Rad',
  'NETZSCH', 'Mettler Toledo', 'Hitachi', 'Beckman Coulter', 'CSBio', 'CEM Corporation',
  'Biotage', 'Gyros Protein Technologies',
  'Metrohm', 'Malvern Panalytical', 'Rigaku',
  // Physical characterization (v3.0)
  'JASCO', 'Denton Vacuum', 'Micromeritics',
  // Spectroscopy / NMR / SEC-MALS / TEM (v3.1)
  'Wyatt Technology', 'Tosoh Bioscience', 'Renishaw', 'HORIBA', 'JEOL',
  // KNAUER LC (v3.3)
  'KNAUER',
] as const;

const MODELS_BY_TECHNIQUE_AND_VENDOR: Record<string, Record<string, string[]>> = {
  HPLC: {
    'Agilent':       ['1100 Series HPLC', '1200 Series HPLC', '1220 Infinity II LC', '1260 Infinity HPLC', '1260 Infinity II', '1260 Infinity II Bio-inert LC'],
    'Waters':        ['Alliance 2695', 'Alliance e2695', 'Alliance HPLC', 'Arc Premier', 'Breeze HPLC', 'ACQUITY ARC', 'ACQUITY ARC Bio'],
    'Shimadzu':      ['Prominence HPLC', 'Nexera HPLC'],
    'Thermo Fisher': ['UltiMate 3000 HPLC', 'UltiMate 3000 SD'],
    'KNAUER':        ['AZURA P 2.1S Pump (400 bar)', 'AZURA P 4.1S Pump (150 bar)', 'AZURA UVD 2.1L UV Detector', 'AZURA DAD 2.1L Diode Array Detector', 'AZURA RID 2.1L Refractive Index Detector', 'AZURA FLD 2.1L Fluorescence Detector', 'AZURA AS 6.1L Autosampler', 'AZURA CT 2.1 Column Thermostat', 'AZURA Analytical HPLC System (862 bar)', 'AZURA Educational HPLC System'],
  },
  UHPLC: {
    'Agilent':       ['1290 Bio LC', '1290 Infinity UHPLC', '1290 Infinity II', '1290 Infinity II Bio LC', '1290 Infinity II Flexible Pump System', '1290 Infinity II Multisampler', '1290 Infinity II UHPLC'],
    'Waters':        ['ACQUITY Premier UPLC', 'ACQUITY UPLC', 'ACQUITY UPLC H-Class', 'ACQUITY UPLC H-Class PLUS', 'ACQUITY UPLC I-Class', 'ACQUITY UPLC I-Class PLUS'],
    'Thermo Fisher': ['Vanquish UHPLC', 'Vanquish Core UHPLC', 'Vanquish Flex UHPLC', 'Vanquish Horizon UHPLC'],
    'Shimadzu':      ['Nexera X2', 'Nexera XR', 'Nexera X3'],
    'KNAUER':        ['AZURA P 2.1L UHPLC Pump (1000 bar)', 'AZURA UHPLC System (1240 bar)', 'AZURA HTQC UHPLC System (High-Throughput QC)'],
  },
  LCMS: {
    'Agilent':       [
      // Single quadrupole
      '6120B Compact LC/MSD', '6125B LC/MSD', '6130B LC/MSD', '6135B LC/MSD',
      // InfinityLab single quadrupole (v4.1)
      'InfinityLab LC/MSD iQ (G6301)', 'InfinityLab Pro iQ (G6160B)', 'InfinityLab Pro iQ Plus (G6170A)',
      // Triple quadrupole
      '6460 Triple Quad LC/MS', '6470 Triple Quad LC/MS', '6495 Triple Quad LC/MS', '6495C Triple Quad LC/MS',
      // Q-TOF
      '6530 LC/Q-TOF', '6545 LC/Q-TOF', '6546 LC/Q-TOF', '6560 Ion Mobility LC/Q-TOF',
    ],
    'Waters':        [
      // Single quadrupole
      'QDa Mass Detector', 'QDa Performance Mass Detector', 'Xevo SQ Detector 2',
      // Triple quadrupole
      'Xevo TQ-S', 'Xevo TQ-XS', 'Xevo TQ-S micro',
      // Q-TOF
      'Xevo G2-XS QTof', 'Xevo G3 QTof', 'Synapt XS', 'SELECT SERIES Cyclic IMS',
    ],
    'Thermo Fisher': ['TSQ Altis', 'TSQ Altis Plus', 'TSQ Quantis', 'Q Exactive', 'Q Exactive Plus', 'Q Exactive HF', 'Orbitrap Exploris 480', 'Orbitrap Astral'],
    'Shimadzu':      ['LCMS-2050', 'LCMS-2020', 'LCMS-8045', 'LCMS-8060', 'LCMS-8060NX', 'LCMS-9030 Q-TOF', 'LCMS-9050 Q-TOF'],
    'SCIEX':         ['QTRAP 4500', 'QTRAP 5500', 'QTRAP 6500+', 'Triple Quad 5500+', 'Triple Quad 6500+', 'TripleTOF 6600+', 'ZenoTOF 7600'],
  },
  GC: {
    'Agilent':       ['7890A GC', '7890B GC', '8860 GC', '8890 GC'],
    'Thermo Fisher': ['Trace 1310 GC', 'Trace 1600 GC', 'FOCUS GC'],
    'Shimadzu':      ['GC-2010', 'GC-2030', 'GC-2014'],
    'PerkinElmer':   ['Clarus 590 GC', 'Clarus 690 GC'],
  },
  GCMS: {
    'Agilent':       ['5975C GC/MS', '5977B GC/MS', '7000D GC/MS Triple Quad', '7010B GC/MS Triple Quad'],
    'Thermo Fisher': ['ISQ 7000 GC-MS', 'TSQ 9000 GC-MS/MS'],
    'Shimadzu':      ['GCMS-QP2010 SE', 'GCMS-QP2020 NX', 'GCMS-TQ8050 NX'],
  },
  IC: {
    'Dionex':        ['Aquion IC System', 'Integrion HPIC System', 'ICS-900', 'ICS-1100', 'ICS-1600', 'ICS-2000', 'ICS-2100', 'ICS-3000', 'ICS-4000', 'ICS-5000', 'ICS-5000+', 'ICS-6000', 'ICS-6000 HPIC', 'ICS-6000 Capillary HPIC'],
    'Thermo Fisher': ['Aquion IC System', 'Integrion HPIC System', 'ICS-6000', 'ICS-6000 HPIC', 'ICS-6000 Capillary HPIC'],
  },
  CE: {
    'Agilent':          ['7100 Capillary Electrophoresis', 'G7100A CE'],
    'Beckman Coulter':  ['PA 800 Plus CE', 'CESI 8000 Plus'],
    'SCIEX':            ['PA 800 Plus Pharmaceutical Analysis System'],
  },
  SFC: {
    'Waters':   ['ACQUITY UPC² System', 'ACQUITY UPC² Bio System'],
    'Agilent':  ['1260 Infinity II SFC System', '1260 Infinity II Analytical SFC'],
    'Shimadzu': ['Nexera UC SFC-MS'],
  },
  TGA: {
    'TA Instruments': ['Discovery TGA 5500', 'Discovery TGA 5000', 'Discovery TGA 550', 'Discovery TGA 55', 'Discovery TGA 5500 IR', 'SDT 650', 'SDT Q600', 'Q50 TGA', 'Q500 TGA', 'Q5000 IR TGA', 'HiRes TGA 2950'],
    'NETZSCH':        ['TG 209 F1 Libra', 'TG 209 F3 Tarsus', 'STA 449 F1 Jupiter', 'STA 449 F3 Jupiter', 'TG 209 F1 Iris'],
    'Mettler Toledo': ['TGA/DSC 3+', 'TGA 2', 'TGA/DSC 1', 'TGA 1'],
    'PerkinElmer':    ['TGA 8000', 'TGA 4000', 'STA 8000'],
  },
  DSC: {
    'TA Instruments': ['Discovery DSC 250', 'Discovery DSC 2500', 'Discovery DSC 25', 'Discovery DSC 750 (HP)', 'Discovery Nano DSC', 'Q10 DSC', 'Q20 DSC', 'Q100 DSC', 'Q200 DSC', 'Q1000 DSC', 'Q2000 DSC'],
    'NETZSCH':        ['DSC 200 F3 Maia', 'DSC 214 Polyma', 'DSC 300 Caliris Select', 'DSC 404 F1 Pegasus', 'DSC 404 F3 Pegasus'],
    'Mettler Toledo': ['DSC 3+', 'DSC 2', 'DSC 1', 'Flash DSC 2+'],
    'PerkinElmer':    ['DSC 8500', 'DSC 4000', 'Pyris 1 DSC', 'DSC 6000'],
  },
  FPLC: {
    'Cytiva':  ['ÄKTA avant 25', 'ÄKTA avant 150', 'ÄKTA OligoPilot 10 Plus', 'ÄKTA OligoPilot 100 Plus', 'ÄKTA pure 25', 'ÄKTA pure 150', 'ÄKTA start', 'ÄKTA go'],
    'Bio-Rad': ['NGC Quest 10 Plus', 'NGC Quest 100 Plus', 'NGC Chromatography System'],
    'KNAUER':  ['AZURA Bio Lab FPLC System (240 bar)', 'AZURA Bio AC FPLC System', 'AZURA Bio SEC System (50 bar)', 'AZURA Bio Compact FPLC System'],
  },
  SPPS: {
    'CSBio':                    ['CS136X', 'CS336X', 'CS536X', 'CS136XT', 'CS336XT', 'CS536XT', 'CS336Xi', 'CSBio 6200', 'CSBio 396'],
    'CEM Corporation':          ['Liberty Blue', 'Liberty Blue HT', 'Liberty Prime', 'Liberty Lite', 'Liberty Classic'],
    'Biotage':                  ['Syro I', 'Syro Wave', 'Biotage SP Wave', 'Biotage SP Wave Duo'],
    'Gyros Protein Technologies': ['Prelude X', 'Symphony X', 'Symphony 12'],
  },
  XRD: {
    'Bruker':               ['D2 Phaser', 'D8 Advance', 'D8 Discover', 'D8 ENDEAVOR', 'D8 QUEST', 'D8 VENTURE'],
    'Malvern Panalytical':  ['Empyrean', "X'Pert Pro", 'Aeris', 'Zetium', 'Epsilon 4'],
    'Rigaku':               ['MiniFlex 600', 'MiniFlex 600-C', 'SmartLab SE', 'SmartLab Studio II', 'Ultima IV', 'Synergy'],
    'Shimadzu':             ['XRD-6100', 'XRD-7000', 'XRD-7000L', 'XRD-8000'],
    'Thermo Fisher':        ['ARL EQUINOX 100', 'ARL EQUINOX 1000', 'ARL PERFORM X'],
  },
  DLS: {
    'Malvern Panalytical':  ['Zetasizer Nano S', 'Zetasizer Nano ZS', 'Zetasizer Nano ZSP', 'Zetasizer Ultra Red', 'Zetasizer Pro', 'Zetasizer Lab', 'Mastersizer 3000', 'Mastersizer 3000E', 'NanoSight NS300', 'NanoSight NS500', 'Viscosizer TD'],
    'Brookhaven':           ['NanoBrook 90Plus PALS', 'NanoBrook Omni', 'NanoBrook ZetaPALS'],
    'Malvern':              ['Zetasizer Nano S', 'Zetasizer Nano ZS', 'Zetasizer Nano ZSP'],
  },
  Titration: {
    'Metrohm':        ['905 Titrando', '888 Titrando', '877 Titrino Plus', '848 Titrino Plus', '809 Titrando', 'Eco Titrator', '916 Ti-Touch', '756 KF Coulometer'],
    'Mettler Toledo': ['T5 Excellence Titrator', 'T7 Excellence Titrator', 'T9 Excellence Titrator', 'EasyPlus T5', 'EasyPlus T7'],
    'Hanna Instruments': ['HI 932', 'HI 931 Dual Acid-Base'],
  },
  KF: {
    'Metrohm':        ['870 KF Titrino Plus', '851 Titrando KF', '899 Coulometer', '917 Coulometer', 'Aqua 40.00 Coulometer', '756 KF Coulometer', '831 KF Coulometer'],
    'Mettler Toledo': ['C51 Compact KF Coulometer', 'C30 Compact KF Coulometer', 'V20 Compact KF Volumetric', 'V30 Compact KF Volumetric'],
  },
  KFO: {
    'Metrohm':        ['874 Oven Sample Processor', '885 Compact Oven Sample Processor', 'KF Oven 703 Sample Processor'],
    'Mettler Toledo': ['DO308 Drying Oven KF', 'DO308M Drying Oven'],
  },
  // ── Physical Characterization (v3.0) ───────────────────────────────────────
  CD: {
    'JASCO': ['J-1500 CD Spectrometer', 'J-1700 CD Spectrometer', 'J-815 CD Spectrometer', 'J-1100 CD Spectrometer', 'J-810 CD Spectrometer', 'J-820 CD Spectrometer'],
  },
  SEM: {
    'Thermo Fisher': ['Phenom Pro', 'Phenom ProX', 'Phenom XL', 'Phenom XL G2', 'Phenom Pharos', 'Phenom Essentis'],
  },
  Sputter: {
    'Denton Vacuum': ['Desk V', 'Desk VI HP', 'Desk VI BTD', 'Turbo-Desk', 'Explorer'],
  },
  BET: {
    'Micromeritics': ['Gemini VII 2390', 'Gemini VII 2385', 'TriStar II Plus', 'ASAP 2020', 'ASAP 2460', 'ASAP 2020 Plus', 'Flowsorb III'],
  },
  // ── Spectroscopy / NMR / SEC-MALS / TEM (v3.1) ───────────────────────────
  SECMALS: {
    'Wyatt Technology':  ['DAWN HELEOS II', 'DAWN 8+', 'miniDAWN TREOS II', 'Optilab T-rEX', 'microDAWN'],
    'Malvern Panalytical': ['OMNISEC Resolve', 'OMNISEC Reveal', 'OMNISEC Tetra'],
    'Tosoh Bioscience':  ['HLC-8321GPC/HT', 'EcoSEC Elite', 'EcoSEC HLC-8320GPC'],
    'Shimadzu':          ['Nexera GPC System', 'Prominence GPC-20A'],
  },
  TEM: {
    'Thermo Fisher':  ['Talos F200C', 'Talos L120C', 'Tecnai T12', 'Tecnai G2 F20', 'Glacios Cryo-TEM', 'Titan Krios G4'],
    'JEOL':           ['JEM-1400 Plus', 'JEM-2100', 'JEM-2100F', 'JEM-F200', 'JEM-ARM200F', 'JEM-Z300FSC'],
    'Hitachi':        ['HT7800', 'HT9500', 'HT7700', 'HT5000'],
  },
  Raman: {
    'Renishaw':       ['inVia Raman', 'inVia Qontor', 'inVia Reflex', 'Smiths Detection RA816'],
    'HORIBA':         ['LabRAM Odyssey', 'LabRAM HR Evolution', 'LabRAM HR800', 'XploRA PLUS'],
    'Thermo Fisher':  ['DXR3 Raman', 'DXR3xi Raman Imaging', 'DXR3 SmartRaman'],
    'Bruker':         ['Senterra II', 'BRAVO', 'MultiRAM'],
  },
  ssNMR: {
    'Bruker': ['Avance Neo 400 MHz (ssNMR)', 'Avance Neo 600 MHz (ssNMR)', 'Avance Neo 800 MHz (ssNMR)', 'Avance III HD 400 MHz', 'NEO 1 GHz (ssNMR)'],
    'JEOL':   ['ECZ-R 400 MHz', 'ECZ-R 600 MHz'],
  },
  NMR: {
    'Bruker': ['Avance Neo 300 MHz', 'Avance Neo 400 MHz', 'Avance Neo 500 MHz', 'Avance Neo 600 MHz', 'Avance Neo 800 MHz', 'Avance Neo 1 GHz', 'Fourier 300', 'Avance III HD 400'],
    'JEOL':   ['ECZL 400', 'ECZL 500', 'ECZL 600', 'ECZS 600', 'ECZL 800', 'ECX 400'],
  },
  // ── Preparative LC (v3.3) ─────────────────────────────────────────────────
  PrepLC: {
    'KNAUER':        ['AZURA Lab Prep System (50 mL/min, 200 bar)', 'AZURA Compact Prep System', 'AZURA Pilot Prep System (1000 mL/min)', 'AZURA P 6.1L Semi-Prep Pump (50 mL/min, 400 bar)', 'AZURA P 2.1L Prep Pump (500 mL/min, 100 bar)', 'AZURA P 4.1S Prep Pump (50 mL/min, 150 bar)'],
    'Waters':        ['Delta Prep 4000', 'Prep-LC 2000 System', 'PrepLC/MS System'],
    'Agilent':       ['1290 Infinity II Prep LC/MS System', '1260 Infinity II Prep-Scale LC/MS System'],
    'Shimadzu':      ['LC-20AP Prep LC System', 'LC-20AR Prep Pump'],
    'Thermo Fisher': ['Dionex UltiMate 3000 Preparative LC'],
  },
};

function getFilteredVendors(technique: string): string[] {
  if (!technique.trim()) return [...VENDOR_OPTIONS];
  return Object.keys(MODELS_BY_TECHNIQUE_AND_VENDOR[technique] ?? {});
}

function getFilteredModels(technique: string, vendor: string): string[] {
  const hasT = Boolean(technique.trim());
  const hasV = Boolean(vendor.trim());
  if (!hasT && !hasV) return [];
  if (hasT && hasV) return MODELS_BY_TECHNIQUE_AND_VENDOR[technique]?.[vendor] ?? [];
  if (hasT) return [...new Set(Object.values(MODELS_BY_TECHNIQUE_AND_VENDOR[technique] ?? {}).flat())];
  return [...new Set(Object.values(MODELS_BY_TECHNIQUE_AND_VENDOR).flatMap(m => m[vendor] ?? []))];
}

const ISSUES_BY_TECHNIQUE: Record<string, string[]> = {
  HPLC:  ['retention time shift', 'peak tailing', 'peak broadening', 'split peaks', 'noisy baseline', 'high backpressure', 'baseline drift', 'loss of resolution', 'carryover', 'low sensitivity', 'no peak', 'void volume issue', 'column overloading', 'pressure surge at injection'],
  UHPLC: ['retention time shift', 'peak tailing', 'peak broadening', 'split peaks', 'noisy baseline', 'high backpressure', 'baseline drift', 'loss of resolution', 'carryover', 'low sensitivity', 'no peak', 'void volume issue', 'pressure surge at injection'],
  LCMS:  ['LCMS source contamination', 'ion suppression', 'adduct formation', 'low sensitivity', 'no peak', 'carryover', 'loss of resolution', 'retention time shift', 'peak tailing', 'noisy baseline', 'instrument communication fault'],
  GC:    ['GC ghost peaks', 'poor GC peak shape', 'retention time shift', 'noisy baseline', 'split peaks', 'baseline drift', 'loss of resolution', 'carryover', 'low sensitivity', 'no peak'],
  GCMS:  ['GCMS signal loss', 'GC ghost peaks', 'poor GC peak shape', 'ion suppression', 'adduct formation', 'low sensitivity', 'retention time shift', 'noisy baseline', 'instrument communication fault'],
  IC:    ['IC suppressor failure', 'IC baseline rise', 'IC peak distortion', 'IC wrong retention time', 'noisy baseline', 'high backpressure', 'low sensitivity', 'no peak'],
  CE:    ['noisy baseline', 'baseline drift', 'poor resolution', 'loss of resolution', 'retention time shift', 'low sensitivity', 'no peak', 'peak broadening'],
  SFC:   ['retention time shift', 'peak tailing', 'peak broadening', 'high backpressure', 'noisy baseline', 'baseline drift', 'carryover', 'loss of resolution'],
  TGA:   ['unstable mass signal', 'TGA wrong decomposition temperature', 'TGA buoyancy artifact', 'TGA oxidation in inert atmosphere', 'poor TGA reproducibility'],
  DSC:   ['DSC noisy baseline', 'DSC Tg shift', 'DSC broad melting peak', 'poor enthalpy reproducibility', 'DSC baseline curvature'],
  FPLC:  ['high system pressure', 'FPLC poor peak resolution', 'FPLC air bubbles', 'FPLC UV baseline noise', 'FPLC gradient inaccuracy', 'oligonucleotide poor separation'],
  SPPS:  ['incomplete coupling', 'deletion sequences', 'aggregation during synthesis', 'incomplete Fmoc deprotection', 'cleavage and deprotection issues', 'racemization', 'instrument delivery failure', 'low crude purity', 'aspartimide formation', 'diketopiperazine formation'],
  XRD:   ['XRD peak shift', 'XRD broad peaks', 'XRD low intensity', 'XRD background noise', 'XRD preferred orientation', 'XRD split peaks', 'XRD detector malfunction', 'XRD sample preparation error', 'XRD calibration drift'],
  DLS:   ['DLS high PDI', 'DLS flat correlogram', 'DLS inconsistent size', 'DLS unreliable zeta potential', 'DLS dust contamination', 'DLS large particle artifact', 'DLS poor autocorrelation', 'DLS sample instability'],
  Titration: ['endpoint not detected', 'titration high drift', 'wrong titre volume', 'electrode sluggish response', 'titration carryover', 'reagent instability', 'burette calibration error', 'blank too high'],
  KF:    ['KF endpoint drift', 'KF low water recovery', 'KF negative reading', 'KF high blank', 'KF reagent decomposition', 'KF cell conditioning failure', 'KF coulometric error'],
  KFO:   ['KFO incomplete water transfer', 'KFO high blank', 'KFO sample charring', 'KFO low recovery', 'KFO condensation in transfer line', 'KFO oven temperature error'],
  // Physical Characterization (v3.0)
  CD:      ['CD high HT voltage', 'CD excessive noise below 200 nm', 'CD baseline drift', 'CD duplicate spectra differ', 'CD signal inversion', 'CD buffer incompatibility', 'CD lamp aging', 'CD thermal melt artifact'],
  SEM:     ['SEM blurry image', 'SEM charging artifacts', 'SEM poor contrast', 'SEM vacuum failure', 'SEM focus instability', 'SEM detector error', 'SEM stage movement failure', 'SEM beam alignment issue'],
  Sputter: ['Sputter non-uniform coating', 'Sputter arcing', 'Sputter poor film adhesion', 'Sputter excessive grain size', 'Sputter vacuum instability', 'Sputter plasma ignition failure'],
  BET:     ['BET negative constant', 'BET poor linearity', 'BET low reproducibility', 'BET degassing failure', 'BET leak', 'BET unexpected surface area', 'BET outlier adsorption points'],
  // Spectroscopy / NMR / SEC-MALS / TEM (v3.1)
  SECMALS: ['SECMALS light scattering noise', 'SECMALS incorrect molecular weight', 'SECMALS negative peaks', 'SECMALS RI baseline drift', 'SECMALS detector alignment error', 'SECMALS peak broadening', 'SECMALS aggregation artifact'],
  TEM:     ['TEM poor image quality', 'TEM sample drift', 'TEM charging', 'TEM beam damage', 'TEM vacuum failure', 'TEM astigmatism', 'TEM grid contamination', 'TEM ice contamination'],
  Raman:   ['Raman high fluorescence', 'Raman weak signal', 'Raman cosmic ray spike', 'Raman baseline drift', 'Raman sample burning', 'Raman peak shift', 'Raman wavelength calibration failure'],
  ssNMR:   ['ssNMR MAS failure', 'ssNMR rotor instability', 'ssNMR probe tuning failure', 'ssNMR low sensitivity', 'ssNMR peak broadening', 'ssNMR arcing', 'ssNMR probe overheating'],
  NMR:     ['NMR lock failure', 'NMR poor shimming', 'NMR broad peaks', 'NMR solvent suppression failure', 'NMR baseline distortion', 'NMR low sensitivity', 'NMR probe failure', 'NMR gradient failure'],
  // Preparative LC (v3.3)
  PrepLC:  ['PrepLC high backpressure', 'PrepLC poor peak resolution', 'PrepLC fraction contamination', 'PrepLC pump flow instability', 'PrepLC solvent recycling failure', 'PrepLC UV detector overload', 'PrepLC air bubble'],
};

const ALL_ISSUES = [...new Set(Object.values(ISSUES_BY_TECHNIQUE).flat())];

function getFilteredIssues(technique: string): string[] {
  return technique.trim() ? (ISSUES_BY_TECHNIQUE[technique] ?? ALL_ISSUES) : ALL_ISSUES;
}

const URGENCY_OPTIONS = [
  'routine — can wait a few days',
  'moderate — impacting analysis schedule',
  'urgent — samples held',
  'critical — production / QC stopped',
] as const;

const SYMPTOMS_BY_TECHNIQUE: Record<string, string[]> = {
  HPLC:  ['peak tailing', 'peak broadening', 'split peaks', 'retention time shift', 'baseline noise', 'baseline drift', 'pressure spike', 'high backpressure', 'loss of resolution', 'carryover', 'low signal', 'no signal'],
  UHPLC: ['peak tailing', 'peak broadening', 'split peaks', 'retention time shift', 'baseline noise', 'baseline drift', 'pressure spike', 'high backpressure', 'loss of resolution', 'carryover', 'low signal', 'no signal'],
  LCMS:  ['peak tailing', 'retention time shift', 'baseline noise', 'low signal', 'no signal', 'ion suppression', 'carryover', 'adduct peaks', 'instrument error code', 'communication error', 'module not responding', 'instrument offline'],
  GC:    ['ghost peaks', 'retention time shift', 'baseline noise', 'baseline drift', 'split peaks', 'loss of resolution', 'low signal', 'no signal', 'carryover'],
  GCMS:  ['ghost peaks', 'signal loss', 'ion suppression', 'retention time shift', 'low signal', 'adduct peaks', 'instrument error code', 'communication error', 'module not responding'],
  IC:    ['baseline rise', 'peak distortion', 'wrong retention time', 'suppressor failure', 'high backpressure', 'low signal', 'no signal'],
  CE:    ['baseline noise', 'baseline drift', 'poor resolution', 'low signal', 'retention time shift', 'peak broadening'],
  SFC:   ['peak tailing', 'peak broadening', 'high backpressure', 'baseline noise', 'retention time shift', 'carryover', 'loss of resolution'],
  TGA:   ['unstable signal', 'wrong decomposition temp', 'buoyancy artifact', 'oxidation artifact', 'poor reproducibility'],
  DSC:   ['noisy baseline', 'Tg shift', 'broad melting peak', 'poor enthalpy', 'baseline curvature', 'exotherm artifact'],
  FPLC:  ['high pressure', 'poor peak resolution', 'air bubbles', 'UV baseline noise', 'gradient inaccuracy', 'oligonucleotide separation issue'],
  SPPS:  ['deletion sequences', 'low crude purity', 'aggregated resin', 'incomplete coupling', 'Fmoc deprotection failure', 'racemization', 'cleavage failure', 'tBu adduct', 'Pbf adduct', 'missed delivery'],
  XRD:   ['peak shift', 'broad peaks', 'low intensity', 'high background', 'split peaks', 'weak signal', 'no diffraction', 'preferred orientation artifact'],
  DLS:   ['high PDI', 'flat correlogram', 'inconsistent size', 'no autocorrelation signal', 'large particle artifacts', 'unstable zeta potential', 'sample aggregation'],
  Titration: ['no endpoint detected', 'drifting endpoint', 'wrong volume', 'sluggish electrode', 'high blank', 'inconsistent results'],
  KF:    ['high drift', 'low water result', 'negative reading', 'no endpoint', 'unstable baseline', 'reagent failure'],
  KFO:   ['incomplete water transfer', 'high blank', 'charring', 'low recovery', 'condensation', 'temperature error'],
  // Physical Characterization (v3.0)
  CD:      ['HT voltage too high', 'excessive noise', 'baseline drift', 'signal inversion', 'poor reproducibility', 'buffer interference', 'lamp intensity low', 'thermal melt artifact'],
  SEM:     ['blurry image', 'charging artifacts', 'poor contrast', 'vacuum failure', 'focus drift', 'detector error', 'stage stuck', 'beam alignment issue'],
  Sputter: ['non-uniform coating', 'arcing', 'poor film adhesion', 'excessive grain size', 'vacuum instability', 'plasma not igniting'],
  BET:     ['negative BET constant', 'poor linearity', 'low reproducibility', 'degassing incomplete', 'gas leak', 'unexpected surface area', 'outlier adsorption points'],
  // Spectroscopy / NMR / SEC-MALS / TEM (v3.1)
  SECMALS: ['light scattering noise', 'incorrect molecular weight', 'negative peaks', 'RI baseline drift', 'detector alignment error', 'peak broadening', 'aggregation artifact'],
  TEM:     ['blurry image', 'sample drift', 'charging artifact', 'beam damage', 'vacuum failure', 'astigmatism', 'grid contamination', 'ice contamination'],
  Raman:   ['high fluorescence background', 'weak signal', 'cosmic ray spike', 'baseline drift', 'sample burning', 'peak shift', 'wavelength calibration failure'],
  ssNMR:   ['MAS spinning failure', 'rotor instability', 'probe tuning failure', 'low sensitivity', 'broad peaks', 'arcing', 'probe overheating'],
  NMR:     ['lock failure', 'poor shimming', 'broad peaks', 'solvent suppression failure', 'baseline distortion', 'low sensitivity', 'probe failure', 'gradient failure'],
  // Preparative LC (v3.3)
  PrepLC:  ['high backpressure', 'poor peak resolution', 'fraction contamination', 'pump flow instability', 'solvent recycling failure', 'UV detector overload', 'air bubbles in pump'],
};

const ALL_SYMPTOMS = ['peak tailing', 'peak broadening', 'split peaks', 'ghost peaks', 'retention time shift', 'baseline noise', 'baseline drift', 'pressure spike', 'high backpressure', 'loss of resolution', 'carryover', 'low signal', 'no signal', 'ion suppression'];

function getFilteredSymptoms(technique: string): string[] {
  return technique.trim() ? (SYMPTOMS_BY_TECHNIQUE[technique] ?? ALL_SYMPTOMS) : ALL_SYMPTOMS;
}

const CHECKED_BY_TECHNIQUE: Record<string, string[]> = {
  HPLC:  ['replaced column', 'replaced guard column', 'flushed mobile phase lines', 'checked connections and fittings', 'primed pump', 'cleaned injector', 'checked mobile phase composition', 'restarted instrument software'],
  UHPLC: ['replaced column', 'replaced guard column', 'flushed mobile phase lines', 'checked connections and fittings', 'primed pump', 'cleaned injector', 'checked mobile phase composition', 'restarted instrument software'],
  LCMS:  ['cleaned source/ion block', 'replaced column', 'flushed mobile phase lines', 'checked connections and fittings', 'primed pump', 'checked mobile phase composition', 'restarted instrument software', 'recalibrated mass', 'power cycled instrument', 'reseated USB/LAN cable', 'restarted MassHunter/data system', 'checked Windows Device Manager for USB errors'],
  GC:    ['replaced septa / liner', 'replaced column', 'cleaned injector', 'restarted instrument software', 'checked carrier gas flow', 'baked out column', 'checked split ratio', 'replaced inlet liner'],
  GCMS:  ['replaced septa / liner', 'cleaned ion source', 'replaced column', 'cleaned injector', 'restarted instrument software', 'tuned mass spectrometer', 'baked out column', 'power cycled instrument', 'reseated communication cable', 'restarted data system software'],
  IC:    ['replaced suppressor', 'replaced eluent', 'checked pump', 'replaced column', 'restarted instrument software', 'purged eluent lines', 'checked eluent concentration'],
  CE:    ['replaced capillary', 'flushed capillary', 'replaced buffer', 'cleaned electrodes', 'restarted instrument software', 'reconditioned capillary'],
  SFC:   ['replaced column', 'checked CO2 pressure', 'flushed co-solvent lines', 'checked connections', 'restarted instrument software', 'degassed mobile phase'],
  TGA:   ['calibrated temperature', 'calibrated mass', 'checked purge gas flow', 'cleaned furnace', 'replaced crucible', 'checked baseline', 'verified tare'],
  DSC:   ['calibrated temperature', 'calibrated enthalpy', 'checked purge gas flow', 'cleaned DSC cell', 'replaced pans', 'checked baseline', 'calibrated with indium'],
  FPLC:  ['cleaned column', 'regenerated column', 'replaced tubing', 'checked pump seals', 'degassed buffers', 'calibrated UV detector', 'checked column pressure limits'],
  SPPS:  ['double coupled residue', 'extended coupling time', 'replaced coupling reagent', 'switched to HATU/HOAt', 'added DMSO to solvent', 'used NMP instead of DMF', 're-cleaved with fresh TFA', 'recalibrated syringe pump', 'primed delivery lines', 'replaced resin'],
  XRD:   ['recalibrated 2θ zero offset', 'cleaned sample holder', 'verified sample preparation', 'realigned goniometer', 'replaced detector', 'checked X-ray tube current', 'verified sample height'],
  DLS:   ['cleaned cuvette', 'filtered sample through 0.2 µm', 'temperature equilibrated', 'replaced DTS1070 cell', 'centrifuged sample 2000g', 'diluted sample', 'checked laser alignment'],
  Titration: ['replaced pH/ISE electrode', 'recalibrated burette', 'replaced titrant reagent', 'cleaned electrode junction', 'recalibrated with buffer standard', 'checked for CO2 absorption'],
  KF:    ['reconditioned KF cell', 'replaced KF reagent', 'dried cell with blank titration', 'refreshed working medium', 'replaced electrode', 'checked for moisture ingress'],
  KFO:   ['cleaned transfer line', 'replaced septum/seal', 'recalibrated oven temperature', 'replaced drying tube', 'checked carrier gas flow', 'purged transfer lines'],
  // Physical Characterization (v3.0)
  CD:      ['checked nitrogen purge flow', 'replaced cuvette', 're-ran baseline correction', 'checked buffer blank', 'checked HT voltage limit', 'cleaned cuvette holder', 'restarted JASCO Spectra Manager'],
  SEM:     ['cleaned SEM chamber', 'reseated sample stub', 'applied sputter coating', 'checked vacuum status', 'realigned beam', 'replaced detector', 'restarted Phenom software'],
  Sputter: ['cleaned sputter chamber', 'replaced target material', 'checked argon gas supply', 'verified vacuum pump operation', 'cleaned substrate', 'replaced O-ring seals'],
  BET:     ['degassed sample at higher temperature', 'cleaned sample tube', 'checked nitrogen gas supply', 'leak tested manifold', 'replaced sample tube O-ring', 'restarted Gemini software', 'ran blank tube analysis'],
  // Spectroscopy / NMR / SEC-MALS / TEM (v3.1)
  SECMALS: ['adjusted inter-detector delay volumes', 'cleaned SEC columns', 'verified dn/dc value', 'recalibrated RI detector', 'replaced flow cell', 'filtered sample through 0.2 µm', 'restarted ASTRA or OmniSEC software'],
  TEM:     ['plasma-cleaned grid', 'prepared fresh negative stain', 'cleaned specimen holder', 'degassed column overnight', 'corrected astigmatism', 'lowered beam current', 'loaded fresh grid'],
  Raman:   ['adjusted laser power', 'replaced calibration standard', 're-calibrated wavenumber axis', 'cleaned sample stage', 'changed excitation wavelength', 'applied baseline correction', 'used cosmic ray filter'],
  ssNMR:   ['replaced rotor', 'retuned probe', 're-optimized MAS speed', 'recalibrated magic angle', 'reduced RF power', 'replaced probe', 'cooled probe with nitrogen'],
  NMR:     ['re-locked on deuterium solvent', 'reshimmed manually', 'retuned probe', 'increased NS (number of scans)', 'optimized solvent suppression parameters', 'replaced NMR tube', 'recalibrated gradient coil'],
  // Preparative LC (v3.3)
  PrepLC:  ['replaced prep column', 'cleaned guard column', 'flushed pump heads', 'checked pump seals and pistons', 'replaced check valves', 'degassed solvents', 're-optimised gradient', 'cleaned UV flow cell', 'checked fraction collector tubing'],
};

const ALL_CHECKED = ['replaced column', 'replaced guard column', 'cleaned source/ion block', 'flushed mobile phase lines', 'checked connections and fittings', 'primed pump', 'replaced septa / liner', 'cleaned injector', 'checked mobile phase composition', 'restarted instrument software'];

function getFilteredChecked(technique: string): string[] {
  return technique.trim() ? (CHECKED_BY_TECHNIQUE[technique] ?? ALL_CHECKED) : ALL_CHECKED;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ApiResult {
  ranked_answer: RankedAnswer;
  ai_assisted: boolean;
  modes: {
    concise:  TextOutput;
    standard: TextOutput;
    deep:     TextOutput;
    manager:  ManagerOutput;
  };
}

// ── Shared style tokens ───────────────────────────────────────────────────────

const SECTION: React.CSSProperties = {
  background: '#fff',
  border: '1px solid var(--color-slate-200)',
  borderRadius: '12px',
  padding: '1.375rem 1.5rem 1.5rem',
  marginBottom: '1rem',
  boxShadow: '0 1px 3px rgba(15,23,42,.04)',
};

const LABEL: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-display)',
  fontSize: '0.8125rem',
  fontWeight: 700,
  color: 'var(--color-slate-600)',
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  marginBottom: '0.4rem',
};

const FIELD_GAP: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
};

const ROW: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '1rem',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StepHeader({ num, title, optional }: { num: number; title: string; optional?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.125rem' }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '1.625rem', height: '1.625rem', borderRadius: '50%',
        background: 'var(--color-teal-600)', color: '#fff',
        fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700,
        flexShrink: 0,
      }}>
        {num}
      </span>
      <span style={{
        fontFamily: 'var(--font-display)', fontSize: '0.9375rem', fontWeight: 700,
        color: 'var(--color-navy-900)', letterSpacing: '-0.01em',
      }}>
        {title}
      </span>
      {optional && (
        <span style={{
          fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-slate-400)',
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          optional
        </span>
      )}
    </div>
  );
}

function Field({
  label, required, hint, children,
}: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label style={LABEL}>
        {label}
        {required && <span style={{ color: 'var(--color-teal-500)', marginLeft: '2px' }}>*</span>}
      </label>
      {children}
      {hint && (
        <div style={{ marginTop: '0.35rem', fontSize: '0.8rem', color: 'var(--color-slate-400)', lineHeight: 1.4 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

/**
 * Chips that append a suggestion to a textarea when clicked.
 */
function QuickChips({
  chips, current, onAppend,
}: {
  chips: string[]; current: string; onAppend: (v: string) => void;
}) {
  const existing = new Set(
    current.split('\n').map(s => s.trim().toLowerCase()).filter(Boolean),
  );
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.5rem' }}>
      {chips.map(chip => {
        const used = existing.has(chip.toLowerCase());
        return (
          <button
            key={chip}
            type="button"
            onClick={() => {
              if (!used) onAppend(current ? `${current}\n${chip}` : chip);
            }}
            style={{
              padding: '0.275rem 0.625rem',
              borderRadius: '999px',
              border: `1px solid ${used ? 'var(--color-teal-300)' : 'var(--color-slate-200)'}`,
              background: used ? 'var(--color-teal-50)' : '#fff',
              color: used ? 'var(--color-teal-600)' : 'var(--color-slate-600)',
              fontSize: '0.78rem',
              fontWeight: 500,
              cursor: used ? 'default' : 'pointer',
              transition: 'all .12s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {used && (
              <span style={{ marginRight: '0.25rem', fontSize: '0.7rem' }}>✓</span>
            )}
            {chip}
          </button>
        );
      })}
      <span style={{ fontSize: '0.76rem', color: 'var(--color-slate-400)', alignSelf: 'center', marginLeft: '0.25rem' }}>
        or type below
      </span>
    </div>
  );
}

function InputField({
  value, onChange, placeholder,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        padding: '0.6875rem 0.9375rem',
        background: 'var(--color-slate-50)',
        border: '1.5px solid var(--color-slate-200)',
        borderRadius: '8px',
        fontFamily: 'var(--font-sans)',
        fontSize: '0.9375rem',
        color: 'var(--color-navy-900)',
        outline: 'none',
        transition: 'border-color .15s ease, box-shadow .15s ease, background .15s ease',
      }}
      onFocus={e => {
        e.currentTarget.style.borderColor = 'var(--color-teal-500)';
        e.currentTarget.style.boxShadow   = '0 0 0 3px rgba(20,184,166,.15)';
        e.currentTarget.style.background  = '#fff';
      }}
      onBlur={e => {
        e.currentTarget.style.borderColor = 'var(--color-slate-200)';
        e.currentTarget.style.boxShadow   = 'none';
        e.currentTarget.style.background  = 'var(--color-slate-50)';
      }}
    />
  );
}

function TextareaField({
  value, onChange, placeholder, rows = 3,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        padding: '0.6875rem 0.9375rem',
        background: 'var(--color-slate-50)',
        border: '1.5px solid var(--color-slate-200)',
        borderRadius: '8px',
        fontFamily: 'var(--font-sans)',
        fontSize: '0.9375rem',
        color: 'var(--color-navy-900)',
        outline: 'none',
        resize: 'vertical',
        lineHeight: 1.6,
        transition: 'border-color .15s ease, box-shadow .15s ease, background .15s ease',
        minHeight: `${rows * 1.6 + 1.4}rem`,
      }}
      onFocus={e => {
        e.currentTarget.style.borderColor = 'var(--color-teal-500)';
        e.currentTarget.style.boxShadow   = '0 0 0 3px rgba(20,184,166,.15)';
        e.currentTarget.style.background  = '#fff';
      }}
      onBlur={e => {
        e.currentTarget.style.borderColor = 'var(--color-slate-200)';
        e.currentTarget.style.boxShadow   = 'none';
        e.currentTarget.style.background  = 'var(--color-slate-50)';
      }}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function QueryForm() {
  const [technique,        setTechnique]        = useState('');
  const [vendor,           setVendor]           = useState('');
  const [model,            setModel]            = useState('');
  const [issueCategory,    setIssueCategory]    = useState('');
  const [urgency,          setUrgency]          = useState('');
  const [problemDesc,      setProblemDesc]      = useState('');
  const [symptoms,         setSymptoms]         = useState('');
  const [methodConditions, setMethodConditions] = useState('');
  const [alreadyChecked,   setAlreadyChecked]   = useState('');
  // Extended context fields (V2)
  const [analyte,          setAnalyte]          = useState('');
  const [sampleMatrix,     setSampleMatrix]     = useState('');
  const [column,           setColumn]           = useState('');
  const [mobilephase,      setMobilephase]      = useState('');
  const [flowRate,         setFlowRate]         = useState('');
  const [injectionVolume,  setInjectionVolume]  = useState('');
  const [gradient,         setGradient]         = useState('');
  const [retentionTime,    setRetentionTime]    = useState('');
  const [ionizationMode,   setIonizationMode]   = useState('');
  const [sourceParams,     setSourceParams]     = useState('');
  const [acquisitionMode,  setAcquisitionMode]  = useState('');
  const [recentMaint,      setRecentMaint]      = useState('');
  const [qcResults,        setQcResults]        = useState('');
  const [expectedResult,   setExpectedResult]   = useState('');
  const [showAdvanced,     setShowAdvanced]     = useState(false);
  const [loading,          setLoading]          = useState(false);
  const [result,           setResult]           = useState<ApiResult | null>(null);
  const [error,            setError]            = useState<string | null>(null);
  const [mode,             setMode]             = useState<DisplayMode>('standard');
  const [showModal,        setShowModal]        = useState(false);
  const [pendingReportId,  setPendingReportId]  = useState<string | null>(null);
  const [emailTSOpen,      setEmailTSOpen]      = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Derived filtered lists
  const filteredVendors  = getFilteredVendors(technique);
  const filteredModels   = getFilteredModels(technique, vendor);
  const filteredIssues   = getFilteredIssues(technique);
  const filteredSymptoms = getFilteredSymptoms(technique);
  const filteredChecked  = getFilteredChecked(technique);

  // Keyboard shortcuts: Ctrl+Enter = submit, Ctrl+1-4 = switch mode
  const handleExportText = useCallback(() => {
    if (result) exportAsText(result.ranked_answer, result.modes, technique);
  }, [result, technique]);
  const handleExportCSV = useCallback(() => {
    if (result) exportAsCSV(result.ranked_answer, technique);
  }, [result, technique]);
  const handlePrintTS = useCallback(() => { window.print(); }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'Enter' && formRef.current) {
          e.preventDefault();
          formRef.current.requestSubmit();
        }
        const modes: DisplayMode[] = ['concise', 'standard', 'deep', 'manager'];
        const modeIdx = parseInt(e.key) - 1;
        if (modeIdx >= 0 && modeIdx < modes.length && result) {
          e.preventDefault();
          setMode(modes[modeIdx]);
        }
      }
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && target.tagName !== 'SELECT') {
          e.preventDefault();
          const firstInput = formRef.current?.querySelector('input');
          firstInput?.focus();
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [result]);

  // Focus management: scroll to results when they appear
  useEffect(() => {
    if (result && resultsRef.current) {
      resultsRef.current.focus({ preventScroll: false });
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [result]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!technique.trim()) { setError('Please select or enter a technique.'); return; }
    if (!problemDesc.trim()) { setError('Problem description is required.'); return; }

    setLoading(true);
    setError(null);
    setResult(null);

    const symptom_description = [problemDesc.trim(), symptoms.trim()]
      .filter(Boolean).join('\n');

    const already_checked = alreadyChecked
      .split('\n').map(s => s.trim()).filter(Boolean);

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          technique:          technique.trim() as Technique,
          vendor:             vendor.trim()           || null,
          model:              model.trim()            || null,
          issue_category:     issueCategory           || null,
          urgency:            urgency                 || null,
          symptom_description,
          method_conditions:  methodConditions.trim() || null,
          already_checked,
          // Extended context (V2)
          analyte:            analyte.trim()           || null,
          sample_matrix:      sampleMatrix.trim()      || null,
          column:             column.trim()            || null,
          mobile_phase:       mobilephase.trim()       || null,
          flow_rate:          flowRate.trim()           || null,
          injection_volume:   injectionVolume.trim()   || null,
          gradient:           gradient.trim()           || null,
          retention_time:     retentionTime.trim()     || null,
          ionization_mode:    ionizationMode.trim()    || null,
          source_params:      sourceParams.trim()      || null,
          acquisition_mode:   acquisitionMode.trim()   || null,
          recent_maintenance: recentMaint.trim()       || null,
          qc_results:         qcResults.trim()         || null,
          expected_result:    expectedResult.trim()    || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      const data = await res.json() as ApiResult;
      setResult(data);
      setMode('standard');

      // Auto-create troubleshooting report in localStorage
      const reportId = crypto.randomUUID();
      const report: LabReport = {
        id: reportId,
        created_at: new Date().toISOString(),
        technique: technique.trim(),
        vendor: vendor.trim() || null,
        model: model.trim() || null,
        issue_category: issueCategory || null,
        symptom_description,
        confidence: data.ranked_answer?.confidence ?? 0,
        ai_assisted: data.ai_assisted ?? false,
        status: 'pending',
        resolution_note: null,
        resolved_at: null,
      };
      addReport(report);
      setPendingReportId(reportId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form ref={formRef} onSubmit={handleSubmit} noValidate>

        {/* ── Step 1: Instrument ─────────────────────────────────────────── */}
        <div style={SECTION}>
          <StepHeader num={1} title="Instrument" />
          <div style={ROW}>
            <Field label="Technique" required>
              <ComboInput
                value={technique}
                onChange={v => { setTechnique(v); setVendor(''); setModel(''); setIssueCategory(''); }}
                options={TECHNIQUE_OPTIONS}
                placeholder="Select or type technique…"
                required
              />
            </Field>
            <Field label="Vendor">
              <ComboInput
                value={vendor}
                onChange={v => { setVendor(v); setModel(''); }}
                options={filteredVendors}
                placeholder={technique ? 'Select or type vendor…' : 'Select technique first…'}
              />
            </Field>
            <Field label="Instrument Model">
              <ComboInput
                value={model}
                onChange={setModel}
                options={filteredModels}
                placeholder={technique || vendor ? 'Select or type model…' : 'Select technique or vendor first…'}
              />
            </Field>
          </div>

          {/* Cleaning Procedure — visible when technique is selected */}
          {technique.trim() && (
            <div style={{ marginTop: '0.75rem' }}>
              <CleaningProcedureButton
                technique={technique}
                vendor={vendor}
                model={model}
              />
            </div>
          )}
        </div>

        {/* ── Step 2: Problem ───────────────────────────────────────────── */}
        <div style={SECTION}>
          <StepHeader num={2} title="Problem" />
          <div style={FIELD_GAP}>

            <div style={ROW}>
              <Field label="Issue Type">
                <ComboInput
                  value={issueCategory}
                  onChange={setIssueCategory}
                  options={filteredIssues}
                  placeholder="Select or describe issue type…"
                />
              </Field>
              <Field label="Urgency">
                <ComboInput
                  value={urgency}
                  onChange={setUrgency}
                  options={URGENCY_OPTIONS}
                  placeholder="Select or describe urgency…"
                />
              </Field>
            </div>

            <Field label="Problem Description" required>
              <TextareaField
                value={problemDesc}
                onChange={setProblemDesc}
                placeholder="Describe the issue in detail — when it started, what changed, what you are observing…"
                rows={3}
              />
            </Field>

            <Field label="Observed Symptoms">
              <QuickChips
                chips={filteredSymptoms}
                current={symptoms}
                onAppend={setSymptoms}
              />
              <TextareaField
                value={symptoms}
                onChange={setSymptoms}
                placeholder="Add or describe additional symptoms…"
                rows={2}
              />
            </Field>

          </div>
        </div>

        {/* ── Step 3: Context ───────────────────────────────────────────── */}
        <div style={{ ...SECTION, marginBottom: '1.25rem' }}>
          <StepHeader num={3} title="Context" optional />
          <div style={FIELD_GAP}>

            <Field label="Method Conditions">
              <TextareaField
                value={methodConditions}
                onChange={setMethodConditions}
                placeholder="e.g. C18 column, 60 °C oven, gradient 5 → 95 % ACN in 8 min, flow 0.4 mL/min"
                rows={2}
              />
            </Field>

            <Field
              label="Already Checked / Tried"
              hint="One step per line — these will be deprioritised in the answer."
            >
              <QuickChips
                chips={filteredChecked}
                current={alreadyChecked}
                onAppend={setAlreadyChecked}
              />
              <TextareaField
                value={alreadyChecked}
                onChange={setAlreadyChecked}
                placeholder={`One step per line, e.g.\nreplaced column\ncleaned source`}
                rows={2}
              />
            </Field>

            {/* ── Advanced Context (V2) ─────────────────────────────────── */}
            <div style={{ marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.375rem',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-display)', fontSize: '0.8125rem', fontWeight: 600,
                  color: 'var(--color-teal-600)', padding: '0.375rem 0',
                }}
              >
                <span style={{ transform: showAdvanced ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>▸</span>
                Advanced Context (optional — improves accuracy)
              </button>

              {showAdvanced && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '0.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <Field label="Analyte">
                      <InputField value={analyte} onChange={setAnalyte} placeholder="e.g. caffeine, ibuprofen" />
                    </Field>
                    <Field label="Sample Matrix">
                      <InputField value={sampleMatrix} onChange={setSampleMatrix} placeholder="e.g. plasma, soil extract" />
                    </Field>
                    <Field label="Column">
                      <InputField value={column} onChange={setColumn} placeholder="e.g. C18 150×4.6mm 3.5µm" />
                    </Field>
                    <Field label="Mobile Phase">
                      <InputField value={mobilephase} onChange={setMobilephase} placeholder="e.g. 0.1% FA in water / ACN" />
                    </Field>
                    <Field label="Flow Rate">
                      <InputField value={flowRate} onChange={setFlowRate} placeholder="e.g. 0.4 mL/min" />
                    </Field>
                    <Field label="Injection Volume">
                      <InputField value={injectionVolume} onChange={setInjectionVolume} placeholder="e.g. 5 µL" />
                    </Field>
                    <Field label="Gradient Program">
                      <InputField value={gradient} onChange={setGradient} placeholder="e.g. 5→95% B in 8 min" />
                    </Field>
                    <Field label="Retention Time">
                      <InputField value={retentionTime} onChange={setRetentionTime} placeholder="e.g. expected 4.2 min, observed 3.8 min" />
                    </Field>
                    <Field label="Ionization Mode">
                      <InputField value={ionizationMode} onChange={setIonizationMode} placeholder="e.g. ESI+, APCI-" />
                    </Field>
                    <Field label="Source Parameters">
                      <InputField value={sourceParams} onChange={setSourceParams} placeholder="e.g. gas temp 300°C, nebulizer 45 psi" />
                    </Field>
                    <Field label="Acquisition Mode">
                      <InputField value={acquisitionMode} onChange={setAcquisitionMode} placeholder="e.g. SIM m/z 195, scan 100-1000" />
                    </Field>
                    <Field label="Expected Result">
                      <InputField value={expectedResult} onChange={setExpectedResult} placeholder="e.g. S/N > 10, RT 4.2±0.1 min" />
                    </Field>
                  </div>
                  <Field label="Recent Maintenance">
                    <InputField value={recentMaint} onChange={setRecentMaint} placeholder="e.g. replaced ESI capillary last week" />
                  </Field>
                  <Field label="QC / System Suitability Results">
                    <InputField value={qcResults} onChange={setQcResults} placeholder="e.g. SST passed, RSD 1.2%, tailing 1.1" />
                  </Field>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: '0.875rem 1rem',
            background: 'rgba(220,38,38,.07)',
            border: '1px solid rgba(220,38,38,.22)',
            borderRadius: '8px',
            color: '#b91c1c',
            fontSize: '0.9rem',
            fontWeight: 500,
            marginBottom: '1rem',
            lineHeight: 1.5,
          }}>
            {error}
          </div>
        )}

        {/* Submit */}
        <SubmitButton loading={loading} />

        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </form>

      {/* ── Results ───────────────────────────────────────────────────────── */}
      {showModal && pendingReportId && (
        <ReportModal
          reportId={pendingReportId}
          onClose={() => setShowModal(false)}
          onSave={() => setShowModal(false)}
        />
      )}

      {/* Loading skeleton */}
      {loading && (
        <div style={{ marginTop: '2.75rem' }} aria-live="polite" aria-busy="true">
          <div className="skeleton" style={{ height: '3rem', marginBottom: '1rem' }} />
          <div className="skeleton" style={{ height: '1.5rem', width: '60%', marginBottom: '0.75rem' }} />
          <div className="skeleton" style={{ height: '12rem', marginBottom: '1rem' }} />
          <div className="skeleton" style={{ height: '1.5rem', width: '40%' }} />
        </div>
      )}

      {result && (
        <div
          ref={resultsRef}
          tabIndex={-1}
          role="region"
          aria-label="Troubleshooting results"
          aria-live="polite"
          data-troubleshooting-result
          style={{ marginTop: '2.75rem', outline: 'none' }}
          className="fade-in"
        >
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem',
          }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--color-slate-200)' }} />
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.75rem', fontWeight: 700,
              color: 'var(--color-slate-400)',
              textTransform: 'uppercase', letterSpacing: '0.1em',
            }}>
              Diagnosis
            </span>
            <div style={{ flex: 1, height: '1px', background: 'var(--color-slate-200)' }} />
          </div>
          <ModeSwitcher selected={mode} onChange={setMode} />
          <AnswerDisplay
            modes={result.modes}
            confidence={result.ranked_answer.confidence}
            selected={mode}
          />
          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }} data-no-print>
            <button
              type="button"
              onClick={handlePrintTS}
              className="lab-btn lab-btn-secondary lab-btn-sm"
              title="Print troubleshooting report"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'text-bottom', marginRight: '0.25rem' }}><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Print
            </button>
            <button
              type="button"
              onClick={() => setEmailTSOpen(true)}
              className="lab-btn lab-btn-secondary lab-btn-sm"
              title="Send troubleshooting report by email"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'text-bottom', marginRight: '0.25rem' }}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              Email
            </button>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="lab-btn lab-btn-secondary lab-btn-sm"
            >
              Update Outcome
            </button>
            <button
              type="button"
              onClick={handleExportText}
              className="lab-btn lab-btn-secondary lab-btn-sm"
              title="Export as text file"
            >
              Export TXT
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="lab-btn lab-btn-secondary lab-btn-sm"
              title="Export as CSV"
            >
              Export CSV
            </button>
          </div>
          <div style={{ marginTop: '0.75rem', textAlign: 'center' }} data-no-print>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)' }}>
              Ctrl+1-4: switch views | Ctrl+Enter: submit | /: focus search
            </span>
          </div>
        </div>
      )}

      {/* Email troubleshooting dialog */}
      {emailTSOpen && result && (
        <EmailTroubleshootingDialog
          answer={result.ranked_answer}
          technique={technique}
          vendor={vendor}
          model={model}
          issueCategory={issueCategory}
          onClose={() => setEmailTSOpen(false)}
        />
      )}
    </>
  );
}

// ── Submit button ─────────────────────────────────────────────────────────────

function SubmitButton({ loading }: { loading: boolean }) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  return (
    <button
      type="submit"
      disabled={loading}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        width: '100%',
        padding: '0.9375rem 1.5rem',
        background: loading
          ? 'var(--color-slate-300)'
          : hovered
          ? 'var(--color-teal-700)'
          : 'var(--color-teal-600)',
        color: '#fff',
        border: 'none',
        borderRadius: '10px',
        fontFamily: 'var(--font-display)',
        fontSize: '1rem',
        fontWeight: 700,
        letterSpacing: '-0.01em',
        cursor: loading ? 'not-allowed' : 'pointer',
        transform: pressed && !loading ? 'scale(0.987)' : 'scale(1)',
        transition: 'background .15s ease, transform .1s ease, box-shadow .15s ease',
        boxShadow: hovered && !loading
          ? '0 4px 16px rgba(15,145,136,.35)'
          : '0 1px 3px rgba(15,145,136,.2)',
      }}
    >
      {loading ? (
        <>
          <span style={{
            width: '15px', height: '15px',
            border: '2px solid rgba(255,255,255,.3)',
            borderTopColor: '#fff',
            borderRadius: '50%',
            animation: 'spin .7s linear infinite',
            display: 'inline-block',
            flexShrink: 0,
          }} />
          Analyzing…
        </>
      ) : (
        <>
          <svg width="17" height="17" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M5.5 6.5C5.5 5.12 6.62 4 8 4s2.5 1.12 2.5 2.5C10.5 8 9 8.5 8 9.5"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="8" cy="12" r=".75" fill="currentColor"/>
          </svg>
          <span style={{ color: '#f97316' }}>Get Troubleshooting Answer</span>
        </>
      )}
    </button>
  );
}
