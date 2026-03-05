import React, { useState } from 'react';
import { Calendar, Repeat, X, Plus, ChevronDown } from 'lucide-react';
import { RecurrenceRule } from '../services/recurrenceService';

interface RecurrenceManagerProps {
  isRecurring: boolean;
  recurrencePattern?: RecurrenceRule;
  onRecurrenceChange: (isRecurring: boolean, pattern?: RecurrenceRule) => void;
}

const RecurrenceManager: React.FC<RecurrenceManagerProps> = ({
  isRecurring,
  recurrencePattern,
  onRecurrenceChange
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [pattern, setPattern] = useState<RecurrenceRule>(
    recurrencePattern || {
      type: 'weekly',
      interval: 1,
      daysOfWeek: [new Date().getDay()]
    }
  );

  const weekDays = [
    { id: 0, name: 'الأحد' },
    { id: 1, name: 'الإثنين' },
    { id: 2, name: 'الثلاثاء' },
    { id: 3, name: 'الأربعاء' },
    { id: 4, name: 'الخميس' },
    { id: 5, name: 'الجمعة' },
    { id: 6, name: 'السبت' }
  ];

  const monthWeeks = [
    { id: 1, name: 'الأول' },
    { id: 2, name: 'الثاني' },
    { id: 3, name: 'الثالث' },
    { id: 4, name: 'الرابع' },
    { id: 5, name: 'الأخير' }
  ];

  const handleTypeChange = (type: RecurrenceRule['type']) => {
    const newPattern = { ...pattern, type };
    
    // Reset default values based on type
    switch (type) {
      case 'daily':
        newPattern.interval = 1;
        delete newPattern.daysOfWeek;
        delete newPattern.dayOfMonth;
        delete newPattern.weekOfMonth;
        break;
      case 'weekly':
        newPattern.interval = 1;
        newPattern.daysOfWeek = [new Date().getDay()];
        delete newPattern.dayOfMonth;
        delete newPattern.weekOfMonth;
        break;
      case 'monthly':
        newPattern.interval = 1;
        newPattern.dayOfMonth = new Date().getDate();
        delete newPattern.daysOfWeek;
        delete newPattern.weekOfMonth;
        break;
      case 'yearly':
        newPattern.interval = 1;
        delete newPattern.daysOfWeek;
        delete newPattern.dayOfMonth;
        delete newPattern.weekOfMonth;
        break;
    }
    
    setPattern(newPattern);
  };

  const handleDayToggle = (dayId: number) => {
    const currentDays = pattern.daysOfWeek || [];
    const newDays = currentDays.includes(dayId)
      ? currentDays.filter(d => d !== dayId)
      : [...currentDays, dayId].sort();
    
    setPattern({ ...pattern, daysOfWeek: newDays });
  };

  const getPatternSummary = (): string => {
    if (!isRecurring) return 'لا يتكرر';
    
    const typeNames = {
      daily: 'يومي',
      weekly: 'أسبوعي',
      monthly: 'شهري',
      yearly: 'سنوي'
    };
    
    let summary = `يتكرر ${typeNames[pattern.type]}`;
    
    if (pattern.interval > 1) {
      summary += ` كل ${pattern.interval} `;
      switch (pattern.type) {
        case 'daily':
          summary += 'أيام';
          break;
        case 'weekly':
          summary += 'أسابيع';
          break;
        case 'monthly':
          summary += 'أشهر';
          break;
        case 'yearly':
          summary += 'سنوات';
          break;
      }
    }
    
    if (pattern.type === 'weekly' && pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
      const dayNames = pattern.daysOfWeek.map(d => weekDays[d].name).join('، ');
      summary += ` في ${dayNames}`;
    }
    
    if (pattern.endDate) {
      summary += ` حتى ${new Date(pattern.endDate).toLocaleDateString('ar-SA')}`;
    }
    
    if (pattern.occurrences) {
      summary += ` (${pattern.occurrences} مرات)`;
    }
    
    return summary;
  };

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="is-recurring"
            checked={isRecurring}
            onChange={(e) => {
              const newIsRecurring = e.target.checked;
              onRecurrenceChange(newIsRecurring, newIsRecurring ? pattern : undefined);
            }}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <label htmlFor="is-recurring" className="flex items-center gap-2 cursor-pointer">
            <Repeat className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span className="font-medium text-slate-700 dark:text-slate-300">تكرار الموعد</span>
          </label>
        </div>
        
        {isRecurring && (
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
          >
            {showAdvanced ? 'بسيط' : 'متقدم'}
            <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {isRecurring && (
        <>
          <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-sm text-slate-600 dark:text-slate-400">{getPatternSummary()}</p>
          </div>

          {showAdvanced ? (
            <div className="space-y-4">
              {/* Recurrence Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  نوع التكرار
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'daily', label: 'يومي' },
                    { value: 'weekly', label: 'أسبوعي' },
                    { value: 'monthly', label: 'شهري' },
                    { value: 'yearly', label: 'سنوي' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => handleTypeChange(option.value as RecurrenceRule['type'])}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        pattern.type === option.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interval */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  كل {pattern.interval} {pattern.type === 'daily' ? 'أيام' : pattern.type === 'weekly' ? 'أسابيع' : pattern.type === 'monthly' ? 'أشهر' : 'سنوات'}
                </label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={pattern.interval}
                  onChange={(e) => setPattern({ ...pattern, interval: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              {/* Weekly - Days of Week */}
              {pattern.type === 'weekly' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    أيام الأسبوع
                  </label>
                  <div className="grid grid-cols-7 gap-1">
                    {weekDays.map(day => (
                      <button
                        key={day.id}
                        onClick={() => handleDayToggle(day.id)}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          pattern.daysOfWeek?.includes(day.id)
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                        }`}
                      >
                        {day.name.slice(0, 2)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Monthly Options */}
              {pattern.type === 'monthly' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    خيار الشهري
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="monthly-option"
                        checked={!!pattern.dayOfMonth}
                        onChange={() => setPattern({
                          ...pattern,
                          dayOfMonth: new Date().getDate(),
                          weekOfMonth: undefined,
                          daysOfWeek: undefined
                        })}
                        className="text-blue-600"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        اليوم {pattern.dayOfMonth || new Date().getDate()} من كل شهر
                      </span>
                    </label>
                    
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="monthly-option"
                        checked={!!pattern.weekOfMonth}
                        onChange={() => setPattern({
                          ...pattern,
                          weekOfMonth: 1,
                          daysOfWeek: [new Date().getDay()],
                          dayOfMonth: undefined
                        })}
                        className="text-blue-600"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {monthWeeks.find(w => w.id === (pattern.weekOfMonth || 1))?.name} {weekDays.find(d => d.id === (pattern.daysOfWeek?.[0] || 0))?.name} من كل شهر
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* End Options */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  إنهاء التكرار
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="end-option"
                      checked={!pattern.endDate && !pattern.occurrences}
                      onChange={() => {
                        const newPattern = { ...pattern };
                        delete newPattern.endDate;
                        delete newPattern.occurrences;
                        setPattern(newPattern);
                      }}
                      className="text-blue-600"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">بدون نهاية</span>
                  </label>
                  
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="end-option"
                      checked={!!pattern.occurrences}
                      onChange={() => {
                        const newPattern = { ...pattern, occurrences: 10 };
                        delete newPattern.endDate;
                        setPattern(newPattern);
                      }}
                      className="text-blue-600"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      بعد
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={pattern.occurrences || 10}
                        onChange={(e) => setPattern({ ...pattern, occurrences: parseInt(e.target.value) || 10 })}
                        className="w-16 px-2 py-1 mx-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-center"
                      />
                      مرة
                    </span>
                  </label>
                  
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="end-option"
                      checked={!!pattern.endDate}
                      onChange={() => {
                        const newPattern = { ...pattern, endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] };
                        delete newPattern.occurrences;
                        setPattern(newPattern);
                      }}
                      className="text-blue-600"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      في
                      <input
                        type="date"
                        value={pattern.endDate || ''}
                        onChange={(e) => setPattern({ ...pattern, endDate: e.target.value })}
                        className="w-32 px-2 py-1 mx-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      />
                    </span>
                  </label>
                </div>
              </div>

              <button
                onClick={() => onRecurrenceChange(true, pattern)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                تطبيق التكرار
              </button>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                {getPatternSummary()}
              </p>
              <button
                onClick={() => setShowAdvanced(true)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                تخصيص التكرار
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RecurrenceManager;
