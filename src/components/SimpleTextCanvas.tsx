import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { addElement, updateElement, moveElement, markAsModified } from '../store/slices/presentationSlice';
import { SlideElement, Position } from '../types/presentation';
import { latexGenerationService } from '../services/latexGenerationService';
import { previewService } from '../services/previewService';

interface SimpleTextCanvasProps {
  slideId: string;
  width?: number;
  height?: number;
}

const SimpleTextCanvas: React.FC<SimpleTextCanvasProps> = ({ 
  slideId, 
  width = 800, 
  height = 600 
}) => {
  console.log('🔥 [SimpleTextCanvas] ===== COMPONENT MOUNTING =====');
  console.log('🔥 [SimpleTextCanvas] Props:', { slideId, width, height });
  
  const dispatch = useDispatch();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  
  // Get current slide data from Redux store
  const presentation = useSelector((state: RootState) => state.presentation.currentPresentation);
  const currentSlide = presentation?.slides.find(slide => slide.id === slideId);
  
  console.log('🔥 [SimpleTextCanvas] Redux state:', {
    hasPresentation: !!presentation,
    hasCurrentSlide: !!currentSlide,
    slideElementsCount: currentSlide?.elements?.length || 0
  });

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
        width,
        height,
        backgroundColor: '#ffffff',
        selection: true,
        preserveObjectStacking: true,
      });

      console.log('✅ [SimpleTextCanvas] Fabric canvas created successfully');
      fabricCanvasRef.current = canvas;
      setIsCanvasReady(true);

      // Add basic event handlers
      canvas.on('selection:created', (e) => {
        const selectedObject = e.selected?.[0];
        console.log('🎯 [SimpleTextCanvas] Object selected:', selectedObject?.type);
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
          console.log('🔄 [SimpleTextCanvas] Updating Redux with new text (will trigger LaTeX after delay):', {
            elementId: target.data.elementId,
            oldContent: 'unknown',
            newContent: textbox.text,
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
          
          console.log('✅ [SimpleTextCanvas] Text updated in Redux store');
          console.log('🔥 [SimpleTextCanvas] LaTeX generation will be triggered');
        } else {
          console.error('❌ [SimpleTextCanvas] No elementId found for text editing exit');
        }
      });

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
          if (obj && obj.data?.elementId && obj.type === 'textbox') {
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

            // Schedule LaTeX generation - same as text:editing:exited
            latexGenerationService.scheduleGeneration(
              slideId,
              obj.data.elementId,
              textbox.text || ''
            );
            
            console.log('✅ [SimpleTextCanvas] Deselected object updated in Redux');
            console.log('🔥 [SimpleTextCanvas] LaTeX generation scheduled');
          }
        });

        // Clear the tracking array
        previouslySelectedObjects = [];
      });

      // Cleanup function
      return () => {
        console.log('🧹 [SimpleTextCanvas] Cleaning up canvas');
        canvas.dispose();
        fabricCanvasRef.current = null;
        setIsCanvasReady(false);
      };
    } catch (error) {
      console.error('❌ [SimpleTextCanvas] Error creating canvas:', error);
    }
  }, [width, height, dispatch, slideId]);

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
      }
    });

    canvas.renderAll();
    console.log('✅ [SimpleTextCanvas] All elements loaded');
  }, [isCanvasReady, currentSlide]);

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
      const textbox = new fabric.Textbox(element.content || 'Text', {
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
        editable: true,
        selectable: true,
        evented: true,
        // CRITICAL: Ensure movement events are properly fired
        moveCursor: 'move',
        hoverCursor: 'move',
        backgroundColor: 'rgba(255, 255, 0, 0.1)', // Light yellow background for visibility
        borderColor: '#ff0000', // Red border for visibility
        cornerColor: '#ff0000',
        cornerSize: 8,
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

    // Create new text element data
    const newElement: Omit<SlideElement, 'id' | 'createdAt' | 'updatedAt'> = {
      type: 'text',
      position: { x: 100, y: 100 },
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
      content: 'Click to edit text',
    };

    console.log('📝 [SimpleTextCanvas] Creating new text element:', newElement);
    
    try {
      dispatch(addElement({ slideId, element: newElement }));
      console.log('✅ [SimpleTextCanvas] Element dispatched to Redux');
    } catch (error) {
      console.error('❌ [SimpleTextCanvas] Error dispatching element:', error);
    }
  };

  // Debug preview function
  const debugPreview = () => {
    console.log('🔍 [SimpleTextCanvas] ===== DEBUG PREVIEW =====');
    console.log('🔍 [SimpleTextCanvas] Current slide data:', {
      slideId: currentSlide?.id,
      title: currentSlide?.title,
      elementsCount: currentSlide?.elements?.length || 0,
      elements: currentSlide?.elements?.map(el => ({
        id: el.id,
        type: el.type,
        content: el.content?.substring(0, 100) + (el.content && el.content.length > 100 ? '...' : ''),
        position: el.position,
        size: el.size
      }))
    });
    
    console.log('🔍 [SimpleTextCanvas] Full presentation data:', {
      presentationId: presentation?.id,
      title: presentation?.title,
      slidesCount: presentation?.slides?.length || 0,
      isModified: presentation ? 'unknown' : 'no presentation'
    });
    
    // Try to manually trigger LaTeX generation
    if (presentation && currentSlide) {
      try {
        // Import the LaTeX generator
        import('../services/latexGenerator').then(({ LaTeXGenerator }) => {
          const generator = new LaTeXGenerator();
          const latex = generator.generateSlide(currentSlide, presentation.theme);
          console.log('🔍 [SimpleTextCanvas] Generated LaTeX for current slide:');
          console.log('--- LaTeX START ---');
          console.log(latex);
          console.log('--- LaTeX END ---');
        }).catch(error => {
          console.error('❌ [SimpleTextCanvas] Error importing LaTeX generator:', error);
        });
      } catch (error) {
        console.error('❌ [SimpleTextCanvas] Error generating LaTeX:', error);
      }
    }
  };

  if (!currentSlide) {
    console.log('❌ [SimpleTextCanvas] No current slide found');
    return <div className="slide-canvas-error">Slide not found</div>;
  }

  console.log('🔥 [SimpleTextCanvas] ===== RENDERING COMPONENT =====');
  
  return (
    <div className="simple-text-canvas-container" style={{ border: '2px solid #000', padding: '10px' }}>
      <div className="canvas-toolbar" style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#f0f0f0' }}>
        <button 
          onClick={addTextElement} 
          className="toolbar-button"
          type="button"
          title="Add text via Redux"
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          📝
        </button>
      </div>
      <canvas 
        ref={canvasRef} 
        style={{ border: '1px solid #ccc' }}
      />
    </div>
  );
};

export default SimpleTextCanvas;