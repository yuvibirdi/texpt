#!/usr/bin/env node

// Debug coordinate conversion issues
console.log('🔧 Testing coordinate conversion...');

// Current conversion logic from LaTeX generator
function convertCanvasToLatexCoordinates(position, size) {
  // Standard canvas dimensions (these should match your SlideCanvas component)
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  
  // Beamer slide dimensions in cm for 16:9 aspect ratio
  // These are the actual usable dimensions within a Beamer frame
  const SLIDE_WIDTH_CM = 12.8;   // Full slide width
  const SLIDE_HEIGHT_CM = 9.6;   // Full slide height
  
  // Calculate scaling factors to map canvas pixels to LaTeX cm
  const scaleX = SLIDE_WIDTH_CM / CANVAS_WIDTH;
  const scaleY = SLIDE_HEIGHT_CM / CANVAS_HEIGHT;
  
  // Convert position with proper scaling
  // Canvas origin (0,0) is top-left, LaTeX TikZ origin is also top-left with overlay
  const x = position.x * scaleX;
  const y = position.y * scaleY;
  
  // Convert size with proper scaling
  const width = size.width * scaleX;
  const height = size.height * scaleY;
  
  console.log(`🔧 [LaTeX Generator] Coordinate conversion:`, {
    input: { x: position.x, y: position.y, width: size.width, height: size.height },
    output: { x, y, width, height },
    scales: { scaleX, scaleY },
    canvasDims: { CANVAS_WIDTH, CANVAS_HEIGHT },
    slideDims: { SLIDE_WIDTH_CM, SLIDE_HEIGHT_CM }
  });
  
  return {
    x: Math.max(0, x), // Don't clamp to slide bounds, let LaTeX handle overflow
    y: Math.max(0, y), // Don't clamp to slide bounds, let LaTeX handle overflow
    width: Math.max(0.5, width), // Minimum width
    height: Math.max(0.3, height) // Minimum height
  };
}

// Test cases
const testCases = [
  { name: "Top-left corner", position: { x: 0, y: 0 }, size: { width: 100, height: 50 } },
  { name: "Center", position: { x: 400, y: 300 }, size: { width: 200, height: 100 } },
  { name: "Bottom-right", position: { x: 700, y: 550 }, size: { width: 100, height: 50 } },
  { name: "Small text box", position: { x: 100, y: 100 }, size: { width: 150, height: 30 } },
];

console.log('\n=== Testing Current Conversion ===');
testCases.forEach(test => {
  console.log(`\n${test.name}:`);
  const result = convertCanvasToLatexCoordinates(test.position, test.size);
  console.log(`  Canvas: (${test.position.x}, ${test.position.y}) ${test.size.width}x${test.size.height}px`);
  console.log(`  LaTeX:  (${result.x.toFixed(2)}, ${result.y.toFixed(2)}) ${result.width.toFixed(2)}x${result.height.toFixed(2)}cm`);
});

// The issue is likely that Beamer slides don't actually use the full 12.8x9.6cm
// Let's try more realistic dimensions
function convertCanvasToLatexCoordinatesFixed(position, size) {
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  
  // More realistic Beamer slide usable area (accounting for margins, headers, etc.)
  // Standard Beamer slide with default margins
  const SLIDE_WIDTH_CM = 10.0;   // Usable width after margins
  const SLIDE_HEIGHT_CM = 7.5;   // Usable height after margins
  
  const scaleX = SLIDE_WIDTH_CM / CANVAS_WIDTH;
  const scaleY = SLIDE_HEIGHT_CM / CANVAS_HEIGHT;
  
  const x = position.x * scaleX;
  const y = position.y * scaleY;
  const width = size.width * scaleX;
  const height = size.height * scaleY;
  
  return { x, y, width, height };
}

console.log('\n=== Testing Fixed Conversion (Smaller Slide Area) ===');
testCases.forEach(test => {
  console.log(`\n${test.name}:`);
  const result = convertCanvasToLatexCoordinatesFixed(test.position, test.size);
  console.log(`  Canvas: (${test.position.x}, ${test.position.y}) ${test.size.width}x${test.size.height}px`);
  console.log(`  LaTeX:  (${result.x.toFixed(2)}, ${result.y.toFixed(2)}) ${result.width.toFixed(2)}x${result.height.toFixed(2)}cm`);
});

// Let's also test a simple 1:1 pixel to point conversion
function convertCanvasToLatexSimple(position, size) {
  // 1 point = 1/72 inch, 1 inch = 2.54 cm
  // So 1 point = 2.54/72 cm ≈ 0.0353 cm
  const POINT_TO_CM = 0.0353;
  
  // Assume 1 pixel ≈ 1 point for simplicity
  const x = position.x * POINT_TO_CM;
  const y = position.y * POINT_TO_CM;
  const width = size.width * POINT_TO_CM;
  const height = size.height * POINT_TO_CM;
  
  return { x, y, width, height };
}

console.log('\n=== Testing Simple 1:1 Conversion ===');
testCases.forEach(test => {
  console.log(`\n${test.name}:`);
  const result = convertCanvasToLatexSimple(test.position, test.size);
  console.log(`  Canvas: (${test.position.x}, ${test.position.y}) ${test.size.width}x${test.size.height}px`);
  console.log(`  LaTeX:  (${result.x.toFixed(2)}, ${result.y.toFixed(2)}) ${result.width.toFixed(2)}x${result.height.toFixed(2)}cm`);
});