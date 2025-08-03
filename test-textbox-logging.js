#!/usr/bin/env node

console.log('🧪 Testing textbox logging setup...');

const fs = require('fs');

// Check if all the logging has been added correctly
const filesToCheck = [
  {
    path: 'src/components/SlideCanvas.tsx',
    expectedLogs: [
      '🎯 [SlideCanvas] ===== ADD TEXT ELEMENT AT POSITION =====',
      '🔘 [SlideCanvas] ===== TEXT BUTTON CLICKED =====',
      '🖱️ [SlideCanvas] ===== DOUBLE CLICK EVENT =====',
      '🎯 [SlideCanvas] ===== SELECTION CREATED =====',
      '🚫 [SlideCanvas] ===== SELECTION CLEARED ====='
    ]
  },
  {
    path: 'src/store/slices/presentationSlice.ts',
    expectedLogs: [
      '🏪 [Redux] ===== ADD ELEMENT ACTION ====='
    ]
  },
  {
    path: 'src/store/slices/uiSlice.ts',
    expectedLogs: [
      '🔧 [UI Redux] ===== SET ACTIVE TOOL ====='
    ]
  },
  {
    path: 'src/index.tsx',
    expectedLogs: [
      '🎯 [Fabric.Textbox] ===== ENTER EDITING CALLED ====='
    ]
  }
];

let allLogsPresent = true;

filesToCheck.forEach(file => {
  console.log(`\n🔍 Checking ${file.path}...`);
  
  try {
    const content = fs.readFileSync(file.path, 'utf8');
    
    file.expectedLogs.forEach(expectedLog => {
      if (content.includes(expectedLog)) {
        console.log(`  ✅ Found: ${expectedLog}`);
      } else {
        console.log(`  ❌ Missing: ${expectedLog}`);
        allLogsPresent = false;
      }
    });
  } catch (error) {
    console.error(`  ❌ Error reading ${file.path}:`, error.message);
    allLogsPresent = false;
  }
});

console.log('\n📋 Summary:');
if (allLogsPresent) {
  console.log('✅ All logging appears to be in place!');
  console.log('\n🚀 Next steps:');
  console.log('1. Start the development server: npm start');
  console.log('2. Open browser developer tools (F12)');
  console.log('3. Go to Console tab');
  console.log('4. Try clicking the "📝 Text" button');
  console.log('5. Try double-clicking on text elements');
  console.log('6. Watch for detailed logs with prefixes like:');
  console.log('   - 🎯 [SlideCanvas] for canvas events');
  console.log('   - 🏪 [Redux] for state changes');
  console.log('   - 🔧 [UI Redux] for tool changes');
  console.log('   - 🎯 [Fabric.Textbox] for Fabric.js events');
} else {
  console.log('❌ Some logging is missing. Please check the files above.');
}

console.log('\n🔍 Additional debugging tips:');
console.log('- Look for console errors in red');
console.log('- Check if Fabric.js is loading properly');
console.log('- Verify that the canvas is being created');
console.log('- Make sure Redux actions are being dispatched');