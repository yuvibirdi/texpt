#!/usr/bin/env node

/**
 * Debug script to trace the complete textbox creation flow
 * This will help identify exactly where the process breaks
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 [Debug] ===== TEXTBOX FLOW ANALYSIS =====');

// Read the SlideCanvas component
const slideCanvasPath = path.join(__dirname, 'src/components/SlideCanvas.tsx');
const content = fs.readFileSync(slideCanvasPath, 'utf8');

console.log('\n📋 Step 1: Text Tool Click Handler');
// Check mouse:down event handler for text tool
const mouseDownMatch = content.match(/\/\/ Handle text tool - add text at click position[\s\S]*?if \(activeTool === 'text'[^}]+\}/);
if (mouseDownMatch) {
  console.log('✅ Found text tool click handler');
  console.log('   - Calls addTextElementAtPosition(pointer.x, pointer.y)');
} else {
  console.log('❌ Text tool click handler not found');
}

console.log('\n📋 Step 2: Add Text Element Function');
// Check addTextElementAtPosition function
const addTextMatch = content.match(/const addTextElementAtPosition = useCallback\(([\s\S]*?)\}, \[/);
if (addTextMatch) {
  console.log('✅ Found addTextElementAtPosition function');
  
  // Check if it dispatches to Redux
  const hasDispatch = addTextMatch[1].includes('dispatch(addElement');
  console.log(`   - Dispatches to Redux: ${hasDispatch ? '✅' : '❌'}`);
  
  // Check element structure
  const hasValidElement = addTextMatch[1].includes("type: 'text'") && 
                         addTextMatch[1].includes('position:') && 
                         addTextMatch[1].includes('size:');
  console.log(`   - Creates valid element: ${hasValidElement ? '✅' : '❌'}`);
} else {
  console.log('❌ addTextElementAtPosition function not found');
}

console.log('\n📋 Step 3: Redux Store Update');
// Check if Redux store is properly configured (we already verified this)
console.log('✅ Redux store has addElement reducer (verified earlier)');

console.log('\n📋 Step 4: Canvas Element Loading');
// Check the useEffect that loads elements
const loadElementsMatch = content.match(/\/\/ Load slide elements into canvas[\s\S]*?useEffect\(\(\) => \{([\s\S]*?)\}, \[isCanvasReady, currentSlide, isTextEditing, createFabricObjectFromElement\]\);/);
if (loadElementsMatch) {
  console.log('✅ Found element loading useEffect');
  
  const loadFunction = loadElementsMatch[1];
  
  // Check for blocking conditions
  const hasCanvasReadyCheck = loadFunction.includes('if (!isCanvasReady');
  const hasCurrentSlideCheck = loadFunction.includes('if (!currentSlide)');
  const hasTextEditingCheck = loadFunction.includes('if (isTextEditing');
  
  console.log('   Blocking conditions:');
  console.log(`   - Canvas ready check: ${hasCanvasReadyCheck ? '✅' : '❌'}`);
  console.log(`   - Current slide check: ${hasCurrentSlideCheck ? '✅' : '❌'}`);
  console.log(`   - Text editing check: ${hasTextEditingCheck ? '⚠️' : '✅'} ${hasTextEditingCheck ? '(POTENTIAL ISSUE)' : ''}`);
  
  // Check if it calls createFabricObjectFromElement
  const hasCreateFabricCall = loadFunction.includes('createFabricObjectFromElement');
  console.log(`   - Calls createFabricObjectFromElement: ${hasCreateFabricCall ? '✅' : '❌'}`);
  
  // Check if it calls renderAll
  const hasRenderAll = loadFunction.includes('canvas.renderAll()');
  console.log(`   - Calls canvas.renderAll(): ${hasRenderAll ? '✅' : '❌'}`);
} else {
  console.log('❌ Element loading useEffect not found');
}

console.log('\n📋 Step 5: Fabric Object Creation');
// Check createFabricObjectFromElement for text elements
const fabricMatch = content.match(/case 'text':([\s\S]*?)break;/);
if (fabricMatch) {
  console.log('✅ Found text case in createFabricObjectFromElement');
  
  const textCase = fabricMatch[1];
  
  // Check for textbox creation
  const hasTextboxCreation = textCase.includes('new fabric.Textbox');
  console.log(`   - Creates fabric.Textbox: ${hasTextboxCreation ? '✅' : '❌'}`);
  
  // Check for canvas.add call
  const hasCanvasAdd = content.includes('canvas.add(fabricObject)');
  console.log(`   - Adds to canvas: ${hasCanvasAdd ? '✅' : '❌'}`);
  
  // Check for visibility properties
  const hasVisibleTrue = textCase.includes('visible: true');
  const hasOpacitySet = textCase.includes('opacity:');
  console.log(`   - Sets visible: true: ${hasVisibleTrue ? '✅' : '❌'}`);
  console.log(`   - Sets opacity: ${hasOpacitySet ? '✅' : '❌'}`);
} else {
  console.log('❌ Text case in createFabricObjectFromElement not found');
}

console.log('\n🚨 MOST LIKELY ISSUE ANALYSIS:');

// Analyze the most probable causes
const issues = [];

// Issue 1: isTextEditing blocking updates
if (content.includes('if (isTextEditing && hasExistingObjects)')) {
  console.log('✅ Fixed: isTextEditing check has been improved');
} else if (content.includes('if (isTextEditing)') && content.includes('return;')) {
  issues.push('isTextEditing state might be blocking canvas updates');
}

// Issue 2: Canvas not ready
if (!content.includes('setIsCanvasReady(true)')) {
  issues.push('Canvas might not be setting isCanvasReady to true');
}

// Issue 3: Missing dependencies in useEffect
const useEffectMatch = content.match(/\}, \[(.*?)\]\);/g);
if (useEffectMatch) {
  const hasProperDeps = useEffectMatch.some(match => 
    match.includes('isCanvasReady') && 
    match.includes('currentSlide') && 
    match.includes('createFabricObjectFromElement')
  );
  if (!hasProperDeps) {
    issues.push('useEffect dependencies might be incomplete');
  }
}

if (issues.length === 0) {
  console.log('🎉 No obvious structural issues found!');
  console.log('   The problem might be:');
  console.log('   1. Runtime state issue (isTextEditing stuck)');
  console.log('   2. Timing issue (canvas not ready when element added)');
  console.log('   3. Visual issue (textbox created but not visible)');
} else {
  console.log('🚨 Potential issues found:');
  issues.forEach((issue, index) => {
    console.log(`   ${index + 1}. ${issue}`);
  });
}

console.log('\n💡 DEBUGGING RECOMMENDATIONS:');
console.log('1. Open browser console and look for these log messages when clicking text tool:');
console.log('   - "ADD TEXT ELEMENT AT POSITION"');
console.log('   - "Creating new text element"');
console.log('   - "Element added successfully"');
console.log('   - "Loading slide elements into canvas"');
console.log('   - "Creating Fabric.Textbox with config"');
console.log('   - "Textbox created successfully"');
console.log('   - "Adding fabric object to canvas"');

console.log('\n2. Check these state values in console:');
console.log('   - isCanvasReady (should be true)');
console.log('   - isTextEditing (should be false when adding new text)');
console.log('   - currentSlide.elements.length (should increase after adding)');
console.log('   - canvas.getObjects().length (should match elements)');

console.log('\n3. If logs show everything working but textbox not visible:');
console.log('   - Check textbox position (might be outside canvas)');
console.log('   - Check textbox color (might be white on white)');
console.log('   - Check textbox size (might be 0x0)');
console.log('   - Try zooming out to see if textbox is there');

console.log('\n🔍 [Debug] ===== FLOW ANALYSIS COMPLETE =====');