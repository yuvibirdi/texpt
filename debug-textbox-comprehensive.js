#!/usr/bin/env node

/**
 * Comprehensive textbox debugging script
 * This will help identify the exact cause of invisible textboxes
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 [Debug] ===== COMPREHENSIVE TEXTBOX DEBUG =====');

// Read the SlideCanvas component to analyze textbox creation
const slideCanvasPath = path.join(__dirname, 'src/components/SlideCanvas.tsx');
const content = fs.readFileSync(slideCanvasPath, 'utf8');

console.log('\n🎯 Analyzing textbox creation in addTextElementAtPosition...');

// Extract the addTextElementAtPosition function
const addTextMatch = content.match(/const addTextElementAtPosition = useCallback\(([\s\S]*?)\}, \[/);
if (addTextMatch) {
  const addTextFunction = addTextMatch[1];
  console.log('✅ Found addTextElementAtPosition function');
  
  // Check the default element structure
  const elementMatch = addTextFunction.match(/const newElement: Omit<SlideElement[^}]+\}([\s\S]*?)\};/);
  if (elementMatch) {
    console.log('📋 Default element structure found');
    
    // Check for potential issues in the default values
    const hasValidPosition = addTextFunction.includes('x: Math.max(0, x - 100)');
    const hasValidSize = addTextFunction.includes('width: 200, height: 50');
    const hasValidFontSize = addTextFunction.includes('fontSize: 16');
    const hasValidTextColor = addTextFunction.includes('textColor: { r: 0, g: 0, b: 0 }');
    const hasValidContent = addTextFunction.includes("content: autoEdit ? 'Type your text here' : 'Text'");
    
    console.log('🔍 Default element validation:', {
      hasValidPosition,
      hasValidSize,
      hasValidFontSize,
      hasValidTextColor,
      hasValidContent
    });
  }
} else {
  console.log('❌ Could not find addTextElementAtPosition function');
}

console.log('\n🎨 Analyzing Fabric.js textbox creation...');

// Extract the createFabricObjectFromElement function
const fabricMatch = content.match(/const createFabricObjectFromElement = useCallback\(([\s\S]*?)\}, \[\]\);/);
if (fabricMatch) {
  const fabricFunction = fabricMatch[1];
  console.log('✅ Found createFabricObjectFromElement function');
  
  // Check textbox creation logic
  const textboxMatch = fabricFunction.match(/fabricObject = new fabric\.Textbox\(textContent, \{([\s\S]*?)\}\);/);
  if (textboxMatch) {
    const textboxConfig = textboxMatch[1];
    console.log('📋 Textbox configuration found');
    
    // Check for potential visibility issues
    const hasLeftTop = textboxConfig.includes('left: element.position.x') && textboxConfig.includes('top: element.position.y');
    const hasWidthHeight = textboxConfig.includes('width: element.size.width') && textboxConfig.includes('height: element.size.height');
    const hasFontSize = textboxConfig.includes('fontSize: element.properties.fontSize');
    const hasTextColor = textboxConfig.includes('fill: element.properties.textColor');
    const hasEditable = textboxConfig.includes('editable: true');
    const hasSelectable = textboxConfig.includes('selectable: true');
    const hasEvented = textboxConfig.includes('evented: true');
    
    console.log('🔍 Textbox configuration validation:', {
      hasLeftTop,
      hasWidthHeight,
      hasFontSize,
      hasTextColor,
      hasEditable,
      hasSelectable,
      hasEvented
    });
    
    // Check for problematic settings
    const hasIsEditing = textboxConfig.includes('isEditing: false');
    const hasVisible = textboxConfig.includes('visible:');
    const hasOpacity = textboxConfig.includes('opacity:');
    
    console.log('🚨 Potential problem indicators:', {
      hasIsEditing,
      hasVisible,
      hasOpacity
    });
  } else {
    console.log('❌ Could not find Textbox creation logic');
  }
} else {
  console.log('❌ Could not find createFabricObjectFromElement function');
}

console.log('\n📊 Analyzing element loading logic...');

// Check the useEffect that loads slide elements
const loadElementsMatch = content.match(/\/\/ Load slide elements into canvas[\s\S]*?useEffect\(\(\) => \{([\s\S]*?)\}, \[isCanvasReady, currentSlide, isTextEditing, createFabricObjectFromElement\]\);/);
if (loadElementsMatch) {
  const loadElementsFunction = loadElementsMatch[1];
  console.log('✅ Found element loading useEffect');
  
  // Check for potential issues
  const hasClearCanvas = loadElementsFunction.includes('canvas.clear()');
  const hasForEachElement = loadElementsFunction.includes('currentSlide.elements.forEach');
  const hasRenderAll = loadElementsFunction.includes('canvas.renderAll()');
  const hasTextEditingCheck = loadElementsFunction.includes('if (isTextEditing)');
  
  console.log('🔍 Element loading validation:', {
    hasClearCanvas,
    hasForEachElement,
    hasRenderAll,
    hasTextEditingCheck
  });
  
  // Check if text editing check might be blocking updates
  if (hasTextEditingCheck) {
    console.log('⚠️  WARNING: Text editing check might be preventing canvas updates');
    console.log('   This could cause textboxes to not appear if isTextEditing is stuck as true');
  }
} else {
  console.log('❌ Could not find element loading useEffect');
}

console.log('\n🎯 Specific issue analysis...');

// Check for the most likely causes based on the code structure
const likelyCauses = [];

// Issue 1: Text editing state stuck
if (content.includes('if (isTextEditing)') && content.includes('return;')) {
  likelyCauses.push('isTextEditing state might be stuck as true, preventing canvas updates');
}

// Issue 2: Canvas not ready
if (content.includes('if (!isCanvasReady')) {
  likelyCauses.push('Canvas might not be properly initialized (isCanvasReady = false)');
}

// Issue 3: Missing currentSlide
if (content.includes('if (!currentSlide)')) {
  likelyCauses.push('currentSlide might be null or undefined');
}

// Issue 4: Element ID issues
if (content.includes('elementId: element.id')) {
  likelyCauses.push('Element ID generation or assignment might be failing');
}

// Issue 5: Fabric canvas reference issues
if (content.includes('fabricCanvasRef.current')) {
  likelyCauses.push('Fabric canvas reference might be null');
}

console.log('🚨 Most likely causes of invisible textboxes:');
likelyCauses.forEach((cause, index) => {
  console.log(`   ${index + 1}. ${cause}`);
});

console.log('\n💡 Debugging steps to try:');
console.log('1. Check browser console for "isTextEditing state changed to:" logs');
console.log('2. Look for "COMPONENT MOUNTING" and "Canvas state:" logs');
console.log('3. Verify "Creating new text element:" and "Element added successfully" logs');
console.log('4. Check if "Skipping canvas update - user is editing text" appears');
console.log('5. Look for "Creating Fabric.Textbox with config:" logs');
console.log('6. Inspect the actual canvas DOM element in browser dev tools');

console.log('\n🔧 Quick fixes to try:');
console.log('1. Refresh the page to reset isTextEditing state');
console.log('2. Try clicking elsewhere on canvas before adding text');
console.log('3. Check if textboxes appear after zooming in/out');
console.log('4. Try adding text with different tools (keyboard shortcut vs button)');

console.log('\n🔍 [Debug] ===== COMPREHENSIVE DEBUG COMPLETE =====');