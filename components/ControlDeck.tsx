import React from 'react';
import { 
    LayoutSidebarLeft, LayoutSidebarRight, ChevronDown, ChevronRight,
    CheckCircleIcon, PromptIcon, HistoryIcon, FaceIdIcon 
} from './icons/Icons';
import { AnalysisPanel } from './AnalysisPanel';
import { PromptEnginePanel } from './PromptEnginePanel';
import { HistoryPanel } from './HistoryPanel';
import { FacialVectorPanel } from './FacialVectorPanel';

type AnalysisPanelProps = React.ComponentProps<typeof AnalysisPanel>;
type PromptEnginePanelProps = React.ComponentProps<typeof PromptEnginePanel>;
type HistoryPanelProps = React.ComponentProps<typeof HistoryPanel>;
type FacialVectorPanelProps = React.ComponentProps<typeof FacialVectorPanel>;
export type ActivePanel = 'analysis' | 'prompt' | 'history' | 'vector';

interface ControlDeckProps {
  isCollapsed: boolean;
  onToggle: () => void;
  activePanel: ActivePanel | null;
  onPanelChange: (panel: ActivePanel) => void;
  analysisProps: AnalysisPanelProps;
  promptProps: PromptEnginePanelProps;
  historyProps: HistoryPanelProps;
  vectorProps: FacialVectorPanelProps;
}

const AccordionItem: React.FC<{
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ title, icon, isOpen, onToggle, children }) => {
  return (
    <div className="border-b border-slate-700">
      <button
        onClick={onToggle}
        className="w-full flex justify-between items-center p-3 text-left text-sm font-semibold text-slate-200 hover:bg-slate-700/50"
      >
        <span className="flex items-center gap-2">
          {icon}
          {title}
        </span>
        {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
      </button>
      {isOpen && (
        <div className="bg-slate-800">
          {children}
        </div>
      )}
    </div>
  );
};

const ControlDeck: React.FC<ControlDeckProps> = ({
  isCollapsed,
  onToggle,
  activePanel,
  onPanelChange,
  analysisProps,
  promptProps,
  historyProps,
  vectorProps,
}) => {
  if (isCollapsed) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-md h-full flex flex-col items-center p-2">
        <button onClick={onToggle} className="text-slate-400 hover:text-amber-400 p-2" title="Expand Control Deck">
          <LayoutSidebarLeft className="w-6 h-6" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-md h-full flex flex-col">
      <div className="px-3 py-2 bg-slate-900/70 border-b border-slate-700 flex justify-between items-center">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          CONTROL DECK
        </h2>
        <button onClick={onToggle} className="text-slate-400 hover:text-amber-400 p-1" title="Collapse Control Deck">
          <LayoutSidebarRight className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-grow min-h-0 overflow-y-auto">
        <AccordionItem
          title="AI ANALYSIS ENGINE"
          icon={<CheckCircleIcon className="w-4 h-4" />}
          isOpen={activePanel === 'analysis'}
          onToggle={() => onPanelChange('analysis')}
        >
          <AnalysisPanel {...analysisProps} />
        </AccordionItem>
        
        <AccordionItem
          title="PROMPT ENGINE"
          icon={<PromptIcon className="w-4 h-4" />}
          isOpen={activePanel === 'prompt'}
          onToggle={() => onPanelChange('prompt')}
        >
          <PromptEnginePanel {...promptProps} />
        </AccordionItem>
        
        <AccordionItem
          title="SESSION HISTORY"
          icon={<HistoryIcon className="w-4 h-4" />}
          isOpen={activePanel === 'history'}
          onToggle={() => onPanelChange('history')}
        >
          <HistoryPanel {...historyProps} />
        </AccordionItem>

        <AccordionItem
          title="ANALISIS VEKTOR WAJAH"
          icon={<FaceIdIcon className="w-4 h-4" />}
          isOpen={activePanel === 'vector'}
          onToggle={() => onPanelChange('vector')}
        >
          <FacialVectorPanel {...vectorProps} />
        </AccordionItem>
      </div>
    </div>
  );
};

export default React.memo(ControlDeck);