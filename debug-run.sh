#!/bin/bash

echo "🚀 Starting LaTeX Presentation Editor with Enhanced Debug Logging"
echo "=================================================================="
echo ""
echo "This will start the Electron app with comprehensive logging to help debug:"
echo "1. LaTeX detection issues"
echo "2. Text box functionality problems"
echo "3. Environment detection"
echo ""
echo "All debug output will be shown in this terminal."
echo "Look for these log prefixes:"
echo "  🏭 [LaTeX Compiler Factory] - Compiler selection"
echo "  🔍 [LaTeX Compiler Node] - LaTeX detection"
echo "  ⚡ [Electron Compiler] - Electron IPC"
echo "  🖥️ [Electron Main] - Main process"
echo "  🔧 [Preview Service] - Preview service"
echo "  🎣 [usePreview] - React hook"
echo "  🖼️ [PreviewPane] - UI component"
echo "  🚀 [App] - Main app component"
echo "  📝 [SlideCanvas] - Text editing"
echo ""
echo "Press Ctrl+C to stop the application"
echo "=================================================================="
echo ""

# Set environment variables for better logging
export ELECTRON_ENABLE_LOGGING=1
export ELECTRON_LOG_LEVEL=debug
export DEBUG=*

# Start the application
npm run dev

echo ""
echo "Application stopped."