'use client';

import { useEffect } from 'react';

export default function TestPage() {
  console.log('🔴 TEST PAGE COMPONENT RENDERED 🔴');
  
  useEffect(() => {
    console.log('🟢 TEST PAGE useEffect EXECUTED 🟢');
    console.warn('⚠️ This is a warning message');
    console.error('❌ This is an error message');
    console.info('ℹ️ This is an info message');
    
    // Test with different styles
    console.log('%c🎨 Styled console message', 'color: orange; font-size: 20px; font-weight: bold;');
    
    // Test object logging
    console.log('📦 Object test:', { 
      message: 'Testing object logging',
      timestamp: new Date().toISOString(),
      nested: {
        value: 123,
        array: [1, 2, 3]
      }
    });
    
    // Create a visible indicator on the page
    const indicator = document.createElement('div');
    indicator.style.position = 'fixed';
    indicator.style.bottom = '20px';
    indicator.style.right = '20px';
    indicator.style.backgroundColor = 'green';
    indicator.style.color = 'white';
    indicator.style.padding = '10px';
    indicator.style.borderRadius = '5px';
    indicator.style.zIndex = '9999';
    indicator.textContent = 'Console logs should be visible!';
    document.body.appendChild(indicator);
    
    return () => {
      if (indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
      }
    };
  }, []);
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Console Log Test Page</h1>
      <p className="mb-4">Check your browser console for debug messages.</p>
      <p className="mb-4">You should see:</p>
      <ul className="list-disc list-inside space-y-2">
        <li>🔴 Component render message</li>
        <li>🟢 useEffect execution message</li>
        <li>⚠️ Warning message</li>
        <li>❌ Error message</li>
        <li>ℹ️ Info message</li>
        <li>🎨 Styled message</li>
        <li>📦 Object with nested data</li>
      </ul>
      <button 
        onClick={() => {
          console.log('🖱️ Button clicked at:', new Date().toISOString());
          alert('Check console for click message!');
        }}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Click to test console.log
      </button>
    </div>
  );
}