import React, { useEffect, useRef, useState, useCallback } from 'react';
import { fabric } from 'fabric';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import {
  addElement,
  deleteElement,
  moveElement,
  resizeElement,
  updateElement,
  updateElementProperties,
} from '../store/slices/presentationSlice';
import { SlideElement, Position, Size, ElementProperties } from '../types/presentation';
import TextFormattingToolbar from './TextFormattingToolbar';
import ImageImportDialog from './ImageImportDialog';
import ImageEditingToolbar from './ImageEditingToolbar';
import { parseMathContent, renderMathToHTML, containsMath } from '../utils/mathRenderer';
import { validateImageFile, convertImageForLatex, getImageInfo, ImageInfo } from '../utils/imageUtils';
import { createFabricShape, fabricObjectToSlideElement, ShapeDrawingState } from '../utils/shapeUtils';
import ShapeToolbar from './ShapeToolbar';
import { dragDropService, DragDropService } from '../services/dragDropService';
import { canvasVirtualizationService } from '../services/canvasVirtualizationService';
import { memoryManagementService } from '../services/memoryManagementService';
import { latexGenerationService } from '../services/latexGenerationService';
import { useKeyboardShortcuts, useScreenReader } from '../hooks/useAccessibility';
import './SlideCanvas.css';

interface SlideCanvasProps {
  slideId: string;
  width?: number;
  height?: number;
}

