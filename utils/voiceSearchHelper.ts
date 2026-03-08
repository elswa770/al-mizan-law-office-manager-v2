import { Case, Client, Hearing, Task } from '../types';

export interface SearchResult {
  type: 'case' | 'client' | 'hearing' | 'task';
  item: Case | Client | Hearing | Task;
  relevanceScore: number;
  matchedFields: string[];
}

/**
 * Perform intelligent voice search across all data types
 */
export const performVoiceSearch = (
  query: string,
  data: {
    cases?: Case[];
    clients?: Client[];
    hearings?: Hearing[];
    tasks?: Task[];
  }
): SearchResult[] => {
  const results: SearchResult[] = [];
  const normalizedQuery = query.toLowerCase().trim();

  // Search in cases
  if (data.cases) {
    data.cases.forEach(case_ => {
      const score = calculateRelevanceScore(normalizedQuery, case_, 'case');
      if (score > 0) {
        results.push({
          type: 'case',
          item: case_,
          relevanceScore: score,
          matchedFields: getMatchedFields(normalizedQuery, case_, 'case')
        });
      }
    });
  }

  // Search in clients
  if (data.clients) {
    data.clients.forEach(client => {
      const score = calculateRelevanceScore(normalizedQuery, client, 'client');
      if (score > 0) {
        results.push({
          type: 'client',
          item: client,
          relevanceScore: score,
          matchedFields: getMatchedFields(normalizedQuery, client, 'client')
        });
      }
    });
  }

  // Search in hearings
  if (data.hearings) {
    data.hearings.forEach(hearing => {
      const score = calculateRelevanceScore(normalizedQuery, hearing, 'hearing');
      if (score > 0) {
        results.push({
          type: 'hearing',
          item: hearing,
          relevanceScore: score,
          matchedFields: getMatchedFields(normalizedQuery, hearing, 'hearing')
        });
      }
    });
  }

  // Sort by relevance score (highest first)
  return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
};

/**
 * Calculate relevance score for a search item
 */
function calculateRelevanceScore(query: string, item: any, type: string): number {
  let score = 0;
  
  switch (type) {
    case 'case':
      // Exact match in title or case number gets highest score
      if (item.title.toLowerCase() === query || item.caseNumber.toLowerCase() === query) {
        score = 100;
      }
      // Partial match in title
      else if (item.title.toLowerCase().includes(query)) {
        score = 80;
      }
      // Partial match in case number
      else if (item.caseNumber.toLowerCase().includes(query)) {
        score = 70;
      }
      // Match in client name
      else if (item.clientName.toLowerCase().includes(query)) {
        score = 60;
      }
      // Match in court
      else if (item.court.toLowerCase().includes(query)) {
        score = 50;
      }
      break;
      
    case 'client':
      if (item.name.toLowerCase() === query) {
        score = 100;
      } else if (item.name.toLowerCase().includes(query)) {
        score = 80;
      } else if (item.email?.toLowerCase().includes(query)) {
        score = 60;
      } else if (item.phone?.includes(query)) {
        score = 50;
      }
      break;
      
    case 'hearing':
      if (item.caseId.toLowerCase().includes(query)) {
        score = 70;
      } else if (item.court.toLowerCase().includes(query)) {
        score = 60;
      } else if (item.judge?.toLowerCase().includes(query)) {
        score = 50;
      }
      break;
  }
  
  return score;
}

/**
 * Get fields that matched the search query
 */
function getMatchedFields(query: string, item: any, type: string): string[] {
  const fields: string[] = [];
  
  switch (type) {
    case 'case':
      if (item.title.toLowerCase().includes(query)) fields.push('العنوان');
      if (item.caseNumber.toLowerCase().includes(query)) fields.push('رقم القضية');
      if (item.clientName.toLowerCase().includes(query)) fields.push('اسم الموكل');
      if (item.court.toLowerCase().includes(query)) fields.push('المحكمة');
      break;
      
    case 'client':
      if (item.name.toLowerCase().includes(query)) fields.push('الاسم');
      if (item.email?.toLowerCase().includes(query)) fields.push('البريد الإلكتروني');
      if (item.phone?.includes(query)) fields.push('رقم الهاتف');
      break;
      
    case 'hearing':
      if (item.caseId.toLowerCase().includes(query)) fields.push('رقم القضية');
      if (item.court.toLowerCase().includes(query)) fields.push('المحكمة');
      if (item.judge?.toLowerCase().includes(query)) fields.push('القاضي');
      break;
  }
  
  return fields;
}

/**
 * Store voice search in localStorage for other components to use
 */
export const storeVoiceSearch = (query: string, targetPage: 'cases' | 'clients' | 'hearings' | 'search' = 'cases') => {
  localStorage.setItem('voiceSearchQuery', query);
  localStorage.setItem('voiceSearchTimestamp', Date.now().toString());
  localStorage.setItem('voiceSearchTarget', targetPage);
  localStorage.setItem('searchType', 'voice');
};

/**
 * Retrieve and clear voice search from localStorage
 */
export const retrieveVoiceSearch = (): { query: string; targetPage: string } | null => {
  const query = localStorage.getItem('voiceSearchQuery');
  const timestamp = localStorage.getItem('voiceSearchTimestamp');
  const targetPage = localStorage.getItem('voiceSearchTarget') || 'cases';
  const searchType = localStorage.getItem('searchType');
  
  if (query && timestamp && searchType === 'voice') {
    const timestampNum = parseInt(timestamp);
    const now = Date.now();
    
    // Only use if less than 15 seconds old
    if (now - timestampNum < 15000) {
      // Clear after retrieval
      setTimeout(() => {
        localStorage.removeItem('voiceSearchQuery');
        localStorage.removeItem('voiceSearchTimestamp');
        localStorage.removeItem('voiceSearchTarget');
        localStorage.removeItem('searchType');
      }, 1000);
      
      return { query, targetPage };
    } else {
      // Clear old searches
      localStorage.removeItem('voiceSearchQuery');
      localStorage.removeItem('voiceSearchTimestamp');
      localStorage.removeItem('voiceSearchTarget');
      localStorage.removeItem('searchType');
    }
  }
  
  return null;
};

/**
 * Get smart search suggestions based on voice query
 */
export const getSearchSuggestions = (query: string, data: any): string[] => {
  const suggestions: string[] = [];
  const normalizedQuery = query.toLowerCase();
  
  // If query contains numbers, suggest case numbers
  if (/\d/.test(query)) {
    if (data.cases) {
      data.cases.forEach((case_: Case) => {
        if (case_.caseNumber.toLowerCase().includes(normalizedQuery)) {
          suggestions.push(case_.caseNumber);
        }
      });
    }
  }
  
  // If query contains common legal terms, suggest related searches
  const legalTerms = ['محكمة', 'قاضي', 'جلسة', 'حكم', 'استئناف'];
  legalTerms.forEach(term => {
    if (normalizedQuery.includes(term)) {
      suggestions.push(term);
    }
  });
  
  return suggestions.slice(0, 5);
};
