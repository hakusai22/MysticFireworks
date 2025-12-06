import React from 'react';

interface UIOverlayProps {
  status?: string; // Kept optional for compatibility but unused visually
}

const UIOverlay: React.FC<UIOverlayProps> = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-20 flex flex-col justify-between p-6 border-[12px] border-double border-[#d4af37]/30">
      
      {/* Decorative Corners only - Text removed for immersion */}
      <div className="absolute top-4 left-4 w-16 h-16 border-t-2 border-l-2 border-[#d4af37]"></div>
      <div className="absolute top-4 right-4 w-16 h-16 border-t-2 border-r-2 border-[#d4af37]"></div>
      <div className="absolute bottom-4 left-4 w-16 h-16 border-b-2 border-l-2 border-[#d4af37]"></div>
      <div className="absolute bottom-4 right-4 w-16 h-16 border-b-2 border-r-2 border-[#d4af37]"></div>
      
      {/* Subtle Inner Frame Element */}
      <div className="absolute inset-8 border border-[#d4af37]/10 pointer-events-none"></div>
    </div>
  );
};

export default UIOverlay;