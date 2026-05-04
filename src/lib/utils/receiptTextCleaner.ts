/**
 * Utility functions for cleaning receipt text
 */

export function cleanReceiptText(text: string) {
  // Strip VAT daggers that cause the LLM to choke
  let cleaned = text.replace(/[†‡]/g, '');

  const startIdx = cleaned.indexOf('Substitutions') !== -1 
    ? cleaned.indexOf('Substitutions') 
    : (cleaned.indexOf('Items with a shorter life') !== -1 
        ? cleaned.indexOf('Items with a shorter life') 
        : cleaned.indexOf('QtyProduct'));
    
  const endIdx = cleaned.indexOf('Basket value before offers');

  if (startIdx !== -1) {
    cleaned = cleaned.substring(
      startIdx, 
      endIdx !== -1 ? endIdx : cleaned.length
    );
  }
  
  // Remove everything after "Basket value before offers" if it exists
  if (endIdx !== -1) {
    cleaned = cleaned.substring(0, endIdx);
  }
  
  return cleaned.trim();
}
