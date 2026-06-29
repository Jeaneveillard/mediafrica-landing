/**
 * invoice-num.js — Génère des numéros de facture séquentiels uniques.
 * Format : FACT-YYYY-NNNN (ex. FACT-2026-0001)
 * Stocké dans localStorage 'ssc_invoice_seq'
 */
const InvoiceNum = (() => {
    const KEY = 'ssc_invoice_seq';

    function next() {
        const year = new Date().getFullYear();
        let seq;
        try {
            const stored = JSON.parse(localStorage.getItem(KEY) || '{"year":0,"seq":0}');
            if (stored.year !== year) {
                seq = 1;
            } else {
                seq = (stored.seq || 0) + 1;
            }
        } catch { seq = 1; }
        localStorage.setItem(KEY, JSON.stringify({ year, seq }));
        return `FACT-${year}-${String(seq).padStart(4, '0')}`;
    }

    return { next };
})();
