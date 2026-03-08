import React, { useState, useCallback, useMemo } from 'react';
import { Search, X, Clock, TrendingUp, Filter } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'case' | 'client' | 'hearing' | 'document';
  metadata?: string;
}

interface EnhancedSearchProps {
  onSearch: (query: string) => void;
  onSuggestionClick?: (suggestion: SearchSuggestion) => void;
  placeholder?: string;
  suggestions?: SearchSuggestion[];
  recentSearches?: string[];
  isLoading?: boolean;
  className?: string;
}

const EnhancedSearch: React.FC<EnhancedSearchProps> = ({
  onSearch,
  onSuggestionClick,
  placeholder = 'البحث في القضايا، الموكلين، الجلسات...',
  suggestions = [],
  recentSearches = [],
  isLoading = false,
  className = ''
}) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const debouncedQuery = useDebounce(query, 300);

  // Handle search with debouncing
  React.useEffect(() => {
    onSearch(debouncedQuery);
  }, [debouncedQuery, onSearch]);

  // Filter suggestions based on query
  const filteredSuggestions = useMemo(() => {
    if (!query.trim()) return [];
    
    return suggestions.filter(suggestion =>
      suggestion.text.toLowerCase().includes(query.toLowerCase()) ||
      suggestion.metadata?.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 8);
  }, [query, suggestions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setShowSuggestions(true);
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text);
    setShowSuggestions(false);
    setIsFocused(false);
    onSuggestionClick?.(suggestion);
  };

  const handleRecentSearchClick = (search: string) => {
    setQuery(search);
    setShowSuggestions(false);
    onSearch(search);
  };

  const handleClear = () => {
    setQuery('');
    setShowSuggestions(false);
    onSearch('');
  };

  const getSuggestionIcon = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'case': return '📋';
      case 'client': return '👤';
      case 'hearing': return '⚖️';
      case 'document': return '📄';
      default: return '🔍';
    }
  };

  const getSuggestionColor = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'case': return 'text-blue-600 dark:text-blue-400';
      case 'client': return 'text-green-600 dark:text-green-400';
      case 'hearing': return 'text-purple-600 dark:text-purple-400';
      case 'document': return 'text-amber-600 dark:text-amber-400';
      default: return 'text-slate-600 dark:text-slate-400';
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-slate-300 border-t-primary-500 rounded-full animate-spin" />
          ) : (
            <Search className="w-4 h-4 text-slate-400" />
          )}
        </div>
        
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            // Don't hide suggestions immediately to allow click events
            setIsFocused(false);
          }}
          placeholder={placeholder}
          className={`
            w-full pr-10 pl-12 py-3 rounded-lg border transition-all duration-200
            ${isFocused 
              ? 'ring-2 ring-primary-500/20 border-primary-500 bg-white dark:bg-slate-800' 
              : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700'
            }
            hover:border-slate-400 dark:hover:border-slate-500
          `}
        />
        
        {query && (
          <button
            onClick={handleClear}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            title="مسح البحث"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {/* Recent Searches */}
          {!query && recentSearches.length > 0 && (
            <div className="p-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400">البحوث الأخيرة</h3>
              </div>
              <div className="space-y-1">
                {recentSearches.slice(0, 3).map((search, index) => (
                  <button
                    key={index}
                    onClick={() => handleRecentSearchClick(search)}
                    className="w-full text-right px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm text-slate-700 dark:text-slate-300"
                  >
                    {search}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search Suggestions */}
          {query && (
            <div className="p-2">
              {filteredSuggestions.length > 0 ? (
                <div className="space-y-1">
                  {filteredSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSuggestionClick(suggestion);
                      }}
                      className="w-full text-right px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group"
                      type="button"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{getSuggestionIcon(suggestion.type)}</span>
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium text-sm ${getSuggestionColor(suggestion.type)}`}>
                            {suggestion.text}
                          </div>
                          {suggestion.metadata && (
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {suggestion.metadata}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-slate-400">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">لا توجد نتائج للبحث</p>
                </div>
              )}
            </div>
          )}

          {/* Search Tips */}
          {query && filteredSuggestions.length === 0 && (
            <div className="p-4 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400">نصائح البحث</h3>
              </div>
              <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                <li>• استخدم أرقام القضايا للبحث السريع</li>
                <li>• يمكنك البحث باسم الموكل أو المحامي</li>
                <li>• استخدم فلتر التاريخ للجلسات</li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EnhancedSearch;
