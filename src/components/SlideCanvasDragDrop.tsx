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
import { dragDropService } from '../services/dragDropService';
import { getImageInfo } from '../utils/imageUtils';

interface SlideCanvasDragDropProps {
  slideId: string;
  width?: number;
  height?: number;
}

export const SlideCanvasDragDrop: React.FC<SlideCanvasDragDropProps> = ({ 
  slideId, 
  width = 800, 
  height = 600 
}) => {
  const dispatch = useDispatch();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isDraggingText, setIsDraggingText] = useState(false);

  // Get current slide data from Redux store
  const presentation = useSelector((state: RootState) => state.presentation.currentPresentation);
  const currentSlide = presentation?.slides.find(slide => slide.id === slideId);

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
  }, [fabricCanvasRef.current, presentation?.settings]);

  // Enhanced drag-and-drop handlers
  const handleToolbarDragStart = useCallback((e: React.DragEvent, elementType: string) => {
    const target = e.target as HTMLElement;
    const preview = dragDropService.createDragPreview(target, elementType as any);
    document.body.appendChild(preview);
    
    dragDropService.startDrag('toolbar', { elementType }, preview);
    
    e.dataTransfer.setData('text/plain', elementType);
    e.dataTransfer.effectAllowed = 'copy';
    
    setIsDraggingText(elementType === 'text');
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    
    // Update drag preview position
    dragDropService.updateDragPreview(e.clientX, e.clientY);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    
    if (!fabricCanvasRef.current || !canvasRef.current) return;
    
    const dragState = dragDropService.getDragState();
    const dropPosition = dragDropService.getDropPosition(e.nativeEvent, canvasRef.current);
    
    // Handle different drop types
    if (dragState.dragType === 'toolbar') {
      const elementType = dragState.dragData.elementType;
      
      // Apply snap-to-grid and guides
      const snappedResult = dragDropService.findSnapPosition(
        dropPosition,
        { width: 200, height: 50 }, // Default size
        currentSlide?.elements || [],
        []
      );
      
      // Show snap guides briefly
      if (snappedResult.guides.length > 0) {
        dragDropService.showSnapGuides(snappedResult.guides);
        setTimeout(() => dragDropService.hideSnapGuides(), 1000);
      }
      
      // Create element based on type
      switch (elementType) {
        case 'text':
          addTextElementAtPosition(snappedResult.position.x, snappedResult.position.y);
          break;
        case 'image':
          // For demo purposes, create a placeholder image element
          addImageElementAtPosition(snappedResult.position.x, snappedResult.position.y);
          break;
        default:
          console.warn(`Unsupported toolbar element type: ${elementType}`);
      }
    } else if (dragState.dragType === 'file') {
      // Handle file drops
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        await handleFilesDrop(files, dropPosition);
      }
    }
    
    // Clean up drag state
    dragDropService.endDrag();
    setIsDraggingText(false);
    
    // Remove drag preview
    if (dragState.dragPreview && dragState.dragPreview.parentNode) {
      dragState.dragPreview.parentNode.removeChild(dragState.dragPreview);
    }
  }, [currentSlide?.elements]);

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

  // Enhanced object movement with snap-to-grid
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
    
    // Apply snapped position
    obj.set({
      left: snappedResult.position.x,
      top: snappedResult.position.y,
    });
    
    // Show snap guides
    dragDropService.showSnapGuides(snappedResult.guides);
    
    // Update Redux state
    dispatch(moveElement({
      slideId,
      elementId: obj.data.elementId,
      position: snappedResult.position,
    }));
  }, [dispatch, slideId, currentSlide]);

  const handleObjectMoved = useCallback((e: fabric.IEvent) => {
    // Hide snap guides after movement
    setTimeout(() => dragDropService.hideSnapGuides(), 500);
  }, []);

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

  // Helper functions to add elements
  const addTextElementAtPosition = useCallback((x: number, y: number) => {
    const newElement: Omit<SlideElement, 'id' | 'createdAt' | 'updatedAt'> = {
      type: 'text',
      position: { x, y },
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
      content: 'Type your text here',
    };

    dispatch(addElement({ slideId, element: newElement }));
  }, [dispatch, slideId]);

  const addImageElementAtPosition = useCallback((x: number, y: number) => {
    const newElement: Omit<SlideElement, 'id' | 'createdAt' | 'updatedAt'> = {
      type: 'image',
      position: { x, y },
      size: { width: 200, height: 150 },
      properties: {
        src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2Y0ZjRmNCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiPkltYWdlIFBsYWNlaG9sZGVyPC90ZXh0Pjwvc3ZnPg==',
        alt: 'Image placeholder',
        opacity: 1,
      },
      content: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2Y0ZjRmNCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiPkltYWdlIFBsYWNlaG9sZGVyPC90ZXh0Pjwvc3ZnPg==',
    };

    dispatch(addElement({ slideId, element: newElement }));
  }, [dispatch, slideId]);

  // Handle drag start for text element
  const handleTextDragStart = (e: React.DragEvent) => {
    handleToolbarDragStart(e, 'text');
  };

  // Handle drag start for image element
  const handleImageDragStart = (e: React.DragEvent) => {
    handleToolbarDragStart(e, 'image');
  };

  // Setup canvas event handlers
  const setupCanvasEventHandlers = useCallback((canvas: fabric.Canvas) => {
    // Object selection events
    canvas.on('selection:created', (e) => {
      const selectedObject = e.selected?.[0];
      if (selectedObject && selectedObject.data?.elementId) {
        setSelectedElementId(selectedObject.data.elementId);
      }
    });

    canvas.on('selection:cleared', () => {
      setSelectedElementId(null);
    });

    // Object modification events with enhanced drag-and-drop
    canvas.on('object:moving', handleObjectMoving);
    canvas.on('object:moved', handleObjectMoved);

    canvas.on('object:scaling', (e) => {
      const obj = e.target;
      if (obj && obj.data?.elementId) {
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
  }, [handleObjectMoving, handleObjectMoved, dispatch, slideId]);

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

    // Cleanup function
    return () => {
      canvas.dispose();
      fabricCanvasRef.current = null;
      setIsCanvasReady(false);
    };
  }, [width, height, setupCanvasEventHandlers]);

  // Create Fabric.js object from slide element
  const createFabricObjectFromElement = (element: SlideElement, canvas: fabric.Canvas) => {
    let fabricObject: fabric.Object | null = null;

    switch (element.type) {
      case 'text':
        fabricObject = new fabric.Textbox(element.content || 'Text', {
          left: element.position.x,
          top: element.position.y,
          width: element.size.width,
          height: element.size.height,
          fontSize: element.properties.fontSize || 16,
          fontFamily: element.properties.fontFamily || 'Arial',
          fill: element.properties.textColor ? 
            `rgba(${element.properties.textColor.r}, ${element.properties.textColor.g}, ${element.properties.textColor.b}, ${element.properties.textColor.a || 1})` : 
            '#000000',
        });
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
  };

  // Load slide elements into canvas
  useEffect(() => {
    if (!isCanvasReady || !fabricCanvasRef.current || !currentSlide) return;

    const canvas = fabricCanvasRef.current;
    
    // Clear existing objects
    canvas.clear();
    canvas.backgroundColor = '#ffffff';

    // Load elements from slide data
    currentSlide.elements.forEach((element) => {
      createFabricObjectFromElement(element, canvas);
    });

    canvas.renderAll();
  }, [isCanvasReady, currentSlide]);

  return (
    <div className="slide-canvas-container">
      <div className="canvas-toolbar">
        <button 
          draggable
          onDragStart={handleTextDragStart}
          onClick={() => addTextElementAtPosition(100, 100)} 
          className={`toolbar-button draggable-button ${isDraggingText ? 'dragging' : ''}`}
          title="Drag to canvas or click to add text"
        >
          📝 Text
        </button>
        
        <button 
          draggable
          onDragStart={handleImageDragStart}
          onClick={() => addImageElementAtPosition(100, 100)} 
          className="toolbar-button draggable-button"
          title="Drag to canvas or click to add image"
        >
          🖼️ Image
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
      </div>
      
      <div 
        className="canvas-wrapper"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <canvas
          ref={canvasRef}
          className="slide-canvas"
          tabIndex={0}
        />
      </div>
      
      <div className="canvas-info">
        Drag elements from toolbar to canvas • Drop image files directly • Use snap guides for alignment
      </div>
    </div>
  );
};

export default SlideCanvasDragDrop;