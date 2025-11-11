import React from 'react';
import { Tooltip } from './Tooltip';
// FIX: Corrected import to point to the new centralized Icons.tsx file.
import { TooltipIcon } from '../icons/Icons';

interface CardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  titleIcon?: React.ReactNode;
  tooltip?: string;
}

export const Card: React.FC<CardProps> = ({ title, children, className = '', titleIcon, tooltip }) => {
  return (
    <div className={`bg-slate-800 border border-slate-700 rounded-md overflow-hidden ${className}`}>
      <div className="px-3 py-2 bg-slate-900/70 border-b border-slate-700 flex justify-between items-center">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          {titleIcon}
          {title}
        </h2>
        {tooltip && (
          <Tooltip text={tooltip}>
            <TooltipIcon className="w-4 h-4 text-slate-500 hover:text-amber-400" />
          </Tooltip>
        )}
      </div>
      <div className="p-3">
        {children}
      </div>
    </div>
  );
};
