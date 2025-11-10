import { useState, useCallback } from 'react';
import type { Landmark, ComprehensiveAnalysisData } from '../types';

interface FacialVectorState {
  vectorData: { landmarks: Landmark[] } | null;
  isLoading: boolean;
  error: string | null;
  isCached: boolean;
}

/**
 * This hook is designed to manage the state for the facial vector analysis display.
 * In the current architecture, it doesn't perform its own API calls. Instead,
 * it should be updated by the main App component after the primary 
 * comprehensive analysis is complete, which already contains the landmark data.
 */
export const useFacialVectorAnalysis = () => {
  const [state, setState] = useState<FacialVectorState>({
    vectorData: null,
    isLoading: false,
    error: null,
    isCached: false,
  });

  // Called by the parent component when the main analysis starts
  const handleAnalysisStart = useCallback(() => {
    setState({
      vectorData: null,
      isLoading: true,
      error: null,
      isCached: false,
    });
  }, []);

  // Called by the parent component on successful main analysis
  const handleAnalysisSuccess = useCallback((analysisData: ComprehensiveAnalysisData, isCached: boolean) => {
    setState({
      vectorData: { landmarks: analysisData.landmarks },
      isLoading: false,
      error: null,
      isCached,
    });
  }, []);

  // Called by the parent component on failed main analysis
  const handleAnalysisError = useCallback((error: string) => {
    setState({
      vectorData: null,
      isLoading: false,
      error: error,
      isCached: false,
    });
  }, []);

  // Called when inputs are cleared
  const reset = useCallback(() => {
    setState({
      vectorData: null,
      isLoading: false,
      error: null,
      isCached: false,
    });
  }, []);

  return {
    ...state,
    handleAnalysisStart,
    handleAnalysisSuccess,
    handleAnalysisError,
    reset,
  };
};
