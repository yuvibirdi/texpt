#!/bin/bash

# Remove duplicate handleDragOver functions
# Keep the first one at line 879, remove the others

# Remove the duplicate at line 1105 (and a few lines after it)
sed -i '' '1105,1110d' src/components/SlideCanvas.tsx

# After removing 6 lines, the line numbers shift
# The duplicate at 1322 is now at line 1316, remove it
sed -i '' '1316,1321d' src/components/SlideCanvas.tsx

# The duplicate at 1539 is now at line 1527, remove it  
sed -i '' '1527,1532d' src/components/SlideCanvas.tsx

echo "Removed duplicate handleDragOver functions"