import { useState, useCallback, useMemo } from 'react';
import type { Landmark, ComprehensiveAnalysisData } from '../types';

interface FacialVectorState {
  vectorData: { landmarks: Landmark[] } | null;
  isLoading: boolean;
  error: string | null;
  isCached: boolean;
}

/**
 * RE-ENGINEERED: This hook now returns a stable `handlers` object to prevent
 * causing infinite re-render loops in parent components that use it as a
 * dependency in `useEffect`.
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

  // By memoizing the handlers object, we ensure it has a stable reference,
  // which is critical for useEffect dependency arrays in parent components.
  const handlers = useMemo(() => ({
    handleAnalysisStart,
    handleAnalysisSuccess,
    handleAnalysisError,
    reset,
  }), [handleAnalysisStart, handleAnalysisSuccess, handleAnalysisError, reset]);

  return {
    state,
    handlers,
  };
};