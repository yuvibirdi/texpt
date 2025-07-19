#!/bin/bash

# Remove duplicate Z-index management functions
# Keep the first set (lines 1031-1095), remove the others

# Each set contains 4 functions, each about 16 lines, so about 64 lines total per set
# Remove the duplicate set at line 1111-1175 (64 lines)
sed -i '' '1111,1175d' src/components/SlideCanvas.tsx

# After removing 64 lines, line numbers shift
# The duplicate set at 1184-1248 is now at line 1120-1184, remove it (64 lines)
sed -i '' '1120,1184d' src/components/SlideCanvas.tsx

# The duplicate set at 1257-1321 is now at line 1129-1193, remove it (64 lines)
sed -i '' '1129,1193d' src/components/SlideCanvas.tsx

echo "Removed duplicate Z-index management functions"