#!/bin/bash

# Remove duplicate handleObjectMoved functions
# Keep the first one (lines 1025-1028), remove the others

# Each function is 4 lines long
# Remove the duplicate at line 1109-1112 (4 lines)
sed -i '' '1109,1112d' src/components/SlideCanvas.tsx

# After removing 4 lines, line numbers shift
# The duplicate at 1186-1189 is now at line 1182-1185, remove it (4 lines)
sed -i '' '1182,1185d' src/components/SlideCanvas.tsx

# The duplicate at 1263-1266 is now at line 1255-1258, remove it (4 lines)
sed -i '' '1255,1258d' src/components/SlideCanvas.tsx

echo "Removed duplicate handleObjectMoved functions"