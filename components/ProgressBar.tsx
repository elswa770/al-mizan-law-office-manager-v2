import React from 'react';
import { CheckCircle, Circle, Clock, AlertTriangle } from 'lucide-react';

interface ProgressStep {
  id: string;
  label: string;
  status: 'completed' | 'current' | 'pending' | 'error';
  description?: string;
  icon?: React.ReactNode;
}

interface ProgressBarProps {
  steps: ProgressStep[];
  direction?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  steps,
  direction = 'horizontal',
  size = 'md',
  showLabels = true,
  className = ''
}) => {
  const getStepIcon = (step: ProgressStep) => {
    if (step.icon) return step.icon;
    
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="w-full h-full" />;
      case 'current':
        return <Clock className="w-full h-full animate-pulse" />;
      case 'error':
        return <AlertTriangle className="w-full h-full" />;
      default:
        return <Circle className="w-full h-full" />;
    }
  };

  const getStepColor = (status: ProgressStep['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700';
      case 'current':
        return 'text-primary-600 dark:text-primary-400 bg-primary-100 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700';
      case 'error':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700';
      default:
        return 'text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600';
    }
  };

  const getConnectorColor = (index: number) => {
    const currentStep = steps[index];
    const nextStep = steps[index + 1];
    
    if (currentStep.status === 'completed') {
      return 'bg-green-500';
    }
    if (currentStep.status === 'current' && nextStep?.status === 'completed') {
      return 'bg-primary-500';
    }
    return 'bg-slate-300 dark:bg-slate-600';
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          step: 'w-6 h-6 text-xs',
          connector: 'h-0.5',
          label: 'text-xs',
          description: 'text-xs'
        };
      case 'lg':
        return {
          step: 'w-10 h-10 text-lg',
          connector: 'h-1',
          label: 'text-sm',
          description: 'text-sm'
        };
      default:
        return {
          step: 'w-8 h-8 text-sm',
          connector: 'h-0.5',
          label: 'text-sm',
          description: 'text-xs'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  if (direction === 'vertical') {
    return (
      <div className={`flex flex-col space-y-4 ${className}`}>
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start gap-4">
            {/* Step Circle */}
            <div className={`
              flex items-center justify-center rounded-full border-2 flex-shrink-0 transition-all duration-300
              ${getStepColor(step.status)}
              ${sizeClasses.step}
            `}>
              {getStepIcon(step)}
            </div>

            {/* Step Content */}
            <div className="flex-1 min-w-0">
              {showLabels && (
                <div className={`font-bold ${sizeClasses.label} text-slate-800 dark:text-slate-200`}>
                  {step.label}
                </div>
              )}
              {step.description && (
                <div className={`${sizeClasses.description} text-slate-600 dark:text-slate-400 mt-1`}>
                  {step.description}
                </div>
              )}
            </div>

            {/* Connector */}
            {index < steps.length - 1 && (
              <div className={`absolute ${sizeClasses.connector} ${getConnectorColor(index)} mt-8`} 
                   style={{ width: '2px', height: '24px', marginRight: '-16px' }} />
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            {/* Step */}
            <div className="flex flex-col items-center">
              {/* Step Circle */}
              <div className={`
                flex items-center justify-center rounded-full border-2 transition-all duration-300
                ${getStepColor(step.status)}
                ${sizeClasses.step}
              `}>
                {getStepIcon(step)}
              </div>

              {/* Step Label */}
              {showLabels && (
                <div className={`font-bold ${sizeClasses.label} text-slate-800 dark:text-slate-200 mt-2 text-center max-w-24`}>
                  {step.label}
                </div>
              )}

              {/* Step Description */}
              {step.description && (
                <div className={`${sizeClasses.description} text-slate-600 dark:text-slate-400 mt-1 text-center max-w-32`}>
                  {step.description}
                </div>
              )}
            </div>

            {/* Connector */}
            {index < steps.length - 1 && (
              <div className={`
                flex-1 mx-2 ${sizeClasses.connector} ${getConnectorColor(index)} transition-colors duration-300
              `} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default ProgressBar;
