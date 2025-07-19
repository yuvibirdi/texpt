#!/bin/bash

# Remove duplicate handleFilesDrop functions
# Keep the first one (lines 942-987), remove the others

# Calculate the number of lines for each function
# First function: 942-987 = 46 lines
# Remove the duplicate at line 1106-1151 (46 lines)
sed -i '' '1106,1151d' src/components/SlideCanvas.tsx

# After removing 46 lines, line numbers shift
# The duplicate at 1263-1308 is now at line 1217-1262, remove it (46 lines)
sed -i '' '1217,1262d' src/components/SlideCanvas.tsx

# The duplicate at 1420-1465 is now at line 1328-1373, remove it (46 lines)
sed -i '' '1328,1373d' src/components/SlideCanvas.tsx

echo "Removed duplicate handleFilesDrop functions"