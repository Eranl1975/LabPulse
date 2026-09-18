// Offline fixtures for the vendor discovery tests. No network access.

export const ROBOTS_ALLOW_ALL = `User-agent: *
Disallow: /private/
Crawl-delay: 0
`;

export const ROBOTS_DENY_SUPPORT = `User-agent: *
Disallow: /support/
Allow: /support/public/
`;

/** A support hub linking to two documents, one off-domain link and one image. */
export const SUPPORT_INDEX_HTML = `<!doctype html>
<html>
  <head><title>Agilent Support — Liquid Chromatography</title></head>
  <body>
    <nav><a href="/en/store">Store</a></nav>
    <h1>Liquid Chromatography Support</h1>
    <ul>
      <li><a href="/library/usermanuals/public/D0133020_troubleshooting-guide.pdf">HPLC Troubleshooting Guide</a></li>
      <li><a href="/en/support/hplc-maintenance-guide">HPLC Maintenance Guide</a></li>
      <li><a href="https://not-agilent.example.com/troubleshooting-manual">Third-party manual</a></li>
      <li><a href="/assets/logo.png">Logo</a></li>
      <li><a href="/en/company/about">About us</a></li>
    </ul>
  </body>
</html>`;

/** A troubleshooting page with labelled symptom/cause/action content. */
export const TROUBLESHOOTING_HTML = `<!doctype html>
<html>
  <head><title>Agilent 1260 Infinity HPLC Troubleshooting Guide</title></head>
  <body>
    <script>var tracking = 1;</script>
    <h1>HPLC Troubleshooting</h1>

    <h2>High backpressure during the run</h2>
    <p>Symptom: System pressure exceeds the expected operating range during the run</p>
    <p>Possible causes:</p>
    <ul>
      <li>Blocked inlet frit or guard column</li>
      <li>Precipitated buffer in the mobile phase</li>
      <li>Kinked or crushed capillary tubing</li>
    </ul>
    <p>Diagnostics:</p>
    <ul>
      <li>Disconnect the column and re-measure the system pressure</li>
      <li>Inspect all capillary connections for damage</li>
    </ul>
    <p>Corrective actions:</p>
    <ul>
      <li>Replace the guard column or inlet frit</li>
      <li>Flush the system with a strong solvent</li>
    </ul>
    <p>If the pressure does not drop, contact your Agilent service engineer.</p>

    <h2>Retention time drifts earlier across a sequence</h2>
    <p>Symptom: Retention times shift earlier than expected over consecutive injections</p>
    <p>Causes: column degradation; mobile phase composition change; column oven temperature instability</p>
    <p>Actions: replace the column; prepare fresh mobile phase; recalibrate the column oven</p>
  </body>
</html>`;

/** A page with no troubleshooting structure; must not produce knowledge items. */
export const MARKETING_HTML = `<!doctype html>
<html>
  <head><title>Agilent Product Brochure</title></head>
  <body>
    <h1>Our newest instrument</h1>
    <p>Discover unmatched performance and industry-leading reliability for your laboratory.</p>
  </body>
</html>`;
