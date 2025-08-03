#!/usr/bin/env node

/**
 * Simple textbox debugging script
 * This will create a minimal test case to verify textbox creation
 */

console.log('🔍 [Debug] ===== SIMPLE TEXTBOX TEST =====');

// Create a simple HTML test page to verify Fabric.js textbox behavior
const testHTML = `<!DOCTYPE html>
<html>
<head>
    <title>Textbox Visibility Test</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/fabric.js/4.6.0/fabric.min.js"></script>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            padding: 20px; 
            background: #f0f0f0;
        }
        #canvas-container { 
            background: white; 
            padding: 20px; 
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        canvas { 
            border: 2px solid #ddd; 
            border-radius: 4px;
        }
        .controls {
            margin-bottom: 20px;
        }
        button {
            padding: 10px 20px;
            margin: 5px;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        button:hover {
            background: #2563eb;
        }
        .info {
            margin-top: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 4px;
            border-left: 4px solid #3b82f6;
        }
        .log {
            background: #1f2937;
            color: #f9fafb;
            padding: 15px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
            max-height: 300px;
            overflow-y: auto;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <h1>🔍 Textbox Visibility Debug Test</h1>
    
    <div class="controls">
        <button onclick="addTextbox()">Add Textbox</button>
        <button onclick="addVisibleTextbox()">Add Visible Textbox</button>
        <button onclick="addColoredTextbox()">Add Colored Textbox</button>
        <button onclick="clearCanvas()">Clear Canvas</button>
        <button onclick="inspectCanvas()">Inspect Canvas</button>
    </div>
    
    <div id="canvas-container">
        <canvas id="testCanvas" width="800" height="600"></canvas>
    </div>
    
    <div class="info">
        <h3>Test Results:</h3>
        <div id="results">Click buttons above to test textbox visibility...</div>
        <div class="log" id="log"></div>
    </div>

    <script>
        const canvas = new fabric.Canvas('testCanvas', {
            backgroundColor: '#ffffff',
            selection: true
        });
        
        let testCount = 0;
        
        function log(message) {
            const logDiv = document.getElementById('log');
            const timestamp = new Date().toLocaleTimeString();
            logDiv.innerHTML += timestamp + ': ' + message + '\\n';
            logDiv.scrollTop = logDiv.scrollHeight;
            console.log(message);
        }
        
        function updateResults(message) {
            document.getElementById('results').innerHTML = message;
        }
        
        function addTextbox() {
            testCount++;
            log('Creating standard textbox #' + testCount);
            
            const textbox = new fabric.Textbox('Test textbox ' + testCount, {
                left: 50 + (testCount * 20),
                top: 50 + (testCount * 20),
                width: 200,
                height: 50,
                fontSize: 16,
                fontFamily: 'Arial',
                fill: '#000000',
                fontWeight: 'normal',
                fontStyle: 'normal',
                textAlign: 'left',
                editable: true,
                selectable: true,
                evented: true,
                visible: true,
                opacity: 1
            });
            
            canvas.add(textbox);
            canvas.renderAll();
            
            log('Textbox added - Objects count: ' + canvas.getObjects().length);
            updateResults('Added standard textbox #' + testCount + '. Total objects: ' + canvas.getObjects().length);
        }
        
        function addVisibleTextbox() {
            testCount++;
            log('Creating highly visible textbox #' + testCount);
            
            const textbox = new fabric.Textbox('VISIBLE TEXT ' + testCount, {
                left: 100 + (testCount * 25),
                top: 100 + (testCount * 25),
                width: 250,
                height: 60,
                fontSize: 24,
                fontFamily: 'Arial',
                fill: '#ff0000',  // Red text
                backgroundColor: '#ffff00',  // Yellow background
                fontWeight: 'bold',
                textAlign: 'center',
                editable: true,
                selectable: true,
                evented: true,
                visible: true,
                opacity: 1,
                stroke: '#0000ff',  // Blue border
                strokeWidth: 2
            });
            
            canvas.add(textbox);
            canvas.renderAll();
            
            log('Visible textbox added - Objects count: ' + canvas.getObjects().length);
            updateResults('Added visible textbox #' + testCount + '. Total objects: ' + canvas.getObjects().length);
        }
        
        function addColoredTextbox() {
            testCount++;
            log('Creating colored textbox #' + testCount);
            
            const colors = ['#ff0000', '#00ff00', '#0000ff', '#ff00ff', '#00ffff'];
            const color = colors[testCount % colors.length];
            
            const textbox = new fabric.Textbox('Color test ' + testCount, {
                left: 150 + (testCount * 30),
                top: 200 + (testCount * 30),
                width: 180,
                height: 40,
                fontSize: 18,
                fontFamily: 'Arial',
                fill: color,
                fontWeight: 'normal',
                textAlign: 'left',
                editable: true,
                selectable: true,
                evented: true,
                visible: true,
                opacity: 1
            });
            
            canvas.add(textbox);
            canvas.renderAll();
            
            log('Colored textbox added - Objects count: ' + canvas.getObjects().length);
            updateResults('Added colored textbox #' + testCount + '. Total objects: ' + canvas.getObjects().length);
        }
        
        function clearCanvas() {
            canvas.clear();
            canvas.backgroundColor = '#ffffff';
            canvas.renderAll();
            testCount = 0;
            log('Canvas cleared');
            updateResults('Canvas cleared. Objects count: ' + canvas.getObjects().length);
        }
        
        function inspectCanvas() {
            const objects = canvas.getObjects();
            log('=== CANVAS INSPECTION ===');
            log('Total objects: ' + objects.length);
            log('Canvas size: ' + canvas.width + 'x' + canvas.height);
            log('Canvas background: ' + canvas.backgroundColor);
            
            objects.forEach((obj, index) => {
                if (obj.type === 'textbox') {
                    const textbox = obj;
                    log('Object ' + index + ' (textbox):');
                    log('  Text: "' + textbox.text + '"');
                    log('  Position: (' + textbox.left + ', ' + textbox.top + ')');
                    log('  Size: ' + textbox.width + 'x' + textbox.height);
                    log('  Font: ' + textbox.fontSize + 'px ' + textbox.fontFamily);
                    log('  Fill: ' + textbox.fill);
                    log('  Visible: ' + textbox.visible);
                    log('  Opacity: ' + textbox.opacity);
                    log('  Selectable: ' + textbox.selectable);
                    log('  Editable: ' + textbox.editable);
                }
            });
            
            updateResults('Inspection complete. Check log for details.');
        }
        
        // Initial log
        log('Fabric.js textbox test initialized');
        log('Canvas size: ' + canvas.width + 'x' + canvas.height);
        log('Ready for testing...');
    </script>
</body>
</html>`;

// Write the test HTML file
const fs = require('fs');
const path = require('path');

const testFilePath = path.join(__dirname, 'test-textbox-visibility.html');
fs.writeFileSync(testFilePath, testHTML);

console.log('✅ Created test file: test-textbox-visibility.html');
console.log('📋 To test textbox visibility:');
console.log('   1. Open test-textbox-visibility.html in your browser');
console.log('   2. Click "Add Textbox" to test standard textbox creation');
console.log('   3. Click "Add Visible Textbox" for high-contrast textbox');
console.log('   4. Click "Inspect Canvas" to see object details');
console.log('   5. Compare behavior with your main application');

console.log('\n🔍 This test will help identify if the issue is:');
console.log('   - Fabric.js configuration problem');
console.log('   - Text color/background color conflict');
console.log('   - Canvas rendering issue');
console.log('   - Object positioning problem');

console.log('\n💡 If textboxes are visible in this test but not in your app:');
console.log('   - Check React component state management');
console.log('   - Verify Redux store updates');
console.log('   - Look for CSS conflicts');
console.log('   - Check canvas initialization timing');

console.log('\n🔍 [Debug] ===== SIMPLE TEST COMPLETE =====');