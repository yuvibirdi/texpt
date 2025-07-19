#!/bin/bash

# Remove duplicate handleObjectMoving functions
# Keep the first one (lines 990-1023), remove the others

# Calculate the number of lines for each function
# First function: 990-1023 = 34 lines
# Remove the duplicate at line 1108-1141 (34 lines)
sed -i '' '1108,1141d' src/components/SlideCanvas.tsx

# After removing 34 lines, line numbers shift
# The duplicate at 1219-1252 is now at line 1185-1218, remove it (34 lines)
sed -i '' '1185,1218d' src/components/SlideCanvas.tsx

# The duplicate at 1330-1363 is now at line 1262-1295, remove it (34 lines)
sed -i '' '1262,1295d' src/components/SlideCanvas.tsx

echo "Removed duplicate handleObjectMoving functions"