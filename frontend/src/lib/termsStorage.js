const STORAGE_KEY = 'scraptor_terms_v1';

export function hasAcceptedTerms() {
  return (
    typeof window !== 'undefined' && !!window.localStorage.getItem(STORAGE_KEY)
  );
}

export function acceptTerms() {
  window.localStorage.setItem(STORAGE_KEY, new Date().toISOString());
}
