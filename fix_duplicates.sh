#!/bin/bash

# Remove the duplicate handleToolbarDragStart function at line 1322 (and the comment before it)
# This removes lines 1321-1333 (13 lines total)
sed -i '' '1321,1333d' src/components/SlideCanvas.tsx

# After removing the first duplicate, the line numbers shift, so we need to recalculate
# The second duplicate was at line 1552, but after removing 13 lines, it's now at line 1539
# Remove lines 1538-1550 (13 lines total)
sed -i '' '1538,1550d' src/components/SlideCanvas.tsx

echo "Removed duplicate handleToolbarDragStart functions"