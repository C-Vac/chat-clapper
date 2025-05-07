// src/candidateComponents.ts
import React from 'react';
// Assuming AppProps is defined in App.tsx and exported, or in a shared types file
// If it's in App.tsx, you might need to adjust the import path or move AppProps.
// For this example, let's assume you'll move/export AppProps.
import type { AppProps } from './App'; // Or from './types';

// Define a type for components that accept AppProps
type CandidateComponentType = React.ComponentType<AppProps>;

interface CandidateManifestEntry {
  filename: string;
  description?: string; // Optional description for the dropdown
  lazyComponent: React.LazyExoticComponent<CandidateComponentType>;
}

// The manifest object now holds lazy components
export const candidateManifest: Record<string, CandidateManifestEntry> = {
  BaselineA: {
    filename: 'BaselineA.tsx',
    description: 'Baseline A Implementation',
    lazyComponent: React.lazy(() => 
      import('./responses/BaselineA').then(module => ({ default: module.default as CandidateComponentType }))
    ),
  },
  BaselineB: {
    filename: 'BaselineB.tsx',
    description: 'Baseline B Implementation',
    lazyComponent: React.lazy(() => 
      import('./responses/BaselineB').then(module => ({ default: module.default as CandidateComponentType }))
    ),
  },
  ModelA: {
    filename: 'ModelA.tsx',
    description: 'AI Model A Output',
    lazyComponent: React.lazy(() => 
      import('./responses/ModelA').then(module => ({ default: module.default as CandidateComponentType }))
    ),
  },
  ModelB: {
    filename: 'ModelB.tsx',
    description: 'AI Model B Output',
    lazyComponent: React.lazy(() => 
      import('./responses/ModelB').then(module => ({ default: module.default as CandidateComponentType }))
    ),
  },
  ModelC: {
    filename: 'ModelC.tsx',
    description: 'AI Model C Output',
    lazyComponent: React.lazy(() => 
      import('./responses/ModelC').then(module => ({ default: module.default as CandidateComponentType }))
    ),
  },
  // Add more candidates here following the same pattern
};

export type CandidateKey = keyof typeof candidateManifest;