#!/bin/bash

# Remove duplicate handleDrop functions
# Keep the first one (lines 887-940), remove the others

# Remove the duplicate at line 1105-1158 (54 lines)
sed -i '' '1105,1158d' src/components/SlideCanvas.tsx

# After removing 54 lines, line numbers shift
# The duplicate at 1316-1369 is now at line 1262-1315, remove it (54 lines)
sed -i '' '1262,1315d' src/components/SlideCanvas.tsx

# The duplicate at 1527-1580 is now at line 1419-1472, remove it (54 lines)
sed -i '' '1419,1472d' src/components/SlideCanvas.tsx

echo "Removed duplicate handleDrop functions"