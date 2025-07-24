import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { fabric } from 'fabric';
import { store } from './store';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

console.log('🔥 [INDEX] ===== INDEX.TSX LOADING =====');
console.log('🔥 [INDEX] React version:', React.version);
console.log('🔥 [INDEX] Fabric version:', fabric?.version || 'not loaded');

// Additional debugging for textbox interactions
console.log('🔍 [DEBUG] Fabric.js Textbox debugging enabled');

// Override Textbox enterEditing method to add logging
if (fabric && fabric.Textbox) {
  const originalEnterEditing = fabric.Textbox.prototype.enterEditing;
  fabric.Textbox.prototype.enterEditing = function() {
    console.log('🎯 [Fabric.Textbox] ===== ENTER EDITING CALLED =====');
    console.log('🎯 [Fabric.Textbox] Textbox state:', {
      text: this.text,
      editable: this.editable,
      selectable: this.selectable,
      evented: this.evented,
      isEditing: this.isEditing,
      canvas: !!this.canvas,
      elementId: this.data?.elementId
    });
    
    const result = originalEnterEditing.call(this);
    
    console.log('✅ [Fabric.Textbox] Enter editing completed, new state:', {
      isEditing: this.isEditing,
      hiddenTextarea: !!this.hiddenTextarea
    });
    
    return result;
  };
  
  const originalExitEditing = fabric.Textbox.prototype.exitEditing;
  fabric.Textbox.prototype.exitEditing = function() {
    console.log('🚪 [Fabric.Textbox] ===== EXIT EDITING CALLED =====');
    console.log('🚪 [Fabric.Textbox] Textbox state before exit:', {
      text: this.text,
      isEditing: this.isEditing,
      elementId: this.data?.elementId
    });
    
    const result = originalExitEditing.call(this);
    
    console.log('✅ [Fabric.Textbox] Exit editing completed');
    return result;
  };
}

console.log('🔥 [INDEX] Creating React root...');
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

console.log('🔥 [INDEX] Rendering React app...');
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </Provider>
  </React.StrictMode>
);

console.log('🔥 [INDEX] React app render called');