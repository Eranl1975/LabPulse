// Maps every issue category (from project-spec) to detection keywords (lowercase).
// Detection: count keyword hits; highest count wins. Ties are unresolved (first wins).

const ISSUE_KEYWORDS: Record<string, string[]> = {
  'retention time shift':          ['retention', 'rt shift', 'earlier elution', 'later elution', 'elution time'],
  'peak tailing':                  ['tailing', 'tail', 'asymmetry', 'asymmetric peak', 'tailing factor'],
  'peak broadening':               ['broadening', 'broad peak', 'wide peak', 'plate count', 'efficiency loss'],
  'low sensitivity':               ['low sensitivity', 'low signal', 'low response', 'weak signal', 'detection limit'],
  'no peak':                       ['no peak', 'missing peak', 'absent peak', 'not detected', 'no signal'],
  'carryover':                     ['carryover', 'carry-over', 'memory effect', 'residual signal'],
  'noisy baseline':                ['noisy baseline', 'baseline noise', 'baseline drift', 'baseline instability'],
  'high backpressure':             ['high pressure', 'backpressure', 'back pressure', 'clogged', 'blocked column', 'pressure alarm', 'pressure rise'],
  'LCMS source contamination':     ['source contamination', 'spray shield', 'ms sensitivity loss', 'source dirty'],
  'adduct formation':              ['adduct', 'sodium adduct', 'ammonium adduct', 'potassium adduct', 'adduct peak', '[m+na]', '[m+k]', '[m+nh4]', 'formate adduct', 'unexpected mass', 'wrong m/z', 'alkali adduct', 'adduct ion'],
  'instrument communication fault': ['ee(65', 'ee(66', 'ee(64', 'ee(', 'error event', 'communication fault', 'communication error', 'module communication', 'instrument communication', 'network timeout', 'connection timeout', 'usb communication', 'instrument not responding', 'instrument offline', 'masshunter not responding', 'msd not responding', 'firmware hang', 'can bus error', 'module error code', 'instrument error code', 'data system communication', 'lan communication', 'controller communication', 'module not found', 'instrument unreachable'],
  'GC ghost peaks':                ['ghost peak', 'phantom peak', 'extra peak blank', 'blank injection peak'],
  'poor GC peak shape':            ['gc peak shape', 'gc fronting', 'gc split peak', 'gc tailing'],
  'GCMS signal loss':              ['gcms signal', 'gc-ms response', 'gcms sensitivity', 'ms detector loss', 'gc ms signal', 'detector response loss'],
  'GC oven cooling failure':       ['oven not cooling', 'oven cooling', 'oven fan', 'cooling failure', 'not cool down', 'slow cooling', 'oven temperature high', 'oven stays hot', 'oven remains hot', 'oven won', 'cool down'],
  'GC oven temperature instability': ['oven overshoot', 'temperature oscillat', 'oven instab', 'oven not hold', 'temperature hold', 'oven control', 'oven temperature drift', 'temperature fluctuat', 'oven setpoint'],
  'GC inlet contamination':        ['inlet liner', 'liner contamin', 'inlet dirty', 'inlet contamin', 'liner replace', 'septum bleed'],
  'ion suppression':               ['ion suppression', 'matrix suppression', 'signal suppression', 'matrix effect', 'matrix interfer', 'co-eluting matrix'],
  'UHPLC high backpressure':       ['uhplc pressure', 'uplc pressure', 'acquity pressure', 'ultra high pressure', 'sub-2 micron column pressure'],
  'IC baseline drift':             ['ion chromatography baseline', 'suppressor', 'conductivity baseline', 'ic baseline', 'eluent generator'],
  'TGA unexpected weight loss':    ['unexpected weight loss', 'spurious weight', 'buoyancy', 'tga artefact', 'moisture tga', 'weight step tga'],
  'XRD peak shift':                ['xrd peak shift', '2theta', 'peak position', 'lattice parameter', 'sample height xrd', 'zero offset', 'd-spacing', 'diffraction peak shift', 'goniometer offset'],
  'XRD broad peaks':               ['xrd broad', 'xrd peak width', 'fwhm', 'crystallite size', 'poor resolution xrd', 'peak broadening xrd', 'scherrer', 'xrd resolution'],
  'XRD low intensity':             ['xrd low intensity', 'xrd weak signal', 'xrd signal loss', 'x-ray signal', 'diffraction intensity', 'preferred orientation', 'xrd tube'],
  'DLS high PDI':                  ['high pdi', 'polydisperse', 'polydispersity', 'dls pdi', 'size distribution broad', 'dls broad', 'multimodal dls'],
  'DLS flat correlogram':          ['flat correlogram', 'no autocorrelation', 'correlogram', 'dls no signal', 'dls flat', 'acf flat', 'no dls signal', 'count rate low'],
  'DLS unreliable zeta potential': ['zeta potential', 'unreliable zeta', 'zeta measurement', 'zeta instab', 'zeta negative', 'zeta reversal'],
  'Titration endpoint failure':    ['endpoint not detected', 'missed endpoint', 'no endpoint', 'titration endpoint', 'titrator endpoint', 'ep not found'],
  'titration high drift':          ['blank drift', 'high drift titrat', 'titration drift', 'electrode drift', 'co2 titrat', 'drift before titrat'],
  'wrong titre volume':            ['wrong titre', 'titre volume', 'burette calibrat', 'titre too high', 'titre too low', 'incorrect titre'],
  'KF endpoint drift':             ['kf drift', 'karl fischer drift', 'kf endpoint drift', 'high drift kf', 'kf cell conditioning', 'moisture ingress kf'],
  'KF low water recovery':         ['low water recovery', 'kf low result', 'incomplete kf', 'water recovery kf', 'kf underestimate'],
  'KF coulometric error':          ['negative water', 'kf negative', 'kf coulometric', 'coulometric error', 'anolyte', 'generator electrode kf'],
  'KFO incomplete water transfer': ['incomplete water transfer', 'kfo transfer', 'oven sample processor', 'incomplete water evolution', 'kf oven low', 'oven kf result low'],
  'KFO high blank':                ['kfo blank', 'oven blank high', 'transfer line moisture', 'kf oven blank', 'high blank kfo'],
  'KFO sample charring':           ['sample char', 'charring', 'kf oven decomposition', 'decomposition kf oven', 'kfo char', 'oven temperature too high kf'],

  // ── Circular Dichroism (CD) ────────────────────────────────────────────────
  'CD high HT voltage':            ['ht voltage', 'high ht', 'ht too high', 'dynode voltage', 'cd ht', 'photomultiplier', 'pmt voltage', 'absorbance too high cd', 'cd detector saturation'],
  'CD noise below 200 nm':         ['cd noise', 'noise below 200', 'far-uv noise', 'cd signal noise', 'noisy cd spectrum', 'cd baseline noise', 'uv cutoff cd', 'nitrogen purge', 'oxygen absorption cd'],
  'CD baseline drift':             ['cd baseline', 'cd drift', 'cd baseline drift', 'circular dichroism baseline', 'cd signal drift', 'lamp drift cd', 'thermal drift cd'],
  'CD duplicate spectra differ':   ['cd reproducibility', 'cd spectra differ', 'duplicate cd', 'cd inconsistent', 'cd variability', 'cd repeat measurement', 'cd poor reproducibility'],
  'CD signal inversion':           ['signal inversion cd', 'cd inverted', 'inverted spectrum cd', 'flipped spectrum cd', 'cd artifact inversion', 'negative band positive cd'],
  'CD buffer incompatibility':     ['cd buffer', 'buffer absorb cd', 'buffer cutoff cd', 'incompatible buffer cd', 'high absorbance buffer', 'dtt cd', 'dithiothreitol cd', 'glycerol cd'],
  'CD lamp aging':                 ['cd lamp', 'lamp aging', 'lamp hours cd', 'lamp output low cd', 'xenon lamp cd', 'lamp replacement cd', 'cd lamp lifetime'],
  'CD thermal melt artifact':      ['cd melting', 'thermal melt cd', 'cd denaturation', 'cd temperature scan', 'tm cd', 'cd melting curve', 'thermal cd artifact', 'reversible denaturation cd'],

  // ── Desktop SEM (Scanning Electron Microscopy) ────────────────────────────
  'SEM blurry image':              ['sem blur', 'blurry sem', 'sem out of focus', 'sem focus', 'sem resolution poor', 'sem image blurry', 'sem sharpness', 'sem focal length'],
  'SEM charging artifacts':        ['sem charging', 'charging artifact', 'sem charge', 'sem bright artifact', 'charging sem', 'bright patches sem', 'sem non-conductive sample', 'sample charging sem'],
  'SEM poor contrast':             ['sem contrast', 'poor sem contrast', 'sem low contrast', 'sem bse contrast', 'backscatter contrast', 'sem image grey', 'sem flat image'],
  'SEM vacuum failure':            ['sem vacuum', 'vacuum failure sem', 'sem pressure', 'sem vacuum leak', 'sem evacuation', 'sem pump', 'vacuum not achieved sem', 'sem turbo pump'],
  'SEM focus instability':         ['sem focus drift', 'sem focus unstable', 'sem beam drift', 'sem stigmation', 'astigmatism sem', 'sem image drift', 'sem dynamic focus'],
  'SEM detector error':            ['sem detector', 'bse detector', 'sed detector', 'sem detector failure', 'sem signal loss', 'sem no image', 'sem detector noise'],
  'SEM stage movement failure':    ['sem stage', 'stage movement sem', 'sem stage error', 'sem stage stuck', 'sem navigation', 'sem coordinate sem', 'stage positioning sem'],
  'SEM beam alignment':            ['sem alignment', 'sem beam align', 'sem aperture', 'sem gun alignment', 'electron beam alignment', 'sem column alignment'],

  // ── SEM Sputter Coater ────────────────────────────────────────────────────
  'Sputter non-uniform coating':   ['non-uniform coat', 'uneven coating', 'sputter uniformity', 'coating uniformity', 'patchy coating', 'sputter distribution', 'non-uniform sputter'],
  'Sputter arcing':                ['sputter arc', 'arcing sputter', 'plasma arc', 'arc discharge sputter', 'arc event sputter', 'sputter sparking'],
  'Sputter poor film adhesion':    ['poor adhesion sputter', 'film adhesion', 'coating adhesion', 'sputter adhesion', 'film peeling sputter', 'delamination sputter'],
  'Sputter excessive grain size':  ['grain size sputter', 'large grain', 'grain coarsening', 'sputter grain', 'coarse coating', 'grain growth sputter'],
  'Sputter vacuum instability':    ['sputter vacuum', 'sputter pressure', 'vacuum instability sputter', 'sputter chamber pressure', 'argon pressure sputter', 'sputter pump', 'sputter leak'],
  'Sputter plasma ignition failure': ['plasma ignition', 'sputter ignition', 'plasma not igniting', 'plasma fail', 'sputter plasma', 'glow discharge fail', 'plasma strike fail'],

  // ── BET Surface Area and Porosity ─────────────────────────────────────────
  'BET negative constant':         ['negative bet', 'bet constant negative', 'negative c constant', 'bet c value', 'negative intercept bet', 'bet linearization negative'],
  'BET poor linearity':            ['bet linearity', 'poor linearity bet', 'bet r squared', 'bet non-linear', 'bet correlation', 'bet plot linearity', 'bet linear range'],
  'BET low reproducibility':       ['bet reproducibility', 'bet repeat', 'inconsistent bet', 'bet variability', 'bet poor repeat', 'surface area reproducibility', 'bet outlier'],
  'BET degassing failure':         ['bet degas', 'degassing failure', 'degas bet', 'insufficient degassing', 'degas temperature bet', 'outgassing bet', 'bet sample prep'],
  'BET leak detection':            ['bet leak', 'gemini leak', 'bet gas leak', 'nitrogen leak bet', 'bet pressure drop', 'bet manifold leak'],
  'BET unexpected surface area':   ['unexpected surface area', 'bet surface area wrong', 'bet result wrong', 'bet low result', 'bet high result', 'surface area anomaly', 'bet unexpected'],
  'BET outlier adsorption':        ['bet outlier', 'adsorption outlier', 'bet point outlier', 'adsorption isotherm anomaly', 'bet data point', 'bet isotherm anomaly'],

  // ── SEC-MALS ──────────────────────────────────────────────────────────────
  'SECMALS light scattering noise':   ['mals noise', 'light scattering noise', 'secmals noise', 'dawn noise', 'mals signal noise', 'mals baseline noise', 'omnisec noise', 'secmals signal instab'],
  'SECMALS incorrect molecular weight': ['wrong molecular weight', 'incorrect mw', 'mals mw error', 'secmals mw', 'absolute mw wrong', 'molecular weight error mals', 'dn/dc error', 'dndc wrong', 'molar mass wrong mals', 'mals molar mass'],
  'SECMALS negative peaks':           ['negative peak mals', 'inverted peak sec', 'negative elution mals', 'secmals negative', 'negative ri peak', 'ri negative peak'],
  'SECMALS RI baseline drift':        ['ri baseline', 'ri drift', 'refractive index baseline', 'optilab drift', 'ri detector drift', 'ri instab', 'secmals baseline drift', 'omnisec ri drift'],
  'SECMALS detector alignment':       ['mals alignment', 'detector delay', 'inter-detector delay', 'detector offset mals', 'dawn alignment', 'mals detector delay volume', 'delay volume secmals'],
  'SECMALS peak broadening':          ['sec peak broad', 'mals peak broad', 'secmals band broad', 'gpc peak broad', 'column peak broad secmals', 'mw distribution broad mals'],
  'SECMALS aggregation artifact':     ['secmals aggregat', 'mals aggregat', 'light scatter aggregat', 'high mw peak mals', 'void volume peak mals', 'aggregates sec', 'mals void peak'],

  // ── TEM ───────────────────────────────────────────────────────────────────
  'TEM poor image quality':           ['tem image', 'poor tem', 'tem resolution', 'tem blurry', 'tem focus', 'tem image quality', 'tem sharp', 'tem magnification'],
  'TEM sample drift':                 ['tem drift', 'sample drift tem', 'tem image drift', 'tem stage drift', 'tem specimen drift', 'thermal drift tem', 'stage drift tem'],
  'TEM charging':                     ['tem charging', 'tem charge', 'charging tem', 'beam charging tem', 'tem bright area', 'sample charge tem'],
  'TEM beam damage':                  ['beam damage tem', 'tem radiation', 'tem sample damage', 'electron beam damage', 'tem contamination', 'tem sample burn', 'tem hole formation'],
  'TEM vacuum failure':               ['tem vacuum', 'vacuum failure tem', 'tem pressure', 'tem column vacuum', 'tem pump', 'tem evacuate', 'turbo pump tem'],
  'TEM astigmatism':                  ['tem astigmat', 'astigmatism tem', 'tem stigmation', 'tem objective astigmat', 'tem lens astigmat', 'elliptical diffraction tem'],
  'TEM grid contamination':           ['tem grid', 'grid contamin', 'tem grid dirty', 'carbon contamination tem', 'tem cryo grid', 'tem specimen contamin'],
  'TEM ice contamination':            ['ice contamin tem', 'vitreous ice', 'cryo-tem ice', 'crystalline ice tem', 'ice crystal tem', 'frost tem', 'cryo contamination'],

  // ── Raman ─────────────────────────────────────────────────────────────────
  'Raman high fluorescence':          ['fluorescence raman', 'raman fluorescence', 'high background raman', 'fluorescent sample raman', 'fluorescence interference raman', 'raman background high'],
  'Raman weak signal':                ['raman weak', 'low raman signal', 'raman sensitivity', 'raman intensity low', 'weak raman', 'raman no signal', 'poor raman signal'],
  'Raman cosmic ray spike':           ['cosmic ray', 'raman spike', 'raman cosmic', 'sharp spike raman', 'cosmic spike raman', 'artifact spike raman'],
  'Raman baseline drift':             ['raman baseline', 'raman drift', 'raman background drift', 'raman baseline drift', 'raman wavenumber drift'],
  'Raman sample burning':             ['raman burn', 'sample burn raman', 'laser power raman', 'raman decomposition', 'raman thermal damage', 'raman sample heating'],
  'Raman peak shift':                 ['raman peak shift', 'wavenumber shift raman', 'raman calibration shift', 'raman band shift', 'peak position raman'],
  'Raman wavelength calibration':     ['raman calibration', 'raman wavenumber calibration', 'raman neon calibration', 'raman silicon calibration', 'raman wavelength fail'],

  // ── Solid-State NMR ───────────────────────────────────────────────────────
  'ssNMR MAS failure':                ['mas failure', 'magic angle spinning fail', 'rotor not spinning', 'mas speed', 'ssn mr spinning', 'mas speed not achieved', 'rotor crash', 'spinning fail nmr'],
  'ssNMR rotor instability':          ['rotor instab', 'ssn mr rotor', 'rotor wobble', 'rotor speed unstable', 'mas rotor', 'rotor eject', 'rotor balance nmr'],
  'ssNMR probe tuning':               ['ssn mr probe', 'probe tuning ssn mr', 'probe tune fail', 'ssn mr tune', 'probe tuning nmr solid', 'rf tuning ssn mr', 'probe mismatch ssn mr'],
  'ssNMR low sensitivity':            ['ssn mr sensitivity', 'ssn mr low signal', 'cp sensitivity', 'cross polarization fail', 'ssn mr weak signal', 'low sensitivity ssn mr'],
  'ssNMR arcing':                     ['ssn mr arcing', 'probe arcing', 'arcing nmr', 'rf arcing ssn mr', 'spark nmr probe', 'probe discharge ssn mr'],
  'ssNMR probe overheating':          ['probe overheat ssn mr', 'ssn mr probe hot', 'probe temperature nmr solid', 'probe cooling ssn mr'],

  // ── Liquid-State NMR ──────────────────────────────────────────────────────
  'NMR lock failure':                 ['lock fail', 'nmr lock', 'field lock nmr', 'deuterium lock', 'lock signal lost', 'nmr field drift', 'lock channel nmr', 'lock failure nmr'],
  'NMR poor shimming':                ['shim fail', 'nmr shim', 'poor shim', 'field homogeneity nmr', 'shimming nmr', 'bad shim nmr', 'shim map nmr', 'shimming fail'],
  'NMR broad peaks':                  ['nmr broad', 'broad nmr peak', 'linewidth nmr', 'nmr resolution', 'nmr line broad', 'nmr poor resolution', 'broad line nmr', 't2 broadening nmr'],
  'NMR solvent suppression failure':  ['solvent suppress', 'water suppress', 'nmr solvent fail', 'presaturation fail', 'water signal nmr', 'h2o suppress nmr', 'solvent peak nmr', 'watergate fail'],
  'NMR baseline distortion':          ['nmr baseline', 'baseline distort nmr', 'nmr baseline roll', 'phase distort nmr', 'nmr baseline correct', 'baseline artifact nmr'],
  'NMR low sensitivity':              ['nmr sensitivity', 'low nmr signal', 'nmr weak signal', 'nmr snr', 'nmr signal to noise', 'nmr sensitivity low'],
  'NMR probe failure':                ['nmr probe', 'probe fail nmr', 'probe damage nmr', 'nmr probe tune', 'probe arcing nmr', 'probe overload nmr'],

  // ── Preparative LC (PrepLC) ──────────────────────────────────────────────
  'PrepLC high backpressure':         ['preplc pressure', 'prep hplc pressure', 'preparative pressure', 'prep column block', 'prep pump alarm', 'prep pressure rise', 'fritted disc blocked', 'prep column clogged'],
  'PrepLC poor peak resolution':      ['prep resolution', 'preparative resolution', 'preplc peak resolution', 'prep peak overlap', 'co-elution prep', 'prep separation poor', 'prep fraction contaminated'],
  'PrepLC fraction contamination':    ['fraction contaminated', 'prep fraction impure', 'prep carryover', 'prep fraction purity', 'fraction crosscontam', 'prep impurity', 'preplc fraction purity'],
  'PrepLC pump flow instability':     ['prep pump flow', 'preplc flow unstable', 'prep gradient inaccuracy', 'prep flow rate error', 'prep gradient error', 'prep binary pump', 'prep lpg instability'],
  'PrepLC solvent recycling failure': ['solvent recycling', 'solvent recycle prep', 'prep recycling valve', 'recycle prep hplc', 'prep solvent recovery', 'recycling peak overlap'],
  'PrepLC UV detector overload':      ['prep uv overload', 'uv detector overload prep', 'prep detector saturation', 'prep absorbance too high', 'prep detector full scale', 'prep uv saturated'],
  'PrepLC air bubble':                ['prep air bubble', 'preplc bubble', 'air in prep pump', 'bubble prep column', 'prep degassing', 'air bubble preparative'],
  'NMR gradient failure':             ['nmr gradient', 'gradient fail nmr', 'gradient coil nmr', 'diffusion nmr fail', 'pulsed field gradient fail', 'pfg nmr fail'],
};

export function detectIssueCategory(description: string): string | null {
  const lower = description.toLowerCase();
  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(ISSUE_KEYWORDS)) {
    const score = keywords.filter(kw => lower.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = category;
    }
  }

  return bestScore > 0 ? bestMatch : null;
}
