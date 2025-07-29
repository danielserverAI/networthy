import React from 'react';
import { TestChart } from './components/TestChart';

export function TestApp() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Chart Issue Test</h1>
        <TestChart />
      </div>
    </div>
  );
}