const SlideCanvas: React.FC<SlideCanvasProps> = ({
  slideId,
  width = 800,
  height = 600
}) => {
  console.log('🚀 [SlideCanvas] ===== COMPONENT MOUNTING =====');
  console.log('🚀 [SlideCanvas] Props:', { slideId, width, height });
  const dispatch = useDispatch();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<{ x: number; y: number } | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isTextEditing, setIsTextEditing] = useState(false);
  const [latexGenerationStatus, setLatexGenerationStatus] = useState<{
    isGenerating: boolean;
    pendingCount: number;
  }>({ isGenerating: false, pendingCount: 0 });

  // Add logging for isTextEditing state changes
  useEffect(() => {
    console.log('🔄 isTextEditing state changed to:', isTextEditing);
  }, [isTextEditing]);
  const [selectedElementProperties, setSelectedElementProperties] = useState<ElementProperties>({});

  const [showImageImportDialog, setShowImageImportDialog] = useState(false);
  const [shapeDrawingState, setShapeDrawingState] = useState<ShapeDrawingState>({
    isDrawing: false,
    startPoint: null,
    currentShape: null,
  });

  // Get current slide data from Redux store
  const presentation = useSelector((state: RootState) => state.presentation.currentPresentation);
  const currentSlide = presentation?.slides.find(slide => slide.id === slideId);
  const { activeTool, activeShapeType } = useSelector((state: RootState) => state.ui);

  // Accessibility hooks
  const { announceAction, announceSelection, announceError } = useScreenReader();

  // Register keyboard shortcuts for canvas context
  useKeyboardShortcuts('canvas', [
    {
      key: 't',
      ctrlKey: true,
      description: 'Add text element',
      action: () => {
        addTextElementAtPosition(100, 100);
        announceAction('Added text element');
      }
    },
    {
      key: 'Delete',
      description: 'Delete selected element',
      action: () => {
        if (fabricCanvasRef.current) {
          const activeObject = fabricCanvasRef.current.getActiveObject();
          if (activeObject && activeObject.data?.elementId) {
            dispatch(deleteElement({
              slideId,
              elementId: activeObject.data.elementId,
            }));
            fabricCanvasRef.current.remove(activeObject);
            announceAction('Deleted selected element');
          }
        }
      }
    },
    {
      key: 'Enter',
      description: 'Edit selected text element',
      action: () => {
        if (fabricCanvasRef.current) {
          const activeObject = fabricCanvasRef.current.getActiveObject();
          if (activeObject && activeObject.type === 'textbox') {
            const textbox = activeObject as fabric.Textbox;
            textbox.enterEditing();
            textbox.selectAll();
            setIsTextEditing(true);
            announceAction('Entered text editing mode');
          }
        }
      }
    },
    {
      key: 'Escape',
      description: 'Exit text editing mode',
      action: () => {
        if (isTextEditing && fabricCanvasRef.current) {
          const activeObject = fabricCanvasRef.current.getActiveObject();
          if (activeObject && activeObject.type === 'textbox') {
            const textbox = activeObject as fabric.Textbox;
            textbox.exitEditing();
            setIsTextEditing(false);
            announceAction('Exited text editing mode');
          }
        }
      }
    }
  ]);

  // Add text element at specific position
  const addTextElementAtPosition = useCallback((x: number, y: number, autoEdit: boolean = true) => {
    console.log('🎯 [SlideCanvas] ===== ADD TEXT ELEMENT AT POSITION =====');
    console.log('🎯 [SlideCanvas] Parameters:', { x, y, autoEdit });
    console.log('🎯 [SlideCanvas] Canvas state:', {
      hasCanvas: !!fabricCanvasRef.current,
      isCanvasReady,
      slideId,
      currentSlideElements: currentSlide?.elements?.length || 0
    });

    if (!fabricCanvasRef.current) {
      console.error('❌ No fabric canvas available');
      return;
    }

    const newElement: Omit<SlideElement, 'id' | 'createdAt' | 'updatedAt'> = {
      type: 'text',
      position: { x: Math.max(0, x - 100), y: Math.max(0, y - 25) }, // Center the text box on cursor
      size: { width: 200, height: 50 },
      properties: {
        fontSize: 16,
        fontFamily: 'Arial',
        textColor: { r: 0, g: 0, b: 0 },
        fontWeight: 'normal',
        fontStyle: 'normal',
        textAlign: 'left',
        opacity: 1,
      },
      content: autoEdit ? 'Type your text here' : 'Text',
    };

    console.log('📝 Creating new text element:', newElement);
    dispatch(addElement({ slideId, element: newElement }));
    // Note: Auto-edit is now handled in the useEffect that loads slide elements
  }, [currentSlide?.elements?.length, dispatch, isCanvasReady, slideId]);

  // Handle files drop
  const handleFilesDrop = useCallback(async (files: FileList, position: Position) => {
    const { valid, invalid } = dragDropService.validateDroppedFiles(files);

    if (invalid.length > 0) {
      console.warn('Invalid files dropped:', invalid.map(f => f.name));
    }

    for (const file of valid) {
      if (file.type.startsWith('image/')) {
        try {
          const imageInfo = await getImageInfo(file);
          const imageUrl = URL.createObjectURL(file);

          // Apply snap positioning
          const snappedResult = dragDropService.findSnapPosition(
            position,
            { width: imageInfo.width, height: imageInfo.height },
            currentSlide?.elements || [],
            []
          );

          const newElement: Omit<SlideElement, 'id' | 'createdAt' | 'updatedAt'> = {
            type: 'image',
            position: snappedResult.position,
            size: { width: imageInfo.width, height: imageInfo.height },
            properties: {
              src: imageUrl,
              alt: file.name,
              opacity: 1,
            },
            content: imageUrl,
          };

          dispatch(addElement({ slideId, element: newElement }));

          // Show snap guides briefly
          if (snappedResult.guides.length > 0) {
            dragDropService.showSnapGuides(snappedResult.guides);
            setTimeout(() => dragDropService.hideSnapGuides(), 1000);
          }
        } catch (error) {
          console.error('Error processing dropped image:', error);
        }
      }
    }
  }, [dispatch, slideId, currentSlide?.elements]);

  // Handle keyboard events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    console.log('⌨️ KEYDOWN EVENT:', {
      key: event.key,
      isTextEditing,
      hasCanvas: !!fabricCanvasRef.current,
      target: (event.target as HTMLElement)?.tagName,
      activeElement: document.activeElement?.tagName
    });

    if (!fabricCanvasRef.current) {
      console.log('❌ No fabric canvas, ignoring keydown');
      return;
    }

    // Don't handle keyboard events when in text editing mode
    if (isTextEditing) {
      console.log('📝 In text editing mode, ignoring keydown for key:', event.key);
      return;
    }

    const activeObject = fabricCanvasRef.current.getActiveObject();

    // Delete selected element (only when not editing text)
    if ((event.key === 'Delete' || event.key === 'Backspace') && !isTextEditing) {
      if (activeObject && activeObject.data?.elementId) {
        dispatch(deleteElement({
          slideId,
          elementId: activeObject.data.elementId,
        }));
        fabricCanvasRef.current.remove(activeObject);
        event.preventDefault();
      }
    }

    // Enter key to start editing text
    if (event.key === 'Enter' && activeObject && activeObject.type === 'textbox') {
      const textbox = activeObject as fabric.Textbox;
      textbox.enterEditing();
      textbox.selectAll();
      setIsTextEditing(true);
      event.preventDefault();
    }

    // Escape key to exit text editing
    if (event.key === 'Escape' && isTextEditing && activeObject && activeObject.type === 'textbox') {
      const textbox = activeObject as fabric.Textbox;
      textbox.exitEditing();
      setIsTextEditing(false);
      event.preventDefault();
    }

    // Ctrl/Cmd + T to add new text element
    if ((event.ctrlKey || event.metaKey) && event.key === 't') {
      addTextElementAtPosition(100, 100);
      event.preventDefault();
    }

    // Arrow keys for fine positioning (when not editing text)
    if (!isTextEditing && activeObject && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      const step = event.shiftKey ? 10 : 1; // Shift for larger steps
      let deltaX = 0, deltaY = 0;

      switch (event.key) {
        case 'ArrowUp': deltaY = -step; break;
        case 'ArrowDown': deltaY = step; break;
        case 'ArrowLeft': deltaX = -step; break;
        case 'ArrowRight': deltaX = step; break;
      }

      const newLeft = (activeObject.left || 0) + deltaX;
      const newTop = (activeObject.top || 0) + deltaY;

      activeObject.set({ left: newLeft, top: newTop });
      fabricCanvasRef.current.renderAll();

      // Update Redux state
      if (activeObject.data?.elementId) {
        dispatch(moveElement({
          slideId,
          elementId: activeObject.data.elementId,
          position: { x: newLeft, y: newTop },
        }));
      }

      event.preventDefault();
    }
  }, [dispatch, slideId, isTextEditing, addTextElementAtPosition]);

  // Enhanced object movement with snap-to-grid (visual only, no Redux updates)
  const handleObjectMoving = useCallback((e: fabric.IEvent) => {
    const obj = e.target;
    if (!obj || !obj.data?.elementId || !currentSlide) return;

    const currentPosition = { x: obj.left || 0, y: obj.top || 0 };
    const objectSize = {
      width: (obj.width || 0) * (obj.scaleX || 1),
      height: (obj.height || 0) * (obj.scaleY || 1)
    };

    // Find snap position
    const snappedResult = dragDropService.findSnapPosition(
      currentPosition,
      objectSize,
      currentSlide.elements,
      [obj.data.elementId]
    );

    // Apply snapped position (visual only)
    obj.set({
      left: snappedResult.position.x,
      top: snappedResult.position.y,
    });

    // Show snap guides
    dragDropService.showSnapGuides(snappedResult.guides);

    // NO Redux updates during movement - this prevents LaTeX generation spam
    console.log('🔄 [SlideCanvas] Object moving (visual only):', {
      elementId: obj.data.elementId,
      position: snappedResult.position,
      elementType: obj.type
    });
  }, [currentSlide]);

  const handleObjectMoved = useCallback((e: fabric.IEvent) => {
    const obj = e.target;
    
    console.log('✅ [SlideCanvas] Object moved (final position):', {
      elementId: obj?.data?.elementId,
      finalPosition: { x: obj?.left || 0, y: obj?.top || 0 },
      elementType: obj?.type
    });
    
    // Hide snap guides after movement
    setTimeout(() => dragDropService.hideSnapGuides(), 500);

    // Update final position in Redux and schedule LaTeX generation with debouncing
    if (obj && obj.data?.elementId) {
      console.log('📍 [SlideCanvas] Movement finished, updating Redux and scheduling LaTeX generation:', {
        elementId: obj.data.elementId,
        finalPosition: { x: obj.left || 0, y: obj.top || 0 },
        elementType: obj.type
      });

      // Update the final position in Redux immediately
      dispatch(moveElement({
        slideId,
        elementId: obj.data.elementId,
        position: { x: obj.left || 0, y: obj.top || 0 },
      }));

      // Schedule LaTeX generation for text elements after movement (with debouncing)
      if (obj.type === 'textbox') {
        const textbox = obj as fabric.Textbox;
        console.log('📍 [SlideCanvas] Text element moved, scheduling LaTeX generation with debouncing');
        
        latexGenerationService.scheduleGeneration(
          slideId,
          obj.data.elementId,
          textbox.text || ''
        );
      }
    }
  }, [dispatch, slideId]);

  // Setup canvas event handlers
  const setupCanvasEventHandlers = useCallback((canvas: fabric.Canvas) => {
    // Object selection events
    canvas.on('selection:created', (e) => {
      console.log('🎯 [SlideCanvas] ===== SELECTION CREATED =====');
      const selectedObject = e.selected?.[0];
      console.log('🎯 [SlideCanvas] Selection details:', {
        hasSelected: !!selectedObject,
        selectedType: selectedObject?.type,
        selectedElementId: selectedObject?.data?.elementId,
        selectedText: (selectedObject as fabric.Textbox)?.text,
        selectedEditable: (selectedObject as fabric.Textbox)?.editable,
        selectedSelectable: selectedObject?.selectable,
        selectedEvented: selectedObject?.evented
      });
      if (selectedObject && selectedObject.data?.elementId) {
        setSelectedElementId(selectedObject.data.elementId);

        // Get element properties from Redux store
        const element = currentSlide?.elements.find(el => el.id === selectedObject.data.elementId);
        if (element) {
          setSelectedElementProperties(element.properties);
        }

        // Exit text editing mode when selecting different object
        setIsTextEditing(false);
      }
    });

    canvas.on('selection:cleared', () => {
      console.log('🚫 [SlideCanvas] ===== SELECTION CLEARED =====');
      console.log('🚫 [SlideCanvas] Clearing selection state');
      setSelectedElementId(null);
      setSelectedElementProperties({});
      setIsTextEditing(false);
    });

    // Double-click to enter text editing mode
    canvas.on('mouse:dblclick', (e) => {
      console.log('🖱️ [SlideCanvas] ===== DOUBLE CLICK EVENT =====');
      console.log('🖱️ [SlideCanvas] Double click details:', {
        hasTarget: !!e.target,
        targetType: e.target?.type,
        targetElementId: e.target?.data?.elementId,
        targetText: (e.target as fabric.Textbox)?.text,
        targetEditable: (e.target as fabric.Textbox)?.editable,
        targetSelectable: e.target?.selectable,
        targetEvented: e.target?.evented,
        currentIsTextEditing: isTextEditing
      });
      const target = e.target;
      if (target && target.type === 'textbox' && target.data?.elementId) {
        console.log('✅ [SlideCanvas] Valid textbox target found, entering edit mode');
        setIsTextEditing(true);
        const textbox = target as fabric.Textbox;
        textbox.enterEditing();
        textbox.selectAll();

        // Add visual feedback for editing mode
        target.set({
          borderColor: '#3b82f6',
          borderDashArray: [5, 5],
          borderOpacityWhenMoving: 1,
        });
        canvas.renderAll();
      }
    });

    // Text editing events with enhanced logging
    canvas.on('text:editing:entered', (e) => {
      console.log('🎯 [SlideCanvas] ===== TEXT EDITING ENTERED =====');
      console.log('🎯 [SlideCanvas] Event details:', {
        target: e.target?.type,
        elementId: e.target?.data?.elementId,
        currentIsTextEditing: isTextEditing,
        targetText: (e.target as fabric.Textbox)?.text,
        targetWidth: e.target?.width,
        targetHeight: e.target?.height,
        targetLeft: e.target?.left,
        targetTop: e.target?.top,
        targetVisible: e.target?.visible,
        targetSelectable: e.target?.selectable,
        targetEvented: e.target?.evented
      });

      setIsTextEditing(true);
      const target = e.target;
      if (target) {
        console.log('🎯 [SlideCanvas] Applying visual feedback for editing mode');
        // Visual feedback for editing mode
        target.set({
          borderColor: '#3b82f6',
          borderDashArray: [5, 5],
        });
        canvas.renderAll();
        console.log('✅ [SlideCanvas] Text editing visual feedback applied');

        // Focus the canvas to ensure keyboard events work
        const canvasElement = canvas.getElement();
        if (canvasElement) {
          canvasElement.focus();
          console.log('🎯 [SlideCanvas] Canvas element focused for text editing');
        }
      } else {
        console.error('❌ [SlideCanvas] No target in text:editing:entered event');
      }
    });

    canvas.on('text:editing:exited', (e) => {
      console.log('🚪 [SlideCanvas] ===== TEXT EDITING EXITED =====');
      console.log('🚪 [SlideCanvas] Event details:', {
        target: e.target?.type,
        elementId: e.target?.data?.elementId,
        text: (e.target as fabric.Textbox)?.text,
        textLength: (e.target as fabric.Textbox)?.text?.length || 0,
        currentIsTextEditing: isTextEditing
      });

      const target = e.target;
      if (target && target.data?.elementId) {
        const textbox = target as fabric.Textbox;
        console.log('💾 [SlideCanvas] Text editing finished, updating Redux and scheduling LaTeX generation:', {
          elementId: target.data.elementId,
          newText: textbox.text,
          textLength: textbox.text?.length || 0,
          position: { x: textbox.left, y: textbox.top }
        });

        // Update text content and position in Redux store immediately
        dispatch(updateElement({
          slideId,
          elementId: target.data.elementId,
          updates: { 
            content: textbox.text,
            position: { x: textbox.left || 0, y: textbox.top || 0 }
          }
        }));

        // Schedule LaTeX generation with debouncing
        latexGenerationService.scheduleGeneration(
          slideId,
          target.data.elementId,
          textbox.text || ''
        );

        // Remove editing visual feedback
        target.set({
          borderColor: 'rgba(178,204,255,1)',
          borderDashArray: undefined,
        });
        canvas.renderAll();
        console.log('🎨 [SlideCanvas] Visual feedback removed');
      } else {
        console.error('❌ [SlideCanvas] No target or elementId in text:editing:exited event');
      }

      setIsTextEditing(false);
      console.log('📝 [SlideCanvas] Text editing state set to false');
    });

    canvas.on('text:changed', (e) => {
      console.log('📝 [SlideCanvas] ===== TEXT CHANGED (REAL-TIME) =====');
      console.log('📝 [SlideCanvas] Event details:', {
        target: e.target?.type,
        elementId: e.target?.data?.elementId,
        text: (e.target as fabric.Textbox)?.text,
        textLength: (e.target as fabric.Textbox)?.text?.length || 0,
        currentIsTextEditing: isTextEditing,
        timestamp: new Date().toISOString()
      });

      // Don't update Redux during real-time text changes
      // This prevents LaTeX generation on every keystroke
      // Updates will only happen when user exits editing mode
      console.log('🔄 Real-time text change detected, but not updating Redux to prevent LaTeX spam');
    });

    // Object modification events with enhanced drag-and-drop
    canvas.on('object:moving', handleObjectMoving);
    canvas.on('object:moved', handleObjectMoved);

    canvas.on('object:scaling', (e) => {
      const obj = e.target;
      if (obj && obj.data?.elementId) {
        // Update size during scaling
        const size: Size = {
          width: (obj.width || 0) * (obj.scaleX || 1),
          height: (obj.height || 0) * (obj.scaleY || 1),
        };

        dispatch(resizeElement({
          slideId,
          elementId: obj.data.elementId,
          size,
        }));
      }
    });

    // Mouse wheel zoom
    canvas.on('mouse:wheel', (opt) => {
      const delta = opt.e.deltaY;
      let newZoom = canvas.getZoom();
      newZoom *= 0.999 ** delta;

      // Limit zoom range
      if (newZoom > 20) newZoom = 20;
      if (newZoom < 0.01) newZoom = 0.01;

      canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, newZoom);
      setZoom(newZoom);

      // Notify virtualization service of viewport change
      canvasVirtualizationService.onViewportChange();

      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    // Shape drawing and pan functionality
    canvas.on('mouse:down', (opt) => {
      const evt = opt.e;
      const pointer = canvas.getPointer(evt);

      // Handle panning with Alt key
      if (evt.altKey === true) {
        setIsPanning(true);
        setLastPanPoint({ x: evt.clientX, y: evt.clientY });
        canvas.selection = false;
        return;
      }

      // Handle shape drawing
      if (activeTool === 'shape' && activeShapeType && !opt.target) {
        setShapeDrawingState({
          isDrawing: true,
          startPoint: { x: pointer.x, y: pointer.y },
          currentShape: null,
        });
        canvas.selection = false;
      }
    });

    canvas.on('mouse:move', (opt) => {
      const evt = opt.e;
      const pointer = canvas.getPointer(evt);

      // Handle panning
      if (isPanning && lastPanPoint) {
        const vpt = canvas.viewportTransform;
        if (vpt) {
          vpt[4] += evt.clientX - lastPanPoint.x;
          vpt[5] += evt.clientY - lastPanPoint.y;
          canvas.requestRenderAll();
          setLastPanPoint({ x: evt.clientX, y: evt.clientY });
        }
        return;
      }

      // Handle shape drawing
      if (shapeDrawingState.isDrawing && shapeDrawingState.startPoint && activeShapeType) {
        // Remove previous preview shape
        if (shapeDrawingState.currentShape) {
          canvas.remove(shapeDrawingState.currentShape);
        }

        // Create preview shape
        const previewShape = createFabricShape(
          activeShapeType,
          shapeDrawingState.startPoint.x,
          shapeDrawingState.startPoint.y,
          pointer.x,
          pointer.y,
          {
            fillColor: { r: 200, g: 200, b: 200, a: 0.7 },
            strokeColor: { r: 0, g: 0, b: 0 },
            strokeWidth: 2,
          }
        );

        previewShape.selectable = false;
        previewShape.evented = false;
        previewShape.opacity = 0.7;

        canvas.add(previewShape);
        setShapeDrawingState(prev => ({
          ...prev,
          currentShape: previewShape,
        }));

        canvas.renderAll();
      }
    });

    canvas.on('mouse:up', (opt) => {
      const evt = opt.e;
      const pointer = canvas.getPointer(evt);

      // Handle panning
      if (isPanning) {
        const vpt = canvas.viewportTransform;
        if (vpt) {
          canvas.setViewportTransform(vpt);
        }
        setIsPanning(false);
        setLastPanPoint(null);
        canvas.selection = true;
        return;
      }

      // Handle shape drawing completion
      if (shapeDrawingState.isDrawing && shapeDrawingState.startPoint && activeShapeType) {
        // Remove preview shape
        if (shapeDrawingState.currentShape) {
          canvas.remove(shapeDrawingState.currentShape);
        }

        // Calculate minimum size for shape
        const minSize = 10;
        const width = Math.abs(pointer.x - shapeDrawingState.startPoint.x);
        const height = Math.abs(pointer.y - shapeDrawingState.startPoint.y);

        // Only create shape if it's large enough
        if (width >= minSize || height >= minSize) {
          // Create the actual shape element
          const shapeElement = fabricObjectToSlideElement(
            createFabricShape(
              activeShapeType,
              shapeDrawingState.startPoint.x,
              shapeDrawingState.startPoint.y,
              pointer.x,
              pointer.y
            ),
            activeShapeType
          );

          dispatch(addElement({ slideId, element: shapeElement }));
        }

        // Reset drawing state
        setShapeDrawingState({
          isDrawing: false,
          startPoint: null,
          currentShape: null,
        });

        canvas.selection = true;
      }
    });

    // Note: Keyboard events will be handled at the component level
    // since Fabric.js keyboard events have limited browser support
  }, [handleObjectMoving, handleObjectMoved, currentSlide?.elements, isTextEditing, dispatch, slideId, activeTool, activeShapeType, isPanning, lastPanPoint, shapeDrawingState.isDrawing, shapeDrawingState.startPoint, shapeDrawingState.currentShape]);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width,
      height,
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true,
    });

    fabricCanvasRef.current = canvas;
    setIsCanvasReady(true);

    // Set up canvas event handlers
    setupCanvasEventHandlers(canvas);

    // Initialize performance optimizations
    canvasVirtualizationService.initialize(canvas);
    memoryManagementService.registerCanvas(canvas);

    // Cleanup function
    return () => {
      // Cleanup performance services
      canvasVirtualizationService.cleanup();
      memoryManagementService.unregisterCanvas(canvas);

      canvas.dispose();
      fabricCanvasRef.current = null;
      setIsCanvasReady(false);
    };
  }, [width, height, setupCanvasEventHandlers]);

  // Add keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Cleanup LaTeX generation service on unmount
  useEffect(() => {
    return () => {
      latexGenerationService.clearAllPending();
    };
  }, []);

  // Monitor LaTeX generation status
  useEffect(() => {
    const updateStatus = () => {
      setLatexGenerationStatus({
        isGenerating: latexGenerationService.isGenerationInProgress(),
        pendingCount: latexGenerationService.getPendingCount()
      });
    };

    // Update status immediately
    updateStatus();

    // Set up periodic status updates
    const statusInterval = setInterval(updateStatus, 500);

    return () => {
      clearInterval(statusInterval);
    };
  }, []);

  // Create Fabric.js object from slide element
  const createFabricObjectFromElement = useCallback((element: SlideElement, canvas: fabric.Canvas) => {
    let fabricObject: fabric.Object | null = null;

    switch (element.type) {
      case 'text':
        const textContent = element.content || 'Text';
        const hasMathContent = containsMath(textContent);

        if (hasMathContent) {
          // For text with math expressions, create a group with mixed content
          createMathTextElement(element, canvas);
          return; // Early return since we handle this differently
        } else {
          // Regular text without math
          console.log('📝 [SlideCanvas] Creating Fabric.Textbox with config:', {
            textContent,
            position: { x: element.position.x, y: element.position.y },
            size: { width: element.size.width, height: element.size.height },
            fontSize: element.properties.fontSize || 16,
            fontFamily: element.properties.fontFamily || 'Arial'
          });

          fabricObject = new fabric.Textbox(textContent, {
            left: element.position.x,
            top: element.position.y,
            width: element.size.width,
            height: element.size.height,
            fontSize: element.properties.fontSize || 16,
            fontFamily: element.properties.fontFamily || 'Arial',
            fill: element.properties.textColor ?
              `rgba(${element.properties.textColor.r}, ${element.properties.textColor.g}, ${element.properties.textColor.b}, ${element.properties.textColor.a || 1})` :
              '#000000',
            fontWeight: element.properties.fontWeight || 'normal',
            fontStyle: element.properties.fontStyle || 'normal',
            textAlign: element.properties.textAlign || 'left',
            // Ensure text editing is enabled
            editable: true,
            selectable: true,
            evented: true,
            // Fix potential focus issues
            isEditing: false,
          });
        }
        break;

      case 'shape':
        // Use the shape utility to create the appropriate shape
        const shapeType = element.properties.shapeType || 'rectangle';
        fabricObject = createFabricShape(
          shapeType,
          element.position.x,
          element.position.y,
          element.position.x + element.size.width,
          element.position.y + element.size.height,
          {
            fillColor: element.properties.fillColor,
            strokeColor: element.properties.strokeColor,
            strokeWidth: element.properties.strokeWidth,
          }
        );
        break;

      case 'image':
        if (element.content) {
          fabric.Image.fromURL(element.content, (img) => {
            img.set({
              left: element.position.x,
              top: element.position.y,
              scaleX: element.size.width / (img.width || 1),
              scaleY: element.size.height / (img.height || 1),
            });
            img.data = { elementId: element.id };
            canvas.add(img);
            canvas.renderAll();
          });
          return; // Early return for async image loading
        }
        break;

      default:
        console.warn(`Unsupported element type: ${element.type}`);
        return;
    }

    if (fabricObject) {
      // Store element ID for reference
      fabricObject.data = { elementId: element.id };

      // Apply common properties
      if (element.properties.opacity !== undefined) {
        fabricObject.opacity = element.properties.opacity;
      }
      if (element.properties.rotation !== undefined) {
        fabricObject.angle = element.properties.rotation;
      }

      canvas.add(fabricObject);
    }
  }, []);

  // Load slide elements into canvas
  useEffect(() => {
    if (!isCanvasReady || !fabricCanvasRef.current || !currentSlide) return;

    const canvas = fabricCanvasRef.current;

    // Don't update canvas if user is currently editing text
    if (isTextEditing) {
      console.log('🚫 [SlideCanvas] Skipping canvas update - user is editing text');
      return;
    }

    // Clear existing objects
    canvas.clear();
    canvas.backgroundColor = '#ffffff';

    // Update virtualization service with new elements
    canvasVirtualizationService.updateElements(currentSlide.elements);

    // Load elements from slide data (virtualization service will handle which ones to actually render)
    currentSlide.elements.forEach((element) => {
      createFabricObjectFromElement(element, canvas);
    });

    canvas.renderAll();

    // Check if we need to auto-edit the last added text element
    const lastElement = currentSlide.elements[currentSlide.elements.length - 1];
    if (lastElement && lastElement.type === 'text' && lastElement.content === 'Type your text here') {
      console.log('🎯 [SlideCanvas] Auto-editing newly created text element');
      setTimeout(() => {
        const objects = canvas.getObjects();
        const lastTextObject = objects.find(obj => obj.data?.elementId === lastElement.id);
        if (lastTextObject && lastTextObject.type === 'textbox') {
          console.log('✅ [SlideCanvas] Found new textbox for auto-edit');
          canvas.setActiveObject(lastTextObject);
          const textbox = lastTextObject as fabric.Textbox;

          // Add visual feedback
          textbox.set({
            borderColor: '#10b981',
            borderDashArray: [5, 5],
            cornerColor: '#10b981',
            cornerSize: 8,
          });

          textbox.enterEditing();
          textbox.selectAll();
          setIsTextEditing(true);
          canvas.renderAll();

          // Remove special styling after 2 seconds
          setTimeout(() => {
            textbox.set({
              borderColor: 'rgba(178,204,255,1)',
              borderDashArray: undefined,
              cornerColor: 'rgba(178,204,255,1)',
              cornerSize: 6,
            });
            canvas.renderAll();
          }, 2000);
        }
      }, 100);
    }
  }, [isCanvasReady, currentSlide, isTextEditing, createFabricObjectFromElement]);

  // Create a text element with math expressions using HTML rendering
  const createMathTextElement = (element: SlideElement, canvas: fabric.Canvas) => {
    const textContent = element.content || 'Text';
    const segments = parseMathContent(textContent);

    // Create a group to hold both text and math elements
    const elements: fabric.Object[] = [];
    let currentY = 0;
    const lineHeight = (element.properties.fontSize || 16) * 1.2;

    segments.forEach((segment, index) => {
      if (segment.type === 'text') {
        // Create regular text element
        const textObj = new fabric.Text(segment.content, {
          left: 0,
          top: currentY,
          fontSize: element.properties.fontSize || 16,
          fontFamily: element.properties.fontFamily || 'Arial',
          fill: element.properties.textColor ?
            `rgba(${element.properties.textColor.r}, ${element.properties.textColor.g}, ${element.properties.textColor.b}, ${element.properties.textColor.a || 1})` :
            '#000000',
          fontWeight: element.properties.fontWeight || 'normal',
          fontStyle: element.properties.fontStyle || 'normal',
        });
        elements.push(textObj);
        currentY += lineHeight;
      } else if (segment.type === 'math' && segment.rendered) {
        // Create HTML element for math rendering
        const mathContainer = document.createElement('div');
        mathContainer.innerHTML = segment.rendered;
        mathContainer.style.fontSize = `${element.properties.fontSize || 16}px`;
        mathContainer.style.fontFamily = element.properties.fontFamily || 'Arial';
        mathContainer.style.color = element.properties.textColor ?
          `rgba(${element.properties.textColor.r}, ${element.properties.textColor.g}, ${element.properties.textColor.b}, ${element.properties.textColor.a || 1})` :
          '#000000';

        // Convert HTML to canvas-compatible format
        // For now, show a placeholder with the LaTeX code
        const mathPlaceholder = new fabric.Text(`[Math: ${segment.content}]`, {
          left: 0,
          top: currentY,
          fontSize: element.properties.fontSize || 16,
          fontFamily: 'monospace',
          fill: '#0066cc',
          backgroundColor: 'rgba(230, 240, 255, 0.8)',
          padding: 4,
        });
        elements.push(mathPlaceholder);
        currentY += lineHeight;
      }
    });

    // If we have multiple elements, create a group
    let fabricObject: fabric.Object;
    if (elements.length > 1) {
      fabricObject = new fabric.Group(elements, {
        left: element.position.x,
        top: element.position.y,
        selectable: true,
      });
    } else if (elements.length === 1) {
      fabricObject = elements[0];
      fabricObject.set({
        left: element.position.x,
        top: element.position.y,
      });
    } else {
      // Fallback to simple text
      fabricObject = new fabric.Text(textContent, {
        left: element.position.x,
        top: element.position.y,
        fontSize: element.properties.fontSize || 16,
        fontFamily: element.properties.fontFamily || 'Arial',
        fill: '#000000',
      });
    }

    // Store element ID and mark as containing math
    fabricObject.data = {
      elementId: element.id,
      hasMath: true,
      originalContent: textContent,
      mathSegments: segments
    };

    // Apply common properties
    if (element.properties.opacity !== undefined) {
      fabricObject.opacity = element.properties.opacity;
    }
    if (element.properties.rotation !== undefined) {
      fabricObject.angle = element.properties.rotation;
    }

    canvas.add(fabricObject);
  };

  // Update Fabric.js object properties in real-time
  const updateFabricObjectProperties = (fabricObject: fabric.Object, properties: Partial<ElementProperties>) => {
    if (fabricObject.type === 'textbox') {
      const textbox = fabricObject as fabric.Textbox;

      if (properties.fontSize !== undefined) {
        textbox.set('fontSize', properties.fontSize);
      }
      if (properties.fontFamily !== undefined) {
        textbox.set('fontFamily', properties.fontFamily);
      }
      if (properties.fontWeight !== undefined) {
        textbox.set('fontWeight', properties.fontWeight);
      }
      if (properties.fontStyle !== undefined) {
        textbox.set('fontStyle', properties.fontStyle);
      }
      if (properties.textAlign !== undefined) {
        textbox.set('textAlign', properties.textAlign);
      }
      if (properties.textColor !== undefined) {
        const color = `rgba(${properties.textColor.r}, ${properties.textColor.g}, ${properties.textColor.b}, ${properties.textColor.a || 1})`;
        textbox.set('fill', color);
      }
      if (properties.backgroundColor !== undefined) {
        if (properties.backgroundColor.a === 0) {
          textbox.set('backgroundColor', 'transparent');
        } else {
          const bgColor = `rgba(${properties.backgroundColor.r}, ${properties.backgroundColor.g}, ${properties.backgroundColor.b}, ${properties.backgroundColor.a || 1})`;
          textbox.set('backgroundColor', bgColor);
        }
      }

      // Handle line height (custom property)
      if ((properties as any).lineHeight !== undefined) {
        textbox.set('lineHeight', (properties as any).lineHeight);
      }

      // Handle text decorations (for future LaTeX generation)
      if ((properties as any).textDecorations !== undefined) {
        // Store decorations as custom data for LaTeX generation
        textbox.data = {
          ...textbox.data,
          textDecorations: (properties as any).textDecorations
        };

        // Apply visual feedback for decorations (basic implementation)
        const decorations = (properties as any).textDecorations || [];
        if (decorations.includes('underline')) {
          textbox.set('underline', true);
        }
        if (decorations.includes('strikethrough')) {
          textbox.set('linethrough', true);
        }
      }
    } else if (fabricObject.type === 'image') {
      const image = fabricObject as fabric.Image;

      // Handle image-specific properties
      if ((properties as any).flipX !== undefined) {
        image.set('flipX', (properties as any).flipX);
      }
      if ((properties as any).flipY !== undefined) {
        image.set('flipY', (properties as any).flipY);
      }

      // Handle image source update (for cropping)
      if (properties.src !== undefined && properties.src !== image.getSrc()) {
        fabric.Image.fromURL(properties.src, (newImg) => {
          // Preserve position and scale
          const left = image.left;
          const top = image.top;
          const scaleX = image.scaleX;
          const scaleY = image.scaleY;
          const angle = image.angle;
          const opacity = image.opacity;
          const flipX = image.flipX;
          const flipY = image.flipY;
          const elementId = image.data?.elementId;

          // Remove old image and add new one
          if (fabricCanvasRef.current) {
            fabricCanvasRef.current.remove(image);
            newImg.set({
              left,
              top,
              scaleX,
              scaleY,
              angle,
              opacity,
              flipX,
              flipY,
            });
            newImg.data = { elementId };
            fabricCanvasRef.current.add(newImg);
            fabricCanvasRef.current.setActiveObject(newImg);
            fabricCanvasRef.current.renderAll();
          }
        });
      }
    } else if (fabricObject.type === 'rect' || fabricObject.type === 'circle' ||
      fabricObject.type === 'ellipse' || fabricObject.type === 'triangle' ||
      fabricObject.type === 'polygon' || fabricObject.type === 'line' ||
      fabricObject.type === 'group') {
      // Handle shape-specific properties
      if (properties.fillColor !== undefined) {
        const fillColor = `rgba(${properties.fillColor.r}, ${properties.fillColor.g}, ${properties.fillColor.b}, ${properties.fillColor.a || 1})`;
        fabricObject.set('fill', fillColor);
      }
      if (properties.strokeColor !== undefined) {
        const strokeColor = `rgba(${properties.strokeColor.r}, ${properties.strokeColor.g}, ${properties.strokeColor.b}, ${properties.strokeColor.a || 1})`;
        fabricObject.set('stroke', strokeColor);
      }
      if (properties.strokeWidth !== undefined) {
        fabricObject.set('strokeWidth', properties.strokeWidth);
      }

      // Handle corner radius for rectangles
      if (fabricObject.type === 'rect' && properties.cornerRadius !== undefined) {
        (fabricObject as fabric.Rect).set('rx', properties.cornerRadius);
        (fabricObject as fabric.Rect).set('ry', properties.cornerRadius);
      }
    }

    // Common properties for all objects
    if (properties.opacity !== undefined) {
      fabricObject.set('opacity', properties.opacity);
    }
    if (properties.rotation !== undefined) {
      fabricObject.set('angle', properties.rotation);
    }
  };



  // Zoom controls
  const handleZoomIn = () => {
    if (fabricCanvasRef.current) {
      const newZoom = Math.min(zoom * 1.2, 20);
      fabricCanvasRef.current.setZoom(newZoom);
      setZoom(newZoom);
    }
  };

  const handleZoomOut = () => {
    if (fabricCanvasRef.current) {
      const newZoom = Math.max(zoom / 1.2, 0.01);
      fabricCanvasRef.current.setZoom(newZoom);
      setZoom(newZoom);
    }
  };

  const handleZoomReset = () => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.setZoom(1);
      fabricCanvasRef.current.setViewportTransform([1, 0, 0, 1, 0, 0]);
      setZoom(1);
    }
  };

  // Initialize drag-drop service with canvas
  useEffect(() => {
    if (fabricCanvasRef.current) {
      dragDropService.setCanvas(fabricCanvasRef.current);
      dragDropService.updateOptions({
        snapToGrid: presentation?.settings.snapToGrid ?? true,
        gridSize: presentation?.settings.gridSize ?? 10,
        snapThreshold: 5,
        showSnapGuides: true,
        enableZIndexManagement: true,
      });
    }
  }, [presentation?.settings]);

  // Removed drag-and-drop functionality to prevent issues



  // Z-index management functions
  const bringToFront = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    const activeObject = fabricCanvasRef.current.getActiveObject();
    if (activeObject && activeObject.data?.elementId) {
      dragDropService.bringToFront(activeObject);

      // Update z-index in Redux
      const newZIndex = dragDropService.getElementZIndex(activeObject);
      dispatch(updateElementProperties({
        slideId,
        elementId: activeObject.data.elementId,
        properties: { zIndex: newZIndex },
      }));
    }
  }, [dispatch, slideId]);

  const sendToBack = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    const activeObject = fabricCanvasRef.current.getActiveObject();
    if (activeObject && activeObject.data?.elementId) {
      dragDropService.sendToBack(activeObject);

      // Update z-index in Redux
      const newZIndex = dragDropService.getElementZIndex(activeObject);
      dispatch(updateElementProperties({
        slideId,
        elementId: activeObject.data.elementId,
        properties: { zIndex: newZIndex },
      }));
    }
  }, [dispatch, slideId]);

  const bringForward = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    const activeObject = fabricCanvasRef.current.getActiveObject();
    if (activeObject && activeObject.data?.elementId) {
      dragDropService.bringForward(activeObject);

      // Update z-index in Redux
      const newZIndex = dragDropService.getElementZIndex(activeObject);
      dispatch(updateElementProperties({
        slideId,
        elementId: activeObject.data.elementId,
        properties: { zIndex: newZIndex },
      }));
    }
  }, [dispatch, slideId]);

  const sendBackwards = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    const activeObject = fabricCanvasRef.current.getActiveObject();
    if (activeObject && activeObject.data?.elementId) {
      dragDropService.sendBackwards(activeObject);

      // Update z-index in Redux
      const newZIndex = dragDropService.getElementZIndex(activeObject);
      dispatch(updateElementProperties({
        slideId,
        elementId: activeObject.data.elementId,
        properties: { zIndex: newZIndex },
      }));
    }
  }, [dispatch, slideId]);



  // Add text element (button click only)
  const addTextElement = () => {
    console.log('🔘 [SlideCanvas] ===== TEXT BUTTON CLICKED =====');
    console.log('🔘 [SlideCanvas] Button click state:', {
      hasCanvas: !!fabricCanvasRef.current,
      isCanvasReady,
      slideId,
      timestamp: new Date().toISOString()
    });
    console.log('🔘 Text button clicked, calling addTextElementAtPosition');
    addTextElementAtPosition(400, 300); // Center of canvas
  };

  // Add shape element
  const addShapeElement = () => {
    if (!fabricCanvasRef.current || !activeShapeType) return;

    const shapeElement = fabricObjectToSlideElement(
      createFabricShape(
        activeShapeType,
        150,
        150,
        250,
        250,
        {
          fillColor: { r: 200, g: 200, b: 200 },
          strokeColor: { r: 0, g: 0, b: 0 },
          strokeWidth: 2,
        }
      ),
      activeShapeType
    );

    dispatch(addElement({ slideId, element: shapeElement }));
  };

  // Handle image import
  const handleImageImport = useCallback((imageData: { dataUrl: string; info: ImageInfo; name: string }) => {
    if (!fabricCanvasRef.current) return;

    // Calculate appropriate size for the image (max 400px width/height)
    const maxSize = 400;
    const aspectRatio = imageData.info.width / imageData.info.height;
    let width = imageData.info.width;
    let height = imageData.info.height;

    if (width > maxSize) {
      width = maxSize;
      height = width / aspectRatio;
    }
    if (height > maxSize) {
      height = maxSize;
      width = height * aspectRatio;
    }

    const newElement: Omit<SlideElement, 'id' | 'createdAt' | 'updatedAt'> = {
      type: 'image',
      position: { x: 100, y: 100 },
      size: { width: Math.round(width), height: Math.round(height) },
      properties: {
        src: imageData.dataUrl,
        alt: imageData.name,
        opacity: 1,
      },
      content: imageData.dataUrl, // Store the data URL as content
    };

    dispatch(addElement({ slideId, element: newElement }));
  }, [dispatch, slideId]);

  // Handle direct image file drop on canvas
  const handleImageFileDrop = useCallback(async (files: FileList) => {
    for (const file of Array.from(files)) {
      if (file.type.startsWith('image/')) {
        try {
          const validation = validateImageFile(file);
          if (!validation.isValid) {
            console.error('Invalid image file:', validation.error);
            continue;
          }

          const info = await getImageInfo(file);
          const { dataUrl } = await convertImageForLatex(file);

          handleImageImport({
            dataUrl,
            info,
            name: file.name
          });
        } catch (error) {
          console.error('Error processing dropped image:', error);
        }
      }
    }
  }, [handleImageImport]);

  if (!currentSlide) {
    return <div className="slide-canvas-error">Slide not found</div>;
  }

  return (
    <div className="slide-canvas-container">
      <div className="canvas-toolbar">
        <button
          onClick={addTextElement}
          className="toolbar-button"
          type="button"
          title="Click to add text element"
        >
          📝 Text
        </button>

        <button
          onClick={() => setShowImageImportDialog(true)}
          className="toolbar-button"
          type="button"
          title="Click to add image"
        >
          🖼️ Image
        </button>

        <button onClick={addShapeElement} className="toolbar-button">
          🔷 Shape
        </button>

        <div className="toolbar-separator" />

        <div className="z-index-controls">
          <button
            onClick={bringToFront}
            className="toolbar-button"
            title="Bring to Front"
            disabled={!selectedElementId}
          >
            ⬆️
          </button>
          <button
            onClick={bringForward}
            className="toolbar-button"
            title="Bring Forward"
            disabled={!selectedElementId}
          >
            ↗️
          </button>
          <button
            onClick={sendBackwards}
            className="toolbar-button"
            title="Send Backwards"
            disabled={!selectedElementId}
          >
            ↙️
          </button>
          <button
            onClick={sendToBack}
            className="toolbar-button"
            title="Send to Back"
            disabled={!selectedElementId}
          >
            ⬇️
          </button>
        </div>
        <div className="zoom-controls">
          <button onClick={handleZoomOut} className="zoom-button">-</button>
          <span className="zoom-level">{Math.round(zoom * 100)}%</span>
          <button onClick={handleZoomIn} className="zoom-button">+</button>
          <button onClick={handleZoomReset} className="zoom-button">Reset</button>
        </div>

        {/* LaTeX Generation Status Indicator */}
        {(latexGenerationStatus.isGenerating || latexGenerationStatus.pendingCount > 0) && (
          <div className="latex-status-indicator">
            {latexGenerationStatus.isGenerating && (
              <span className="generating">
                🔄 Generating LaTeX...
              </span>
            )}
            {latexGenerationStatus.pendingCount > 0 && (
              <span className="pending">
                ⏳ {latexGenerationStatus.pendingCount} pending
              </span>
            )}
          </div>
        )}
      </div>

      {/* Text Formatting Toolbar - shown when text element is selected */}
      {selectedElementId && currentSlide?.elements.find(el => el.id === selectedElementId)?.type === 'text' && (
        <TextFormattingToolbar
          slideId={slideId}
          elementId={selectedElementId}
          currentProperties={selectedElementProperties}
          onPropertyChange={(properties) => {
            setSelectedElementProperties(prev => ({ ...prev, ...properties }));
            // Also update the Fabric.js object immediately for visual feedback
            if (fabricCanvasRef.current) {
              const activeObject = fabricCanvasRef.current.getActiveObject();
              if (activeObject && activeObject.data?.elementId === selectedElementId) {
                updateFabricObjectProperties(activeObject, properties);
                fabricCanvasRef.current.renderAll();
              }
            }
          }}
        />
      )}

      {/* Image Editing Toolbar - shown when image element is selected */}
      {selectedElementId && currentSlide?.elements.find(el => el.id === selectedElementId)?.type === 'image' && (
        <ImageEditingToolbar
          slideId={slideId}
          elementId={selectedElementId}
          currentProperties={selectedElementProperties}
          onPropertyChange={(properties) => {
            setSelectedElementProperties(prev => ({ ...prev, ...properties }));
            // Also update the Fabric.js object immediately for visual feedback
            if (fabricCanvasRef.current) {
              const activeObject = fabricCanvasRef.current.getActiveObject();
              if (activeObject && activeObject.data?.elementId === selectedElementId) {
                updateFabricObjectProperties(activeObject, properties);
                fabricCanvasRef.current.renderAll();
              }
            }
          }}
        />
      )}

      {/* Shape Toolbar - shown when shape tool is active or shape element is selected */}
      {(activeTool === 'shape' || (selectedElementId && currentSlide?.elements.find(el => el.id === selectedElementId)?.type === 'shape')) && (
        <ShapeToolbar
          slideId={slideId}
          elementId={selectedElementId}
          currentProperties={selectedElementProperties}
          onPropertyChange={(properties) => {
            setSelectedElementProperties(prev => ({ ...prev, ...properties }));
            // Also update the Fabric.js object immediately for visual feedback
            if (fabricCanvasRef.current) {
              const activeObject = fabricCanvasRef.current.getActiveObject();
              if (activeObject && activeObject.data?.elementId === selectedElementId) {
                updateFabricObjectProperties(activeObject, properties);
                fabricCanvasRef.current.renderAll();
              }
            }
          }}
        />
      )}

      <div
        className="canvas-wrapper"
        role="img"
        aria-label={`Slide canvas: ${currentSlide?.title || 'Untitled slide'}`}
        aria-describedby="canvas-instructions"
      >
        <canvas
          ref={canvasRef}
          className="slide-canvas"
          tabIndex={0} // Make canvas focusable for keyboard events
          aria-label="Slide editing canvas"
          role="application"
        />

        {/* Screen reader instructions */}
        <div id="canvas-instructions" className="sr-only">
          Use Ctrl+T to add text, Delete to remove selected elements,
          Enter to edit text, Escape to exit editing mode,
          Arrow keys to move selected elements.
        </div>
      </div>
      <div className="canvas-info" role="status" aria-live="polite">
        <p>Hold Alt + drag to pan • Mouse wheel to zoom • Delete key to remove selected object • Double-click text to edit • Drag images directly onto canvas</p>
      </div>

      {/* Image Import Dialog */}
      <ImageImportDialog
        isOpen={showImageImportDialog}
        onClose={() => setShowImageImportDialog(false)}
        onImport={handleImageImport}
      />
    </div>
  );
};

export default SlideCanvas;