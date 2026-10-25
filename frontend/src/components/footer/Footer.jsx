/**
 * ============================================================================
 * MEDASSIST AI - FOOTER COMPONENT (Footer.jsx)
 * ============================================================================
 * Role:
 *   Standard bottom footer displaying dynamic copyright year and developer
 *   attribution (Developed by J Ganesh kumar reddy).
 *
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW: FOOTER RENDERING
 * ----------------------------------------------------------------------------
 * [Footer Component]
 *   │
 *   └── Copyright & Developer Attribution: J Ganesh kumar reddy
 *
 * ----------------------------------------------------------------------------
 * ASCII FLOW: COMPONENT RENDER
 * ----------------------------------------------------------------------------
 *  <Footer /> ──► Render dynamic year & developer attribution
 * ============================================================================
 */
function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 px-4 py-5 text-center text-xs text-slate-500">
      <p>&copy; {new Date().getFullYear()} MedAssist AI &middot; Student full-stack project by J Ganesh kumar reddy</p>
    </footer>
  );
}

export default Footer;
