#!/usr/bin/env node

/**
 * Debug script to test textbox visibility issues
 * This script will help identify why textboxes are not visible on the canvas
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 [Debug] ===== TEXTBOX VISIBILITY DEBUG =====');

// Test 1: Check if the issue is in the Redux store
console.log('\n📊 Test 1: Checking Redux store structure...');

// Read the presentation slice to understand the data flow
const presentationSlicePath = path.join(__dirname, 'src/store/slices/presentationSlice.ts');
if (fs.existsSync(presentationSlicePath)) {
  const content = fs.readFileSync(presentationSlicePath, 'utf8');
  
  // Check if addElement reducer is properly implemented
  const hasAddElement = content.includes('addElement:');
  const hasElementPush = content.includes('slide.elements.push');
  
  console.log('✅ Redux store checks:', {
    hasAddElementReducer: hasAddElement,
    hasElementPushLogic: hasElementPush
  });
} else {
  console.log('❌ Could not find presentation slice file');
}

// Test 2: Check SlideCanvas component for textbox rendering
console.log('\n🎨 Test 2: Checking SlideCanvas textbox rendering...');

const slideCanvasPath = path.join(__dirname, 'src/components/SlideCanvas.tsx');
if (fs.existsSync(slideCanvasPath)) {
  const content = fs.readFileSync(slideCanvasPath, 'utf8');
  
  // Check key textbox-related functionality
  const hasTextboxCreation = content.includes('new fabric.Textbox');
  const hasAddTextElement = content.includes('addTextElementAtPosition');
  const hasTextToolHandling = content.includes("activeTool === 'text'");
  const hasCanvasAdd = content.includes('canvas.add(');
  const hasRenderAll = content.includes('canvas.renderAll()');
  
  console.log('✅ SlideCanvas checks:', {
    hasTextboxCreation,
    hasAddTextElement,
    hasTextToolHandling,
    hasCanvasAdd,
    hasRenderAll
  });
  
  // Check for potential visibility issues
  const hasVisibleProperty = content.includes('visible:');
  const hasOpacityZero = content.includes('opacity: 0');
  const hasDisplayNone = content.includes('display: none');
  
  console.log('🔍 Potential visibility issues:', {
    hasVisibleProperty,
    hasOpacityZero,
    hasDisplayNone
  });
} else {
  console.log('❌ Could not find SlideCanvas component file');
}

// Test 3: Check for common Fabric.js textbox issues
console.log('\n📝 Test 3: Common Fabric.js textbox issues...');

const commonIssues = [
  'Text color same as background (white on white)',
  'Font size too small (0 or negative)',
  'Position outside canvas bounds',
  'Width/height set to 0',
  'Opacity set to 0',
  'Z-index issues',
  'Canvas not properly initialized',
  'Text content empty or undefined'
];

console.log('🚨 Common textbox visibility issues to check:');
commonIssues.forEach((issue, index) => {
  console.log(`   ${index + 1}. ${issue}`);
});

// Test 4: Generate a test case
console.log('\n🧪 Test 4: Generating test case...');

const testCase = {
  slideId: 'test-slide-123',
  element: {
    type: 'text',
    position: { x: 100, y: 100 },
    size: { width: 200, height: 50 },
    properties: {
      fontSize: 16,
      fontFamily: 'Arial',
      textColor: { r: 0, g: 0, b: 0, a: 1 },
      fontWeight: 'normal',
      fontStyle: 'normal',
      textAlign: 'left',
      opacity: 1,
    },
    content: 'Test textbox content',
  }
};

console.log('📋 Test textbox element structure:');
console.log(JSON.stringify(testCase, null, 2));

// Test 5: Check for console errors in logs
console.log('\n📋 Test 5: Checking for errors in logs...');

const logsPath = path.join(__dirname, 'logs.txt');
if (fs.existsSync(logsPath)) {
  const logs = fs.readFileSync(logsPath, 'utf8');
  const errorLines = logs.split('\n').filter(line => 
    line.includes('ERROR') || 
    line.includes('❌') || 
    line.includes('error') ||
    line.includes('failed')
  );
  
  if (errorLines.length > 0) {
    console.log('🚨 Found potential errors in logs:');
    errorLines.slice(-5).forEach(line => console.log(`   ${line}`));
  } else {
    console.log('✅ No obvious errors found in logs');
  }
} else {
  console.log('❌ Could not find logs file');
}

// Test 6: Recommendations
console.log('\n💡 Recommendations for debugging:');
console.log('1. Check browser console for JavaScript errors');
console.log('2. Inspect the canvas element in browser dev tools');
console.log('3. Verify textbox properties (color, size, position)');
console.log('4. Check if canvas.renderAll() is being called');
console.log('5. Ensure Redux state is updating correctly');
console.log('6. Test with a simple hardcoded textbox first');

console.log('\n🔍 [Debug] ===== DEBUG COMPLETE =====');