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
