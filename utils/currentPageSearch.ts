/**
 * Utilities for searching in the current page
 */

/**
 * Check if voice search should be applied to current page
 */
export const shouldSearchInCurrentPage = (): boolean => {
  return localStorage.getItem('searchInCurrentPage') === 'true';
};

/**
 * Get voice search query for current page
 */
export const getCurrentPageSearchQuery = (): string | null => {
  const query = localStorage.getItem('voiceSearchQuery');
  const timestamp = localStorage.getItem('voiceSearchTimestamp');
  const searchType = localStorage.getItem('searchType');
  
  if (query && timestamp && searchType === 'voice') {
    const timestampNum = parseInt(timestamp);
    const now = Date.now();
    
    // Only use if less than 15 seconds old
    if (now - timestampNum < 15000) {
      return query;
    } else {
      // Clear old searches
      localStorage.removeItem('voiceSearchQuery');
      localStorage.removeItem('voiceSearchTimestamp');
      localStorage.removeItem('searchType');
      localStorage.removeItem('searchInCurrentPage');
      return null;
    }
  }
  
  return null;
};

/**
 * Clear current page search
 */
export const clearCurrentPageSearch = () => {
  localStorage.removeItem('voiceSearchQuery');
  localStorage.removeItem('voiceSearchTimestamp');
  localStorage.removeItem('searchType');
  localStorage.removeItem('searchInCurrentPage');
};

/**
 * Search in cases data
 */
export const searchInCases = (query: string, cases: any[]) => {
  const normalizedQuery = query.toLowerCase();
  
  return cases.filter(c => 
    c.title.toLowerCase().includes(normalizedQuery) || 
    c.caseNumber.toLowerCase().includes(normalizedQuery) || 
    c.clientName.toLowerCase().includes(normalizedQuery) ||
    c.court.toLowerCase().includes(normalizedQuery) ||
    c.status?.toLowerCase().includes(normalizedQuery) ||
    c.type?.toLowerCase().includes(normalizedQuery)
  );
};

/**
 * Search in clients data
 */
export const searchInClients = (query: string, clients: any[]) => {
  const normalizedQuery = query.toLowerCase();
  
  return clients.filter(client => 
    client.name.toLowerCase().includes(normalizedQuery) ||
    client.phone?.includes(query) ||
    client.email?.toLowerCase().includes(normalizedQuery) ||
    client.nationalId?.includes(query) ||
    client.address?.toLowerCase().includes(normalizedQuery) ||
    client.type?.toLowerCase().includes(normalizedQuery) ||
    client.status?.toLowerCase().includes(normalizedQuery)
  );
};

/**
 * Search in hearings data
 */
export const searchInHearings = (query: string, hearings: any[]) => {
  const normalizedQuery = query.toLowerCase();
  
  return hearings.filter(hearing => 
    hearing.caseId?.toLowerCase().includes(normalizedQuery) ||
    hearing.court?.toLowerCase().includes(normalizedQuery) ||
    hearing.judge?.toLowerCase().includes(normalizedQuery) ||
    hearing.type?.toLowerCase().includes(normalizedQuery) ||
    hearing.status?.toLowerCase().includes(normalizedQuery)
  );
};

/**
 * Generic search function based on page type
 */
export const performCurrentPageSearch = (
  query: string, 
  pageType: 'cases' | 'clients' | 'hearings',
  data: any[]
) => {
  switch (pageType) {
    case 'cases':
      return searchInCases(query, data);
    case 'clients':
      return searchInClients(query, data);
    case 'hearings':
      return searchInHearings(query, data);
    default:
      return [];
  }
};
