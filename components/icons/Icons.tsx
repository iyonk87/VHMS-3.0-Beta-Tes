import React from 'react';

type IconProps = React.SVGProps<SVGSVGElement>;

const defaultProps: IconProps = {
    width: "24",
    height: "24",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
};

export const TooltipIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
);
export const UploadIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
);
export const InputIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
);
export const LayersIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
);
export const CheckCircleIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
);
export const XCircleIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
);
export const RefreshIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
);
export const MagicWandIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}><path d="M15 4V2a2 2 0 0 0-4 0v2"></path><path d="M15 4h- situazione."></path><path d="M22 19a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2Z"></path><path d="M12 4v13"></path><path d="M8 4v2"></path><path d="M16 4v2"></path><path d="m19 13-1-5"></path><path d="m5 13 1-5"></path></svg>
);
export const PersonPoseIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}><path d="M8 3v.5a2.5 2.5 0 1 0 5 0V3"></path><path d="M8 12.5a2.5 2.5 0 1 0 5 0"></path><path d="M12 12.5v-7"></path><path d="M12 21v-6.5"></path><path d="M5.5 12.5h-1a2.5 2.5 0 1 0 0 5h1"></path><path d="M18.5 12.5h1a2.5 2.5 0 1 1 0 5h-1"></path></svg>
);
export const SunIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m4.93 19.07 1.41-1.41"></path><path d="m17.66 6.34 1.41-1.41"></path></svg>
);
export const BlueprintIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}><path d="M12 2L3 7v10l9 5 9-5V7l-9-5z"></path><path d="M3 7l9 5 9-5"></path><path d="M12 22V12"></path><path d="M12 12L3 7"></path><path d="M12 12l9-5"></path></svg>
);
export const PaletteIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 0-10 10c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.15-1.1-1.45-1.1-1.45-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.1-.65.35-1.08.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.1.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02.8-.22 1.65-.33 2.5-.33.85 0 1.7.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.6 1.03 2.69 0 3.84-2.33 4.68-4.57 4.93.36.31.68.92.68 1.85v2.75c0 .27.16.59.67.5A10 10 0 0 0 12 2z"></path></svg>
);
export const InfoCircleIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
);
export const PromptIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v16H6.5a2.5 2.5 0 0 1-2.5-2.5z"></path><path d="M14 2v6l-2-2-2 2V2"></path></svg>
);
export const SparklesIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}><path d="m12 3-1.5 3L7 7.5l3 1.5L12 12l1.5-3L17 7.5l-3-1.5Z"></path><path d="m19 12-1.5 3-3.5 1.5 3.5 1.5L19 21l1.5-3L24 16.5l-3.5-1.5Z"></path><path d="M12 19.5 10.5 21l-1-1.5-1.5-1 .5-2 2 .5Z"></path></svg>
);
export const GenerateIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}><path d="m12 3-1.5 3L7 7.5l3 1.5L12 12l1.5-3L17 7.5l-3-1.5Z"></path><path d="m19 12-1.5 3-3.5 1.5 3.5 1.5L19 21l1.5-3L24 16.5l-3.5-1.5Z"></path><path d="M12 19.5 10.5 21l-1-1.5-1.5-1 .5-2 2 .5Z"></path></svg>
);
export const DownloadIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
);
export const ShieldCheckIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>
);
export const EditIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
);
export const HistoryIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}><path d="M1 4v6h6"></path><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
);
export const ReloadIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path></svg>
);
export const BrushIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}><path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"></path><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.21 0 4-1.79 4-4.02v-1.72h-2.93a2 2 0 0 1-2.12-2.34v-.1c.52-.52.52-1.36 0-1.88z"></path></svg>
);
export const TrashIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
);
export const EraserIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}><path d="M12 22H6a2 2 0 0 1-2-2V7.5L12 2l8 5.5V14"></path><path d="m22 12-4.5 4.5M17.5 16.5 22 12"></path></svg>
);
export const FaceIdIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}><path d="M4 8V6a2 2 0 0 1 2-2h2"></path><path d="M4 16v2a2 2 0 0 0 2 2h2"></path><path d="M16 4h2a2 2 0 0 1 2 2v2"></path><path d="M16 20h2a2 2 0 0 0 2-2v-2"></path><path d="M9 10h.01"></path><path d="M15 10h.01"></path><path d="M10 16s1 1 2 1 2-1 2-1"></path></svg>
);
export const CropIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}><path d="M6 2v14a2 2 0 0 0 2 2h14"></path><path d="M18 22V8a2 2 0 0 0-2-2H2"></path></svg>
);
export const KeyIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}><circle cx="7.5" cy="15.5" r="5.5"></circle><path d="m21 2-9.6 9.6"></path><path d="m15.5 11.5 3 3"></path></svg>
);

// NEW ICONS FOR CONTROL DECK
export const LayoutSidebarLeft: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
);
export const LayoutSidebarRight: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><line x1="15" y1="3" x2="15" y2="21"></line></svg>
);
export const ChevronDown: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}><polyline points="6 9 12 15 18 9"></polyline></svg>
);
export const ChevronRight: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}><polyline points="9 18 15 12 9 6"></polyline></svg>
);
