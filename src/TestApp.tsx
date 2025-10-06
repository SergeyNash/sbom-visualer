import React from 'react';

const TestApp: React.FC = () => {
  return (
    <div style={{ padding: '20px', backgroundColor: '#1a1a1a', color: 'white', minHeight: '100vh' }}>
      <h1>SBOM Analyzer - Test Mode</h1>
      <p>If you can see this, React is working!</p>
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#333', borderRadius: '5px' }}>
        <h2>Status Check:</h2>
        <ul>
          <li>✅ React is loaded</li>
          <li>✅ TypeScript is working</li>
          <li>✅ Vite is running</li>
        </ul>
      </div>
    </div>
  );
};

export default TestApp;
