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
  const dispatch = useDispatch();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<{ x: number; y: number } | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isTextEditing, setIsTextEditing] = useState(false);
  const [selectedElementProperties, setSelectedElementProperties] = useState<ElementProperties>({});
  const [isDraggingText, setIsDraggingText] = useState(false);
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

  // Add text element at specific position
  const addTextElementAtPosition = useCallback((x: number, y: number, autoEdit: boolean = true) => {
    if (!fabricCanvasRef.current) return;

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
      content: 'Type your text here',
    };

    dispatch(addElement({ slideId, element: newElement }));

    // Auto-select and enter editing mode for new text elements
    if (autoEdit) {
      setTimeout(() => {
        if (fabricCanvasRef.current) {
          const objects = fabricCanvasRef.current.getObjects();
          const newTextObject = objects[objects.length - 1]; // Get the last added object
          if (newTextObject && newTextObject.type === 'textbox') {
            fabricCanvasRef.current.setActiveObject(newTextObject);
            const textbox = newTextObject as fabric.Textbox;
            
            // Add visual feedback for new text element
            textbox.set({
              borderColor: '#10b981',
              borderDashArray: [5, 5],
              cornerColor: '#10b981',
              cornerSize: 8,
            });
            
            textbox.enterEditing();
            textbox.selectAll();
            setIsTextEditing(true);
            fabricCanvasRef.current.renderAll();
            
            // Remove the special styling after editing
            setTimeout(() => {
              textbox.set({
                borderColor: 'rgba(178,204,255,1)',
                borderDashArray: undefined,
                cornerColor: 'rgba(178,204,255,1)',
                cornerSize: 6,
              });
              fabricCanvasRef.current?.renderAll();
            }, 2000);
          }
        }
      }, 100); // Small delay to ensure the object is rendered
    }
  }, [dispatch, slideId]);

  // Handle keyboard events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!fabricCanvasRef.current) return;
    
    // Don't handle keyboard events when in text editing mode
    if (isTextEditing) return;
    
    const activeObject = fabricCanvasRef.current.getActiveObject();
    
    // Delete selected element
    if (event.key === 'Delete' || event.key === 'Backspace') {
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

  // Setup canvas event handlers
  const setupCanvasEventHandlers = useCallback((canvas: fabric.Canvas) => {
    // Object selection events
    canvas.on('selection:created', (e) => {
      const selectedObject = e.selected?.[0];
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
      setSelectedElementId(null);
      setSelectedElementProperties({});
      setIsTextEditing(false);
    });

    // Double-click to enter text editing mode
    canvas.on('mouse:dblclick', (e) => {
      const target = e.target;
      if (target && target.type === 'textbox' && target.data?.elementId) {
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

    // Text editing events
    canvas.on('text:editing:entered', (e) => {
      setIsTextEditing(true);
      const target = e.target;
      if (target) {
        // Visual feedback for editing mode
        target.set({
          borderColor: '#3b82f6',
          borderDashArray: [5, 5],
        });
        canvas.renderAll();
      }
    });

    canvas.on('text:editing:exited', (e) => {
      const target = e.target;
      if (target && target.data?.elementId) {
        const textbox = target as fabric.Textbox;
        // Update text content in Redux store
        dispatch(updateElement({
          slideId,
          elementId: target.data.elementId,
          updates: { content: textbox.text }
        }));
        
        // Remove editing visual feedback
        target.set({
          borderColor: 'rgba(178,204,255,1)',
          borderDashArray: undefined,
        });
        canvas.renderAll();
      }
      setIsTextEditing(false);
    });

    canvas.on('text:changed', (e) => {
      const target = e.target;
      if (target && target.data?.elementId) {
        const textbox = target as fabric.Textbox;
        // Update text content in real-time
        dispatch(updateElement({
          slideId,
          elementId: target.data.elementId,
          updates: { content: textbox.text }
        }));
      }
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
  }, [dispatch, slideId, isPanning, lastPanPoint, currentSlide?.elements]);

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

  // Add keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

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

  // Create Fabric.js object from slide element
  const createFabricObjectFromElement = (element: SlideElement, canvas: fabric.Canvas) => {
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
    const dropPosition = dragDropService.getDropPosition(e, canvasRef.current);
    
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
          addTextElementAtPosition(snappedResult.position.x, snappedResult.position.y, true);
          break;
        case 'image':
          setShowImageImportDialog(true);
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
  }, [addTextElementAtPosition, currentSlide?.elements]);

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

  // Handle drag start for text element
  const handleTextDragStart = (e: React.DragEvent) => {
    handleToolbarDragStart(e, 'text');
  };

  // Handle drag start for image element
  const handleImageDragStart = (e: React.DragEvent) => {
    handleToolbarDragStart(e, 'image');
  };

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
    const dropPosition = dragDropService.getDropPosition(e, canvasRef.current);
    
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
          addTextElementAtPosition(snappedResult.position.x, snappedResult.position.y, true);
          break;
        case 'image':
          setShowImageImportDialog(true);
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
  }, [addTextElementAtPosition, currentSlide?.elements]);

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
    const dropPosition = dragDropService.getDropPosition(e, canvasRef.current);
    
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
          addTextElementAtPosition(snappedResult.position.x, snappedResult.position.y, true);
          break;
        case 'image':
          setShowImageImportDialog(true);
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
  }, [addTextElementAtPosition, currentSlide?.elements]);

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
    const dropPosition = dragDropService.getDropPosition(e, canvasRef.current);
    
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
          addTextElementAtPosition(snappedResult.position.x, snappedResult.position.y, true);
          break;
        case 'image':
          setShowImageImportDialog(true);
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
  }, [addTextElementAtPosition, currentSlide?.elements]);

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

  // Handle drag start for text element
  const handleTextDragStart = (e: React.DragEvent) => {
    handleToolbarDragStart(e, 'text');
  };

  // Handle drag start for image element
  const handleImageDragStart = (e: React.DragEvent) => {
    handleToolbarDragStart(e, 'image');ag image
    const dragImage = document.createElement('div');
    dragImage.innerHTML = '📝 Text Box';
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    dragImage.style.padding = '8px 12px';
    dragImage.style.backgroundColor = '#3b82f6';
    dragImage.style.color = 'white';
    dragImage.style.borderRadius = '6px';
    dragImage.style.fontSize = '14px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 50, 20);
    
    // Clean up drag image after a short delay
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);
  };

  // Enhanced drag-and-drop handlers (replaced with comprehensive implementation above)

  // Add text element (fallback for button click)
  const addTextElement = () => {
    addTextElementAtPosition(100, 100);
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
          draggable
          onDragStart={handleTextDragStart}
          onClick={addTextElement} 
          className={`toolbar-button draggable-button ${isDraggingText ? 'dragging' : ''}`}
          title="Drag to canvas or click to add text"
        >
          📝 Text
        </button>
        
        <button 
          draggable
          onDragStart={handleImageDragStart}
          onClick={() => setShowImageImportDialog(true)} 
          className="toolbar-button draggable-button"
          title="Drag to canvas or click to add image"
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
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <canvas
          ref={canvasRef}
          className="slide-canvas"
          tabIndex={0} // Make canvas focusable for keyboard events
        />
      </div>
      <div className="canvas-info">
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