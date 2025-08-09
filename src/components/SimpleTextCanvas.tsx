import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { addElement, updateElement, deleteElement } from '../store/slices/presentationSlice';
import { SlideElement } from '../types/presentation';

interface SimpleTextCanvasProps {
  slideId: string;
}

const SimpleTextCanvas: React.FC<SimpleTextCanvasProps> = ({
  slideId
}) => {
  console.log('🔥 [SimpleTextCanvas] ===== COMPONENT MOUNTING =====');
  console.log('🔥 [SimpleTextCanvas] Props:', { slideId });

  // State for responsive canvas dimensions
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

  const dispatch = useDispatch();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [fontSizeInput, setFontSizeInput] = useState<string>('16');
  const [currentTextColor, setCurrentTextColor] = useState<string>('#000000');
  const [showOutOfBoundsWarning] = useState<boolean>(false);
  const fontSizeDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Get current slide data from Redux store
  const presentation = useSelector((state: RootState) => state.presentation.currentPresentation);
  const currentSlide = presentation?.slides.find(slide => slide.id === slideId);

  console.log('🔥 [SimpleTextCanvas] Redux state:', {
    hasPresentation: !!presentation,
    hasCurrentSlide: !!currentSlide,
    slideElementsCount: currentSlide?.elements?.length || 0
  });

  // Calculate responsive canvas dimensions
  useEffect(() => {
    const calculateCanvasSize = () => {
      if (!containerRef.current) return;
      
      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      
      // Get available space (subtract padding and toolbar space)
      const availableWidth = containerRect.width - 40; // 20px padding on each side
      const availableHeight = containerRect.height - 200; // Space for toolbars and padding
      
      // Canvas dimensions that exactly match PDF page (1:1)
      // PDF usable area: 15.3cm x 7.3cm
      // Use a base size that matches this ratio exactly
      const BASE_WIDTH = 800;  // Base canvas width
      const BASE_HEIGHT = Math.round(BASE_WIDTH * (7.3 / 15.3)); // ~382px to match PDF ratio
      
      // Calculate scale factor to fit available space
      const scaleX = availableWidth / BASE_WIDTH;
      const scaleY = availableHeight / BASE_HEIGHT;
      const scale = Math.min(scaleX, scaleY, 2.5); // Max 2.5x zoom
      
      // Apply scale but keep exact PDF proportions
      const canvasWidth = BASE_WIDTH * Math.max(scale, 0.5); // Min 0.5x scale
      const canvasHeight = BASE_HEIGHT * Math.max(scale, 0.5);
      
      console.log('📐 [SimpleTextCanvas] Canvas size calculation:', {
        containerSize: { width: containerRect.width, height: containerRect.height },
        availableSpace: { width: availableWidth, height: availableHeight },
        baseSize: { width: BASE_WIDTH, height: BASE_HEIGHT },
        scale: scale.toFixed(2),
        finalSize: { width: canvasWidth, height: canvasHeight },
        aspectRatio: (canvasWidth / canvasHeight).toFixed(3)
      });
      
      setCanvasDimensions({ width: Math.round(canvasWidth), height: Math.round(canvasHeight) });
    };

    // Initial calculation
    const timer = setTimeout(calculateCanvasSize, 100); // Small delay to ensure container is rendered

    // Set up resize observer for responsive behavior
    const resizeObserver = new ResizeObserver(() => {
      calculateCanvasSize();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Also listen to window resize as fallback
    window.addEventListener('resize', calculateCanvasSize);

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      window.removeEventListener('resize', calculateCanvasSize);
    };
  }, []);

  // Initialize Fabric.js canvas
  useEffect(() => {
    console.log('🔥 [SimpleTextCanvas] ===== INITIALIZING CANVAS =====');
    console.log('🔥 [SimpleTextCanvas] Canvas ref:', !!canvasRef.current);

    if (!canvasRef.current) {
      console.error('❌ [SimpleTextCanvas] Canvas ref is null');
      return;
    }

    try {
      const canvas = new fabric.Canvas(canvasRef.current, {
        width: canvasDimensions.width,
        height: canvasDimensions.height,
        backgroundColor: '#ffffff',
        selection: true,
        preserveObjectStacking: true,
      });

      console.log('✅ [SimpleTextCanvas] Fabric canvas created successfully');
      fabricCanvasRef.current = canvas;
      setIsCanvasReady(true);

      // Canvas bounds constraint temporarily disabled to debug scaling issues

      // Selection event handlers for formatting
      canvas.on('selection:created', (e) => {
        console.log('🎯 [SimpleTextCanvas] ===== SELECTION CREATED =====');
        const selectedObject = e.selected?.[0];
        console.log('🎯 [SimpleTextCanvas] Selected object:', selectedObject?.type, selectedObject?.data);

        if (selectedObject && selectedObject.data?.elementId) {
          setSelectedObject(selectedObject);
          setSelectedElementId(selectedObject.data.elementId);

          // Update font size input and color if it's a textbox
          if (selectedObject.type === 'textbox') {
            const textbox = selectedObject as fabric.Textbox;
            setFontSizeInput((textbox.fontSize || 16).toString());
            setCurrentTextColor(getCurrentTextColor(textbox));
          }

          console.log('✅ [SimpleTextCanvas] Selection state updated');
        }
      });

      canvas.on('selection:updated', (e) => {
        console.log('🎯 [SimpleTextCanvas] ===== SELECTION UPDATED =====');
        const selectedObject = e.selected?.[0];

        if (selectedObject && selectedObject.data?.elementId) {
          setSelectedObject(selectedObject);
          setSelectedElementId(selectedObject.data.elementId);

          // Update font size input and color if it's a textbox
          if (selectedObject.type === 'textbox') {
            const textbox = selectedObject as fabric.Textbox;
            setFontSizeInput((textbox.fontSize || 16).toString());
            setCurrentTextColor(getCurrentTextColor(textbox));
          }

          console.log('✅ [SimpleTextCanvas] Selection updated');
        }
      });

      canvas.on('selection:cleared', () => {
        console.log('🚫 [SimpleTextCanvas] ===== SELECTION CLEARED =====');
        setSelectedObject(null);
        setSelectedElementId(null);
        console.log('✅ [SimpleTextCanvas] Selection cleared');
      });

      canvas.on('mouse:dblclick', (e) => {
        console.log('🖱️ [SimpleTextCanvas] Double click detected');
        const target = e.target;
        if (target && target.type === 'textbox') {
          console.log('🖱️ [SimpleTextCanvas] Double clicked on textbox, entering edit mode');
          const textbox = target as fabric.Textbox;
          textbox.enterEditing();
          textbox.selectAll();
        }
      });

      // CRITICAL: Add text editing event handlers to sync with Redux
      canvas.on('text:editing:exited', (e) => {
        console.log('🔄 [SimpleTextCanvas] ===== TEXT EDITING EXITED =====');
        const target = e.target;
        if (target && target.data?.elementId) {
          const textbox = target as fabric.Textbox;
          // Process text content to preserve newlines for LaTeX
          const textContent = textbox.text || '';
          const processedContent = textContent; // Keep newlines as-is

          console.log('🔄 [SimpleTextCanvas] Updating Redux with new text (will trigger LaTeX after delay):', {
            elementId: target.data.elementId,
            oldContent: 'unknown',
            newContent: textContent,
            processedContent: processedContent,
            textLength: textContent.length || 0,
            hasNewlines: textContent.includes('\n'),
            newlineCount: (textContent.match(/\n/g) || []).length,
            position: { x: textbox.left, y: textbox.top },
            // Debug: Show actual characters
            contentAsArray: Array.from(textContent).map(char => char === '\n' ? '\\n' : char),
            contentCharCodes: Array.from(textContent).map(char => char.charCodeAt(0))
          });

          // Update text content and position in Redux store immediately
          dispatch(updateElement({
            slideId,
            elementId: target.data.elementId,
            updates: {
              content: processedContent,
              position: { x: textbox.left || 0, y: textbox.top || 0 }
            }
          }));

          console.log('✅ [SimpleTextCanvas] Text updated in Redux store');
          console.log('🔥 [SimpleTextCanvas] LaTeX generation will be triggered');
        } else {
          console.error('❌ [SimpleTextCanvas] No elementId found for text editing exit');
        }
      });

      // Combined scaling handler for both textboxes and images
      canvas.on('object:scaling', (e) => {
        const obj = e.target;
        if (!obj) return;

        // Handle textbox scaling with reflow
        if (obj.type === 'textbox') {
          console.log('📏 [SimpleTextCanvas] ===== TEXTBOX SCALING =====');
          const textbox = obj as fabric.Textbox;

          // Calculate new width based on scaling
          const newWidth = textbox.width! * textbox.scaleX!;

          // Reset scale and set new width for proper text reflow
          textbox.set({
            width: newWidth,
            scaleX: 1,
            scaleY: 1
          });

          // Force text reflow
          textbox.initDimensions();

          console.log('📏 [SimpleTextCanvas] Textbox resized and reflowed:', {
            newWidth,
            elementId: textbox.data?.elementId
          });
        }

        // TEMPORARILY DISABLED: Handle canvas bounds constraint for all objects
        // const canvasWidth = canvas.getWidth();
        // const canvasHeight = canvas.getHeight();

        // // Get object bounds with current scaling
        // const objWidth = obj.getScaledWidth();
        // const objHeight = obj.getScaledHeight();

        // // Prevent scaling beyond canvas bounds
        // let needsConstraint = false;

        // if (obj.left! + objWidth > canvasWidth) {
        //   const maxScaleX = (canvasWidth - obj.left!) / (obj.width || 1);
        //   if (obj.scaleX! > maxScaleX) {
        //     obj.set('scaleX', maxScaleX);
        //     needsConstraint = true;
        //   }
        // }

        // if (obj.top! + objHeight > canvasHeight) {
        //   const maxScaleY = (canvasHeight - obj.top!) / (obj.height || 1);
        //   if (obj.scaleY! > maxScaleY) {
        //     obj.set('scaleY', maxScaleY);
        //     needsConstraint = true;
        //   }
        // }

        // if (needsConstraint) {
        //   console.log('🔒 [SimpleTextCanvas] Object scaling constrained to canvas bounds');
        // }
      });

      canvas.on('object:scaled', (e) => {
        const obj = e.target;
        console.log('🎯 [SimpleTextCanvas] ===== OBJECT SCALED EVENT =====');
        console.log('🎯 [SimpleTextCanvas] Object type:', obj?.type, 'Has elementId:', !!obj?.data?.elementId);

        if (obj && obj.type === 'textbox' && obj.data?.elementId) {
          console.log('📏 [SimpleTextCanvas] ===== TEXTBOX SCALED COMPLETE =====');
          const textbox = obj as fabric.Textbox;

          // Update Redux with new size
          dispatch(updateElement({
            slideId,
            elementId: obj.data.elementId,
            updates: {
              size: {
                width: textbox.width!,
                height: textbox.height!
              },
              position: { x: textbox.left || 0, y: textbox.top || 0 }
            }
          }));

          console.log('✅ [SimpleTextCanvas] Textbox size updated in Redux');
        } else if (obj && obj.type === 'image' && obj.data?.elementId) {
          console.log('🖼️ [SimpleTextCanvas] ===== IMAGE SCALED COMPLETE =====');
          const image = obj as fabric.Image;

          // Calculate actual size from original dimensions and scale
          const actualWidth = (image.width || 1) * (image.scaleX || 1);
          const actualHeight = (image.height || 1) * (image.scaleY || 1);

          console.log('🖼️ [SimpleTextCanvas] Image scaling details:', {
            originalWidth: image.width,
            originalHeight: image.height,
            scaleX: image.scaleX,
            scaleY: image.scaleY,
            actualWidth,
            actualHeight,
            position: { x: image.left, y: image.top }
          });

          // Update Redux with new size
          dispatch(updateElement({
            slideId,
            elementId: obj.data.elementId,
            updates: {
              size: {
                width: actualWidth,
                height: actualHeight
              },
              position: { x: image.left || 0, y: image.top || 0 }
            }
          }));

          console.log('✅ [SimpleTextCanvas] Image size updated in Redux');
        } else {
          console.log('⚠️ [SimpleTextCanvas] Object scaled but no Redux update:', {
            type: obj?.type,
            hasElementId: !!obj?.data?.elementId,
            elementId: obj?.data?.elementId
          });
        }
      });

      // Handle object movement to update Redux
      canvas.on('object:moved', (e) => {
        const obj = e.target;
        if (obj && obj.data?.elementId) {
          console.log('🔄 [SimpleTextCanvas] ===== OBJECT MOVED =====');
          console.log('🔄 [SimpleTextCanvas] Object type:', obj.type, 'New position:', { x: obj.left, y: obj.top });

          dispatch(updateElement({
            slideId,
            elementId: obj.data.elementId,
            updates: {
              position: { x: obj.left || 0, y: obj.top || 0 }
            }
          }));

          console.log('✅ [SimpleTextCanvas] Object position updated in Redux');
        } else {
          console.log('⚠️ [SimpleTextCanvas] Object moved but no Redux update:', {
            type: obj?.type,
            hasElementId: !!obj?.data?.elementId,
            position: { x: obj?.left, y: obj?.top }
          });
        }
      });

      // Add keyboard event handling for deletion (macOS compatible)
      const handleKeyDown = (e: KeyboardEvent) => {
        console.log('⌨️ [SimpleTextCanvas] ===== KEY DOWN EVENT =====');
        console.log('⌨️ [SimpleTextCanvas] Key pressed:', {
          key: e.key,
          code: e.code,
          metaKey: e.metaKey,
          ctrlKey: e.ctrlKey,
          altKey: e.altKey,
          shiftKey: e.shiftKey,
          target: (e.target as HTMLElement)?.tagName,
          activeElement: document.activeElement?.tagName
        });

        // Check if we should handle this event (avoid interfering with input fields)
        const activeElement = document.activeElement;
        const isInputFocused = activeElement && (
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          (activeElement as HTMLElement).contentEditable === 'true'
        );

        if (isInputFocused) {
          console.log('⌨️ [SimpleTextCanvas] Input element is focused, ignoring delete key');
          return;
        }

        // Get the currently selected object
        const activeObject = canvas.getActiveObject();

        if (!activeObject || !activeObject.data?.elementId) {
          console.log('⌨️ [SimpleTextCanvas] No object selected for deletion');
          return;
        }

        // Check if we're in text editing mode
        if (activeObject.type === 'textbox') {
          const textbox = activeObject as fabric.Textbox;
          if (textbox.isEditing) {
            console.log('⌨️ [SimpleTextCanvas] In text editing mode, ignoring delete key');
            return; // Don't delete the textbox while editing text
          }
        }

        // Handle deletion keys (macOS compatible)
        if (e.key === 'Delete' || e.key === 'Backspace') {
          console.log('🗑️ [SimpleTextCanvas] ===== DELETING SELECTED OBJECT =====');
          console.log('🗑️ [SimpleTextCanvas] Deleting object:', {
            type: activeObject.type,
            elementId: activeObject.data.elementId
          });

          // Remove from canvas
          canvas.remove(activeObject);
          canvas.renderAll();

          // Remove from Redux store
          dispatch(deleteElement({
            slideId,
            elementId: activeObject.data.elementId
          }));

          // Clear selection state
          setSelectedObject(null);
          setSelectedElementId(null);

          console.log('✅ [SimpleTextCanvas] Object deleted successfully');
          e.preventDefault();
          e.stopPropagation();
        }
      };

      // Add event listener to document for better keyboard capture
      document.addEventListener('keydown', handleKeyDown);
      console.log('✅ [SimpleTextCanvas] Document keyboard event listener added');

      canvas.on('text:changed', (e) => {
        console.log('📝 [SimpleTextCanvas] ===== TEXT CHANGED (REAL-TIME) =====');
        const target = e.target;
        if (target && target.data?.elementId) {
          const textbox = target as fabric.Textbox;
          console.log('📝 [SimpleTextCanvas] Real-time text update (no LaTeX trigger):', {
            elementId: target.data.elementId,
            newText: textbox.text,
            textLength: textbox.text?.length || 0
          });

          // Don't update Redux during real-time text changes
          // This prevents LaTeX generation on every keystroke
          // Updates will only happen when user exits editing mode
          console.log('🔄 Real-time text change detected, but not updating Redux to prevent LaTeX spam');
        }
      });

      // Track previously selected objects for selection:cleared event
      let previouslySelectedObjects: fabric.Object[] = [];

      // Selection-based recompilation - much cleaner approach!
      // When object is selected (red box) = no recompilation
      canvas.on('selection:created', (e) => {
        console.log('🎯 [SimpleTextCanvas] ===== SELECTION CREATED =====');
        previouslySelectedObjects = e.selected || [];
        console.log('🎯 [SimpleTextCanvas] Objects selected:', previouslySelectedObjects.length);
      });

      canvas.on('selection:updated', (e) => {
        console.log('🎯 [SimpleTextCanvas] ===== SELECTION UPDATED =====');
        previouslySelectedObjects = e.selected || [];
        console.log('🎯 [SimpleTextCanvas] Objects selected:', previouslySelectedObjects.length);
      });

      // When selection is cleared (click elsewhere) = trigger recompilation
      canvas.on('selection:cleared', (e) => {
        console.log('🔄 [SimpleTextCanvas] ===== SELECTION CLEARED =====');
        console.log('🔄 [SimpleTextCanvas] Previously selected objects:', previouslySelectedObjects.length);

        // Process each previously selected object
        previouslySelectedObjects.forEach((obj) => {
          if (obj && obj.data?.elementId) {
            if (obj.type === 'textbox') {
              const textbox = obj as fabric.Textbox;
              console.log('🔄 [SimpleTextCanvas] Updating deselected textbox (will trigger LaTeX after delay):', {
                elementId: obj.data.elementId,
                finalPosition: { x: textbox.left, y: textbox.top },
                content: textbox.text,
                textLength: textbox.text?.length || 0
              });

              // Update position and content in Redux - same as text:editing:exited
              dispatch(updateElement({
                slideId,
                elementId: obj.data.elementId,
                updates: {
                  content: textbox.text,
                  position: { x: textbox.left || 0, y: textbox.top || 0 }
                }
              }));

              console.log('✅ [SimpleTextCanvas] Deselected textbox updated in Redux');
            } else if (obj.type === 'image') {
              const image = obj as fabric.Image;
              const calculatedWidth = (image.width || 0) * (image.scaleX || 1);
              const calculatedHeight = (image.height || 0) * (image.scaleY || 1);

              console.log('🔄 [SimpleTextCanvas] Updating deselected image (will trigger LaTeX after delay):', {
                elementId: obj.data.elementId,
                finalPosition: { x: image.left, y: image.top },
                originalImageSize: { width: image.width, height: image.height },
                scaleFactors: { scaleX: image.scaleX, scaleY: image.scaleY },
                calculatedSize: { width: calculatedWidth, height: calculatedHeight }
              });

              // Update position and size in Redux
              dispatch(updateElement({
                slideId,
                elementId: obj.data.elementId,
                updates: {
                  position: { x: image.left || 0, y: image.top || 0 },
                  size: {
                    width: calculatedWidth,
                    height: calculatedHeight
                  }
                }
              }));

              console.log('✅ [SimpleTextCanvas] Deselected image updated in Redux');
            }
          }
        });

        // Clear the tracking array
        previouslySelectedObjects = [];
      });

      // Cleanup function
      return () => {
        console.log('🧹 [SimpleTextCanvas] Cleaning up canvas');

        // Clear debounce timer
        if (fontSizeDebounceRef.current) {
          clearTimeout(fontSizeDebounceRef.current);
        }

        // Remove keyboard event listener
        document.removeEventListener('keydown', handleKeyDown);
        console.log('✅ [SimpleTextCanvas] Document keyboard event listener removed');

        canvas.dispose();
        fabricCanvasRef.current = null;
        setIsCanvasReady(false);
      };
    } catch (error) {
      console.error('❌ [SimpleTextCanvas] Error creating canvas:', error);
    }
  }, [canvasDimensions.width, canvasDimensions.height, dispatch, slideId]);

  // Load slide elements into canvas
  useEffect(() => {
    console.log('🔥 [SimpleTextCanvas] ===== LOADING SLIDE ELEMENTS =====');
    console.log('🔥 [SimpleTextCanvas] Canvas ready:', isCanvasReady);
    console.log('🔥 [SimpleTextCanvas] Current slide:', !!currentSlide);
    console.log('🔥 [SimpleTextCanvas] Elements count:', currentSlide?.elements?.length || 0);

    if (!isCanvasReady || !fabricCanvasRef.current || !currentSlide) {
      console.log('⏸️ [SimpleTextCanvas] Skipping element loading - not ready');
      return;
    }

    const canvas = fabricCanvasRef.current;

    // Clear existing objects
    console.log('🧹 [SimpleTextCanvas] Clearing existing objects');
    canvas.clear();
    canvas.backgroundColor = '#ffffff';

    // Load elements from slide data
    currentSlide.elements.forEach((element, index) => {
      console.log(`📝 [SimpleTextCanvas] Loading element ${index}:`, {
        id: element.id,
        type: element.type,
        content: element.content?.substring(0, 50) + '...'
      });

      if (element.type === 'text') {
        createTextElement(element, canvas);
      } else if (element.type === 'image') {
        createImageElement(element, canvas);
      }
    });

    canvas.renderAll();
    console.log('✅ [SimpleTextCanvas] All elements loaded');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCanvasReady, currentSlide, slideId, dispatch]);

  // Create a text element on the canvas
  const createTextElement = (element: SlideElement, canvas: fabric.Canvas) => {
    console.log('📝 [SimpleTextCanvas] ===== CREATING TEXT ELEMENT =====');
    console.log('📝 [SimpleTextCanvas] Element data:', {
      id: element.id,
      content: element.content,
      position: element.position,
      size: element.size,
      properties: element.properties
    });

    try {
      // Process content to ensure newlines are handled properly
      const processedContent = (element.content || 'Text').replace(/\\n/g, '\n');

      const textbox = new fabric.Textbox(processedContent, {
        left: element.position.x,
        top: element.position.y,
        width: element.size.width,
        fontSize: element.properties.fontSize || 16,
        fontFamily: element.properties.fontFamily || 'Arial',
        fill: element.properties.textColor ?
          `rgba(${element.properties.textColor.r}, ${element.properties.textColor.g}, ${element.properties.textColor.b}, ${element.properties.textColor.a || 1})` :
          '#000000',
        fontWeight: element.properties.fontWeight || 'normal',
        fontStyle: element.properties.fontStyle || 'normal',
        textAlign: element.properties.textAlign || 'left',
        editable: true,
        selectable: true,
        evented: true,
        // Text wrapping and newline handling
        splitByGrapheme: false, // Better word wrapping
        lineHeight: 1.2, // Proper line spacing
        // PowerPoint-like behavior
        lockScalingFlip: true, // Prevent flipping
        lockUniScaling: false, // Allow independent width/height scaling
        // Visual styling
        borderColor: '#007bff',
        cornerColor: '#007bff',
        cornerSize: 6,
        transparentCorners: false,
        // Resize constraints
        minScaleLimit: 0.1,
      });

      // Store element ID for reference
      textbox.data = { elementId: element.id };



      console.log('✅ [SimpleTextCanvas] Textbox created:', {
        text: textbox.text,
        editable: textbox.editable,
        selectable: textbox.selectable,
        evented: textbox.evented,
        left: textbox.left,
        top: textbox.top,
        width: textbox.width,
        height: textbox.height
      });

      canvas.add(textbox);
      console.log('✅ [SimpleTextCanvas] Textbox added to canvas');
    } catch (error) {
      console.error('❌ [SimpleTextCanvas] Error creating textbox:', error);
    }
  };

  // Create an image element on the canvas
  const createImageElement = (element: SlideElement, canvas: fabric.Canvas) => {
    console.log('🖼️ [SimpleTextCanvas] ===== CREATING IMAGE ELEMENT =====');
    console.log('🖼️ [SimpleTextCanvas] Element data:', {
      id: element.id,
      position: element.position,
      size: element.size,
      contentLength: element.content?.length || 0
    });

    if (!element.content) {
      console.error('❌ [SimpleTextCanvas] No image content provided');
      return;
    }

    try {
      fabric.Image.fromURL(element.content, (img) => {
        if (!img) {
          console.error('❌ [SimpleTextCanvas] Failed to load image');
          return;
        }

        // Calculate scale to maintain aspect ratio
        const imageAspectRatio = (img.width || 1) / (img.height || 1);
        const targetAspectRatio = element.size.width / element.size.height;
        
        let scaleX, scaleY;
        
        if (Math.abs(imageAspectRatio - targetAspectRatio) < 0.01) {
          // Aspect ratios are very similar, scale normally
          scaleX = element.size.width / (img.width || 1);
          scaleY = element.size.height / (img.height || 1);
        } else {
          // Maintain aspect ratio by using uniform scaling
          const scaleToFitWidth = element.size.width / (img.width || 1);
          const scaleToFitHeight = element.size.height / (img.height || 1);
          const uniformScale = Math.min(scaleToFitWidth, scaleToFitHeight);
          scaleX = uniformScale;
          scaleY = uniformScale;
        }

        console.log('🖼️ [SimpleTextCanvas] Image scaling calculation:', {
          elementId: element.id,
          originalImageSize: { width: img.width, height: img.height },
          targetSize: element.size,
          imageAspectRatio: imageAspectRatio.toFixed(3),
          targetAspectRatio: targetAspectRatio.toFixed(3),
          calculatedScale: { scaleX: scaleX.toFixed(3), scaleY: scaleY.toFixed(3) },
          maintainedAspectRatio: Math.abs(scaleX - scaleY) < 0.01
        });

        img.set({
          left: element.position.x,
          top: element.position.y,
          scaleX: scaleX,
          scaleY: scaleY,
          selectable: true,
          evented: true,
          // Enable all transformations
          lockMovementX: false,
          lockMovementY: false,
          lockScalingX: false,
          lockScalingY: false,
          lockRotation: false,
          // Scaling behavior
          lockScalingFlip: true, // Prevent flipping
          lockUniScaling: true, // Force uniform scaling to maintain aspect ratio
          // Visual styling
          borderColor: '#007bff',
          cornerColor: '#007bff',
          cornerSize: 8, // Larger corners for easier grabbing
          transparentCorners: false,
          // Resize constraints
          minScaleLimit: 0.1,
          // Enable controls
          hasControls: true,
          hasBorders: true,
        });

        // Store element ID for reference
        img.data = { elementId: element.id };

        // Add event listeners for image transformations
        img.on('scaling', () => {
          console.log('🔥 [SimpleTextCanvas] IMAGE OBJECT SCALING EVENT FIRED!');
        });

        img.on('scaled', () => {
          console.log('🔥 [SimpleTextCanvas] IMAGE OBJECT SCALED EVENT FIRED!');
          // Update Redux with new scale values
          if (img.data?.elementId) {
            dispatch(updateElement({
              slideId,
              elementId: img.data.elementId,
              updates: {
                position: { x: img.left || 0, y: img.top || 0 },
                size: {
                  width: (img.width || 0) * (img.scaleX || 1),
                  height: (img.height || 0) * (img.scaleY || 1)
                }
              }
            }));
            console.log('✅ [SimpleTextCanvas] Image scale updated in Redux');
          }
        });

        img.on('moving', () => {
          console.log('🔥 [SimpleTextCanvas] IMAGE OBJECT MOVING EVENT FIRED!');
        });

        img.on('moved', () => {
          console.log('🔥 [SimpleTextCanvas] IMAGE OBJECT MOVED EVENT FIRED!');
          // Update Redux with new position
          if (img.data?.elementId) {
            dispatch(updateElement({
              slideId,
              elementId: img.data.elementId,
              updates: {
                position: { x: img.left || 0, y: img.top || 0 }
              }
            }));
            console.log('✅ [SimpleTextCanvas] Image position updated in Redux');
          }
        });

        canvas.add(img);
        console.log('✅ [SimpleTextCanvas] Image added to canvas with event listeners');
      });
    } catch (error) {
      console.error('❌ [SimpleTextCanvas] Error creating image:', error);
    }
  };

  // Add text element function
  const addTextElement = () => {
    console.log('🔘 [SimpleTextCanvas] ===== TEXT BUTTON CLICKED =====');
    console.log('🔘 [SimpleTextCanvas] Canvas ready:', isCanvasReady);
    console.log('🔘 [SimpleTextCanvas] Fabric canvas:', !!fabricCanvasRef.current);
    console.log('🔘 [SimpleTextCanvas] Slide ID:', slideId);

    if (!fabricCanvasRef.current) {
      console.error('❌ [SimpleTextCanvas] No fabric canvas available');
      return;
    }

    if (!slideId) {
      console.error('❌ [SimpleTextCanvas] No slide ID available');
      return;
    }

    // Create new text element data with better defaults
    const newElement: Omit<SlideElement, 'id' | 'createdAt' | 'updatedAt'> = {
      type: 'text',
      position: { x: 50, y: 50 },
      size: { width: 300, height: 60 }, // Wider default for better text wrapping
      properties: {
        fontSize: 18, // Slightly larger default
        fontFamily: 'Arial',
        textColor: { r: 0, g: 0, b: 0 },
        fontWeight: 'normal',
        fontStyle: 'normal',
        textAlign: 'left',
        opacity: 1,
      },
      content: 'Double-click to edit this text\nYou can add multiple lines\nAnd format them with the toolbar',
    };

    console.log('📝 [SimpleTextCanvas] Creating new text element:', newElement);

    try {
      dispatch(addElement({ slideId, element: newElement }));
      console.log('✅ [SimpleTextCanvas] Element dispatched to Redux');
    } catch (error) {
      console.error('❌ [SimpleTextCanvas] Error dispatching element:', error);
    }
  };

  // Add image element function
  const addImageElement = () => {
    console.log('🖼️ [SimpleTextCanvas] ===== IMAGE BUTTON CLICKED =====');

    // Create file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleImageFile(file);
      }
    };
    input.click();
  };

  const handleImageFile = (file: File) => {
    console.log('🖼️ [SimpleTextCanvas] Processing image file:', file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;

      // Create a temporary image to get dimensions
      const tempImg = new Image();
      tempImg.onload = () => {
        // Calculate size maintaining aspect ratio
        const maxWidth = 300;
        const maxHeight = 200;
        const imageAspectRatio = tempImg.width / tempImg.height;
        
        let width, height;
        if (imageAspectRatio > maxWidth / maxHeight) {
          // Image is wider - constrain by width
          width = maxWidth;
          height = maxWidth / imageAspectRatio;
        } else {
          // Image is taller - constrain by height
          height = maxHeight;
          width = maxHeight * imageAspectRatio;
        }

        console.log('🖼️ [SimpleTextCanvas] Image dimensions calculated:', {
          originalSize: { width: tempImg.width, height: tempImg.height },
          aspectRatio: imageAspectRatio.toFixed(3),
          calculatedSize: { width: width.toFixed(1), height: height.toFixed(1) }
        });

        // Create new image element data with proper aspect ratio
        const newElement: Omit<SlideElement, 'id' | 'createdAt' | 'updatedAt'> = {
          type: 'image',
          position: { x: 100, y: 100 },
          size: { width: Math.round(width), height: Math.round(height) },
          properties: {
            opacity: 1,
          },
          content: imageUrl, // Store the base64 image data
        };

        console.log('🖼️ [SimpleTextCanvas] Creating new image element with aspect ratio');

        try {
          dispatch(addElement({ slideId, element: newElement }));
          console.log('✅ [SimpleTextCanvas] Image element dispatched to Redux');
        } catch (error) {
          console.error('❌ [SimpleTextCanvas] Error dispatching image element:', error);
        }
      };
      
      tempImg.src = imageUrl;
    };

    reader.readAsDataURL(file);
  };

  // Handle drag and drop for images
  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    console.log('🖼️ [SimpleTextCanvas] ===== FILE DROPPED =====');

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      console.log('⚠️ [SimpleTextCanvas] No image files dropped');
      return;
    }

    // Handle the first image file
    const file = imageFiles[0];
    console.log('🖼️ [SimpleTextCanvas] Processing dropped image:', file.name);
    handleImageFile(file);
  };

  // Text formatting functions
  const applyFormatting = (property: string, value: any) => {
    console.log('🎨 [SimpleTextCanvas] ===== APPLYING FORMATTING =====');
    console.log('🎨 [SimpleTextCanvas] Property:', property, 'Value:', value);

    if (!selectedObject || !selectedElementId || selectedObject.type !== 'textbox') {
      console.warn('⚠️ [SimpleTextCanvas] No text object selected for formatting');
      return;
    }

    const textbox = selectedObject as fabric.Textbox;

    // Apply formatting to Fabric.js object
    switch (property) {
      case 'fontSize':
        textbox.set('fontSize', value);
        // Force textbox to recalculate dimensions after font size change
        textbox.initDimensions();
        break;
      case 'fontWeight':
        textbox.set('fontWeight', value);
        textbox.initDimensions();
        break;
      case 'fontStyle':
        textbox.set('fontStyle', value);
        textbox.initDimensions();
        break;
      case 'textAlign':
        textbox.set('textAlign', value);
        break;
      case 'fill':
        textbox.set('fill', value);
        break;
      default:
        console.warn('⚠️ [SimpleTextCanvas] Unknown formatting property:', property);
        return;
    }

    // Update Redux store
    dispatch(updateElement({
      slideId,
      elementId: selectedElementId,
      updates: {
        properties: {
          [property]: value
        }
      }
    }));

    // Force canvas re-render and maintain selection
    if (fabricCanvasRef.current && textbox) {
      // Ensure the object stays selected after formatting
      fabricCanvasRef.current.setActiveObject(textbox);
      // Force a complete re-render
      fabricCanvasRef.current.requestRenderAll();

      // Additional render for font size changes to ensure proper display
      if (property === 'fontSize' || property === 'fontWeight' || property === 'fontStyle') {
        setTimeout(() => {
          fabricCanvasRef.current?.requestRenderAll();
        }, 10);
      }
    }

    console.log('✅ [SimpleTextCanvas] Formatting applied and Redux updated');
  };

  const toggleBold = () => {
    console.log('🔤 [SimpleTextCanvas] ===== TOGGLE BOLD =====');
    if (!selectedObject || selectedObject.type !== 'textbox') return;

    const textbox = selectedObject as fabric.Textbox;
    const currentWeight = textbox.fontWeight;
    const newWeight = currentWeight === 'bold' ? 'normal' : 'bold';
    console.log('🔤 [SimpleTextCanvas] Toggling bold:', currentWeight, '->', newWeight);
    applyFormatting('fontWeight', newWeight);
  };

  const toggleItalic = () => {
    console.log('🔤 [SimpleTextCanvas] ===== TOGGLE ITALIC =====');
    if (!selectedObject || selectedObject.type !== 'textbox') return;

    const textbox = selectedObject as fabric.Textbox;
    const currentStyle = textbox.fontStyle;
    const newStyle = currentStyle === 'italic' ? 'normal' : 'italic';
    console.log('🔤 [SimpleTextCanvas] Toggling italic:', currentStyle, '->', newStyle);
    applyFormatting('fontStyle', newStyle);
  };



  const setFontSize = (size: number) => {
    console.log('📏 [SimpleTextCanvas] ===== SET FONT SIZE DIRECTLY =====');
    if (!selectedObject || selectedObject.type !== 'textbox') return;

    const clampedSize = Math.max(8, Math.min(72, size));
    console.log('📏 [SimpleTextCanvas] Setting font size to:', clampedSize);
    setFontSizeInput(clampedSize.toString());
    applyFormatting('fontSize', clampedSize);
  };

  const handleFontSizeInputChange = (value: string) => {
    console.log('📏 [SimpleTextCanvas] ===== FONT SIZE INPUT CHANGE =====');
    setFontSizeInput(value);

    // Clear existing debounce timer
    if (fontSizeDebounceRef.current) {
      clearTimeout(fontSizeDebounceRef.current);
    }

    // Set new debounce timer
    fontSizeDebounceRef.current = setTimeout(() => {
      const numValue = parseInt(value);
      if (!isNaN(numValue) && numValue >= 8 && numValue <= 72) {
        console.log('📏 [SimpleTextCanvas] Applying debounced font size:', numValue);
        setFontSize(numValue);
      }
    }, 300); // 300ms debounce delay
  };

  const handleFontSizeSliderChange = (value: string) => {
    console.log('📏 [SimpleTextCanvas] ===== FONT SIZE SLIDER CHANGE =====');
    setFontSizeInput(value);

    // Clear existing debounce timer
    if (fontSizeDebounceRef.current) {
      clearTimeout(fontSizeDebounceRef.current);
    }

    // Set new debounce timer with shorter delay for slider
    fontSizeDebounceRef.current = setTimeout(() => {
      const numValue = parseInt(value);
      if (!isNaN(numValue) && numValue >= 8 && numValue <= 72) {
        console.log('📏 [SimpleTextCanvas] Applying debounced slider font size:', numValue);
        setFontSize(numValue);
      }
    }, 150); // 150ms debounce delay for slider (shorter for better UX)
  };

  const changeTextAlign = (align: string) => {
    console.log('📐 [SimpleTextCanvas] ===== CHANGE TEXT ALIGN =====');
    console.log('📐 [SimpleTextCanvas] New alignment:', align);
    applyFormatting('textAlign', align);
  };

  const changeTextColor = (color: string) => {
    console.log('🎨 [SimpleTextCanvas] ===== CHANGE TEXT COLOR =====');
    console.log('🎨 [SimpleTextCanvas] New color:', color);
    setCurrentTextColor(color);
    applyFormatting('fill', color);
  };

  // Helper function to get current text color as hex
  const getCurrentTextColor = (textbox: fabric.Textbox): string => {
    const fill = textbox.fill;
    if (typeof fill === 'string') {
      // If it's already a hex color, return it
      if (fill.startsWith('#')) return fill;
      // If it's a named color or rgb, try to convert
      if (fill.startsWith('rgb')) {
        // Simple rgb to hex conversion for common cases
        const match = fill.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
          const r = parseInt(match[1]);
          const g = parseInt(match[2]);
          const b = parseInt(match[3]);
          return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        }
      }
    }
    return '#000000'; // Default fallback
  };



  if (!currentSlide) {
    console.log('❌ [SimpleTextCanvas] No current slide found');
    return <div className="slide-canvas-error">Slide not found</div>;
  }

  console.log('🔥 [SimpleTextCanvas] ===== RENDERING COMPONENT =====');

  return (
    <div ref={containerRef} style={{ 
      padding: '20px', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div style={{
        marginBottom: '10px',
        padding: '10px',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
        textAlign: 'center',
        flexShrink: 0
      }}>
        <strong>SimpleTextCanvas with Formatting</strong> - Add text elements and format them
        <br />
        <small>
          Canvas Ready: {isCanvasReady ? '✅' : '❌'} |
          Elements: {currentSlide?.elements?.length || 0} |
          Selected: {selectedObject?.type || 'none'} |
          Size: {canvasDimensions.width}×{canvasDimensions.height}
        </small>
      </div>

      {/* Out of bounds warning */}
      {showOutOfBoundsWarning && (
        <div style={{
          marginBottom: '10px',
          padding: '10px',
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '4px',
          color: '#856404',
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          ⚠️ Warning: Text outside of renderable area
        </div>
      )}

      {/* Main toolbar */}
      <div style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}>
        <button
          onClick={addTextElement}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          ➕ Add Text Element
        </button>

        <button
          onClick={addImageElement}
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          🖼️ Add Image
        </button>
      </div>

      {/* Text formatting toolbar - only show when text is selected */}
      {selectedObject && selectedObject.type === 'textbox' && (
        <div style={{
          marginBottom: '10px',
          padding: '10px',
          backgroundColor: '#e9ecef',
          borderRadius: '4px',
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontWeight: 'bold', marginRight: '10px' }}>Format Text:</span>

          {/* Font Size Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Size:</label>
            <input
              type="number"
              min="8"
              max="72"
              value={fontSizeInput}
              onChange={(e) => handleFontSizeInputChange(e.target.value)}
              style={{
                width: '50px',
                padding: '3px 5px',
                border: '1px solid #ccc',
                borderRadius: '3px',
                fontSize: '12px'
              }}
              title="Font size (8-72)"
            />
            <input
              type="range"
              min="8"
              max="72"
              value={fontSizeInput}
              onChange={(e) => handleFontSizeSliderChange(e.target.value)}
              style={{
                width: '80px',
                cursor: 'pointer'
              }}
              title="Font size slider"
            />
            <span style={{ fontSize: '11px', color: '#666' }}>px</span>
          </div>

          {/* Style Controls */}
          <button
            onClick={toggleBold}
            style={{
              padding: '5px 10px',
              border: '1px solid #ccc',
              borderRadius: '3px',
              cursor: 'pointer',
              fontWeight: (selectedObject as fabric.Textbox).fontWeight === 'bold' ? 'bold' : 'normal',
              backgroundColor: (selectedObject as fabric.Textbox).fontWeight === 'bold' ? '#007bff' : 'white',
              color: (selectedObject as fabric.Textbox).fontWeight === 'bold' ? 'white' : 'black'
            }}
            title="Toggle bold"
          >
            B
          </button>

          <button
            onClick={toggleItalic}
            style={{
              padding: '5px 10px',
              border: '1px solid #ccc',
              borderRadius: '3px',
              cursor: 'pointer',
              fontStyle: (selectedObject as fabric.Textbox).fontStyle === 'italic' ? 'italic' : 'normal',
              backgroundColor: (selectedObject as fabric.Textbox).fontStyle === 'italic' ? '#007bff' : 'white',
              color: (selectedObject as fabric.Textbox).fontStyle === 'italic' ? 'white' : 'black'
            }}
            title="Toggle italic"
          >
            I
          </button>

          {/* Alignment Controls */}
          <button
            onClick={() => changeTextAlign('left')}
            style={{
              padding: '5px 10px',
              border: '1px solid #ccc',
              borderRadius: '3px',
              cursor: 'pointer',
              backgroundColor: (selectedObject as fabric.Textbox).textAlign === 'left' ? '#007bff' : 'white',
              color: (selectedObject as fabric.Textbox).textAlign === 'left' ? 'white' : 'black'
            }}
            title="Align left"
          >
            ⬅
          </button>

          <button
            onClick={() => changeTextAlign('center')}
            style={{
              padding: '5px 10px',
              border: '1px solid #ccc',
              borderRadius: '3px',
              cursor: 'pointer',
              backgroundColor: (selectedObject as fabric.Textbox).textAlign === 'center' ? '#007bff' : 'white',
              color: (selectedObject as fabric.Textbox).textAlign === 'center' ? 'white' : 'black'
            }}
            title="Align center"
          >
            ↔
          </button>

          <button
            onClick={() => changeTextAlign('right')}
            style={{
              padding: '5px 10px',
              border: '1px solid #ccc',
              borderRadius: '3px',
              cursor: 'pointer',
              backgroundColor: (selectedObject as fabric.Textbox).textAlign === 'right' ? '#007bff' : 'white',
              color: (selectedObject as fabric.Textbox).textAlign === 'right' ? 'white' : 'black'
            }}
            title="Align right"
          >
            ➡
          </button>

          {/* Color Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Color:</label>
            <input
              type="color"
              value={currentTextColor}
              onChange={(e) => changeTextColor(e.target.value)}
              style={{
                width: '40px',
                height: '30px',
                border: '1px solid #ccc',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
              title="Text color"
            />
          </div>
        </div>
      )}

      {/* Image editing toolbar - only show when image is selected */}
      {selectedObject && selectedObject.type === 'image' && (
        <div style={{
          marginBottom: '10px',
          padding: '10px',
          backgroundColor: '#e9ecef',
          borderRadius: '4px',
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontWeight: 'bold', marginRight: '10px' }}>Edit Image:</span>

          {/* Opacity Control */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Opacity:</label>
            <input
              type="range"
              min="0"
              max="100"
              value={(selectedObject.opacity || 1) * 100}
              onChange={(e) => {
                const opacity = parseInt(e.target.value) / 100;
                if (fabricCanvasRef.current && selectedObject) {
                  selectedObject.set('opacity', opacity);
                  fabricCanvasRef.current.renderAll();

                  // Update Redux store
                  const elementId = selectedObject.data?.elementId;
                  if (elementId) {
                    dispatch(updateElement({
                      slideId,
                      elementId,
                      updates: { properties: { opacity } }
                    }));
                  }
                }
              }}
              style={{
                width: '80px',
                cursor: 'pointer'
              }}
              title="Image opacity"
            />
            <span style={{ fontSize: '11px', color: '#666' }}>
              {Math.round((selectedObject.opacity || 1) * 100)}%
            </span>
          </div>

          {/* Flip Controls */}
          <button
            onClick={() => {
              if (fabricCanvasRef.current && selectedObject) {
                const currentFlipX = selectedObject.flipX || false;
                selectedObject.set('flipX', !currentFlipX);
                fabricCanvasRef.current.renderAll();

                // Update Redux store
                const elementId = selectedObject.data?.elementId;
                if (elementId) {
                  dispatch(updateElement({
                    slideId,
                    elementId,
                    updates: { properties: { flipX: !currentFlipX } }
                  }));
                }
              }
            }}
            style={{
              padding: '5px 10px',
              backgroundColor: selectedObject.flipX ? '#007bff' : '#f8f9fa',
              color: selectedObject.flipX ? 'white' : '#333',
              border: '1px solid #ccc',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
            title="Flip horizontally"
          >
            ↔️ Flip H
          </button>

          <button
            onClick={() => {
              if (fabricCanvasRef.current && selectedObject) {
                const currentFlipY = selectedObject.flipY || false;
                selectedObject.set('flipY', !currentFlipY);
                fabricCanvasRef.current.renderAll();

                // Update Redux store
                const elementId = selectedObject.data?.elementId;
                if (elementId) {
                  dispatch(updateElement({
                    slideId,
                    elementId,
                    updates: { properties: { flipY: !currentFlipY } }
                  }));
                }
              }
            }}
            style={{
              padding: '5px 10px',
              backgroundColor: selectedObject.flipY ? '#007bff' : '#f8f9fa',
              color: selectedObject.flipY ? 'white' : '#333',
              border: '1px solid #ccc',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
            title="Flip vertically"
          >
            ↕️ Flip V
          </button>

          {/* Delete Button */}
          <button
            onClick={() => {
              if (fabricCanvasRef.current && selectedObject) {
                const elementId = selectedObject.data?.elementId;
                fabricCanvasRef.current.remove(selectedObject);
                setSelectedObject(null);

                // Update Redux store
                if (elementId) {
                  dispatch(deleteElement({ slideId, elementId }));
                }
              }
            }}
            style={{
              padding: '5px 10px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
            title="Delete image"
          >
            🗑️ Delete
          </button>
        </div>
      )}

      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        minHeight: 0
      }}>
        <div style={{
          border: '2px solid #007bff',
          borderRadius: '4px',
          backgroundColor: '#ffffff',
          display: 'inline-block',
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
        }}>
          <canvas
            ref={canvasRef}
            width={canvasDimensions.width}
            height={canvasDimensions.height}
            style={{
              display: 'block',
              outline: 'none' // Remove focus outline for cleaner look
            }}
            tabIndex={0}
            title="Click to focus, drag images here, or use Delete/Backspace to delete selected elements"
            onDrop={handleCanvasDrop}
            onDragOver={handleCanvasDragOver}
          />
        </div>
      </div>

      <div style={{
        marginTop: '10px',
        fontSize: '12px',
        color: '#666',
        backgroundColor: '#f8f9fa',
        padding: '8px',
        borderRadius: '4px'
      }}>
        <strong>Instructions:</strong>
        <br />• Click "Add Text Element" to add new text
        <br />• Click "Add Image" or drag image files onto the canvas
        <br />• Click on elements to select them and see formatting options
        <br />• Double-click text to edit it
        <br />• Drag elements to move them, resize using corner handles
        <br />• <strong>Press Delete or Backspace to delete selected elements</strong>
        <br />• Check browser console for detailed logs
      </div>
    </div>
  );
};

export default SimpleTextCanvas;