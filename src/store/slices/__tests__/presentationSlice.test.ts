import presentationReducer, {
  createPresentation,
  addSlide,
  deleteSlide,
  selectSlide,
  reorderSlides,
  updateSlideTitle,
  addElement,
  updateElement,
  deleteElement,
  moveElement,
  resizeElement,
  duplicateSlide,
  markAsSaved,
} from '../presentationSlice';
import { SlideElement } from '../../types/presentation';

describe('presentationSlice', () => {
  const initialState = {
    currentPresentation: null,
    presentations: [],
    currentSlideId: null,
    isModified: false,
    lastSaved: null,
  };

  describe('createPresentation', () => {
    it('should create a new presentation with default values', () => {
      const action = createPresentation({});
      const state = presentationReducer(initialState, action);
      
      expect(state.currentPresentation).toBeDefined();
      expect(state.currentPresentation?.title).toBe('New Presentation');
      expect(state.currentPresentation?.slides).toHaveLength(1);
      expect(state.currentSlideId).toBe(state.currentPresentation?.slides[0].id);
      expect(state.isModified).toBe(false);
    });

    it('should create a presentation with custom title', () => {
      const action = createPresentation({ title: 'Custom Title' });
      const state = presentationReducer(initialState, action);
      
      expect(state.currentPresentation?.title).toBe('Custom Title');
      expect(state.currentPresentation?.metadata.title).toBe('Custom Title');
    });
  });

  describe('slide operations', () => {
    let stateWithPresentation: any;

    beforeEach(() => {
      const action = createPresentation({});
      stateWithPresentation = presentationReducer(initialState, action);
    });

    describe('addSlide', () => {
      it('should add a new slide to the presentation', () => {
        const action = addSlide({});
        const state = presentationReducer(stateWithPresentation, action);
        
        expect(state.currentPresentation?.slides).toHaveLength(2);
        expect(state.isModified).toBe(true);
        
        const newSlide = state.currentPresentation?.slides[1];
        expect(newSlide?.title).toBe('Slide 2');
        expect(state.currentSlideId).toBe(newSlide?.id);
      });

      it('should insert slide after specified slide', () => {
        const firstSlideId = stateWithPresentation.currentPresentation.slides[0].id;
        
        // Add second slide
        let state = presentationReducer(stateWithPresentation, addSlide({}));
        
        // Add third slide after first slide
        const action = addSlide({ insertAfter: firstSlideId });
        state = presentationReducer(state, action);
        
        expect(state.currentPresentation?.slides).toHaveLength(3);
        expect(state.currentPresentation?.slides[1].title).toBe('Slide 3');
      });
    });

    describe('deleteSlide', () => {
      it('should not delete the only slide', () => {
        const slideId = stateWithPresentation.currentPresentation.slides[0].id;
        const action = deleteSlide(slideId);
        const state = presentationReducer(stateWithPresentation, action);
        
        expect(state.currentPresentation?.slides).toHaveLength(1);
        expect(state.isModified).toBe(false);
      });

      it('should delete slide when multiple slides exist', () => {
        // Add second slide
        let state = presentationReducer(stateWithPresentation, addSlide({}));
        const slideToDelete = state.currentPresentation?.slides[1].id;
        
        // Delete the second slide
        const action = deleteSlide(slideToDelete!);
        state = presentationReducer(state, action);
        
        expect(state.currentPresentation?.slides).toHaveLength(1);
        expect(state.isModified).toBe(true);
      });

      it('should update current slide when deleting selected slide', () => {
        // Add second slide
        let state = presentationReducer(stateWithPresentation, addSlide({}));
        const firstSlideId = state.currentPresentation?.slides[0].id;
        const secondSlideId = state.currentPresentation?.slides[1].id;
        
        // Current slide should be the second one
        expect(state.currentSlideId).toBe(secondSlideId);
        
        // Delete the current (second) slide
        const action = deleteSlide(secondSlideId!);
        state = presentationReducer(state, action);
        
        // Current slide should now be the first one
        expect(state.currentSlideId).toBe(firstSlideId);
      });
    });

    describe('selectSlide', () => {
      it('should select an existing slide', () => {
        const slideId = stateWithPresentation.currentPresentation.slides[0].id;
        const action = selectSlide(slideId);
        const state = presentationReducer(stateWithPresentation, action);
        
        expect(state.currentSlideId).toBe(slideId);
      });

      it('should not select non-existent slide', () => {
        const action = selectSlide('non-existent-id');
        const state = presentationReducer(stateWithPresentation, action);
        
        expect(state.currentSlideId).toBe(stateWithPresentation.currentSlideId);
      });
    });

    describe('reorderSlides', () => {
      beforeEach(() => {
        // Add more slides for reordering tests
        stateWithPresentation = presentationReducer(stateWithPresentation, addSlide({}));
        stateWithPresentation = presentationReducer(stateWithPresentation, addSlide({}));
      });

      it('should reorder slides correctly', () => {
        const originalOrder = stateWithPresentation.currentPresentation.slides.map((s: any) => s.id);
        
        const action = reorderSlides({ fromIndex: 0, toIndex: 2 });
        const state = presentationReducer(stateWithPresentation, action);
        
        const newOrder = state.currentPresentation?.slides.map(s => s.id);
        expect(newOrder).toEqual([originalOrder[1], originalOrder[2], originalOrder[0]]);
        expect(state.isModified).toBe(true);
      });

      it('should not reorder with invalid indices', () => {
        const originalOrder = stateWithPresentation.currentPresentation.slides.map((s: any) => s.id);
        
        const action = reorderSlides({ fromIndex: -1, toIndex: 2 });
        const state = presentationReducer(stateWithPresentation, action);
        
        const newOrder = state.currentPresentation?.slides.map(s => s.id);
        expect(newOrder).toEqual(originalOrder);
      });
    });

    describe('updateSlideTitle', () => {
      it('should update slide title', () => {
        const slideId = stateWithPresentation.currentPresentation.slides[0].id;
        const action = updateSlideTitle({ slideId, title: 'Updated Title' });
        const state = presentationReducer(stateWithPresentation, action);
        
        const slide = state.currentPresentation?.slides.find(s => s.id === slideId);
        expect(slide?.title).toBe('Updated Title');
        expect(state.isModified).toBe(true);
      });
    });

    describe('duplicateSlide', () => {
      it('should duplicate a slide', () => {
        const slideId = stateWithPresentation.currentPresentation.slides[0].id;
        const action = duplicateSlide(slideId);
        const state = presentationReducer(stateWithPresentation, action);
        
        expect(state.currentPresentation?.slides).toHaveLength(2);
        
        const originalSlide = state.currentPresentation?.slides[0];
        const duplicatedSlide = state.currentPresentation?.slides[1];
        
        expect(duplicatedSlide?.title).toBe(`${originalSlide?.title} (Copy)`);
        expect(duplicatedSlide?.id).not.toBe(originalSlide?.id);
        expect(state.currentSlideId).toBe(duplicatedSlide?.id);
        expect(state.isModified).toBe(true);
      });
    });
  });

  describe('element operations', () => {
    let stateWithSlide: any;
    let slideId: string;

    beforeEach(() => {
      const action = createPresentation({});
      stateWithSlide = presentationReducer(initialState, action);
      slideId = stateWithSlide.currentPresentation.slides[0].id;
    });

    describe('addElement', () => {
      it('should add an element to a slide', () => {
        const element: Omit<SlideElement, 'id' | 'createdAt' | 'updatedAt'> = {
          type: 'text',
          position: { x: 100, y: 100 },
          size: { width: 200, height: 50 },
          properties: { fontSize: 16 },
          content: 'Test text',
        };
        
        const action = addElement({ slideId, element });
        const state = presentationReducer(stateWithSlide, action);
        
        const slide = state.currentPresentation?.slides.find(s => s.id === slideId);
        expect(slide?.elements).toHaveLength(1);
        expect(slide?.elements[0].type).toBe('text');
        expect(slide?.elements[0].content).toBe('Test text');
        expect(slide?.elements[0].id).toBeDefined();
        expect(state.isModified).toBe(true);
      });
    });

    describe('updateElement', () => {
      let elementId: string;

      beforeEach(() => {
        const element: Omit<SlideElement, 'id' | 'createdAt' | 'updatedAt'> = {
          type: 'text',
          position: { x: 100, y: 100 },
          size: { width: 200, height: 50 },
          properties: { fontSize: 16 },
          content: 'Test text',
        };
        
        stateWithSlide = presentationReducer(stateWithSlide, addElement({ slideId, element }));
        elementId = stateWithSlide.currentPresentation.slides[0].elements[0].id;
      });

      it('should update element properties', () => {
        const action = updateElement({
          slideId,
          elementId,
          updates: { content: 'Updated text' },
        });
        const state = presentationReducer(stateWithSlide, action);
        
        const slide = state.currentPresentation?.slides.find(s => s.id === slideId);
        const element = slide?.elements.find(e => e.id === elementId);
        expect(element?.content).toBe('Updated text');
        expect(state.isModified).toBe(true);
      });
    });

    describe('deleteElement', () => {
      let elementId: string;

      beforeEach(() => {
        const element: Omit<SlideElement, 'id' | 'createdAt' | 'updatedAt'> = {
          type: 'text',
          position: { x: 100, y: 100 },
          size: { width: 200, height: 50 },
          properties: { fontSize: 16 },
          content: 'Test text',
        };
        
        stateWithSlide = presentationReducer(stateWithSlide, addElement({ slideId, element }));
        elementId = stateWithSlide.currentPresentation.slides[0].elements[0].id;
      });

      it('should delete an element', () => {
        const action = deleteElement({ slideId, elementId });
        const state = presentationReducer(stateWithSlide, action);
        
        const slide = state.currentPresentation?.slides.find(s => s.id === slideId);
        expect(slide?.elements).toHaveLength(0);
        expect(state.isModified).toBe(true);
      });
    });

    describe('moveElement', () => {
      let elementId: string;

      beforeEach(() => {
        const element: Omit<SlideElement, 'id' | 'createdAt' | 'updatedAt'> = {
          type: 'text',
          position: { x: 100, y: 100 },
          size: { width: 200, height: 50 },
          properties: { fontSize: 16 },
          content: 'Test text',
        };
        
        stateWithSlide = presentationReducer(stateWithSlide, addElement({ slideId, element }));
        elementId = stateWithSlide.currentPresentation.slides[0].elements[0].id;
      });

      it('should move an element', () => {
        const newPosition = { x: 200, y: 150 };
        const action = moveElement({ slideId, elementId, position: newPosition });
        const state = presentationReducer(stateWithSlide, action);
        
        const slide = state.currentPresentation?.slides.find(s => s.id === slideId);
        const element = slide?.elements.find(e => e.id === elementId);
        expect(element?.position).toEqual(newPosition);
        expect(state.isModified).toBe(true);
      });
    });

    describe('resizeElement', () => {
      let elementId: string;

      beforeEach(() => {
        const element: Omit<SlideElement, 'id' | 'createdAt' | 'updatedAt'> = {
          type: 'text',
          position: { x: 100, y: 100 },
          size: { width: 200, height: 50 },
          properties: { fontSize: 16 },
          content: 'Test text',
        };
        
        stateWithSlide = presentationReducer(stateWithSlide, addElement({ slideId, element }));
        elementId = stateWithSlide.currentPresentation.slides[0].elements[0].id;
      });

      it('should resize an element', () => {
        const newSize = { width: 300, height: 75 };
        const action = resizeElement({ slideId, elementId, size: newSize });
        const state = presentationReducer(stateWithSlide, action);
        
        const slide = state.currentPresentation?.slides.find(s => s.id === slideId);
        const element = slide?.elements.find(e => e.id === elementId);
        expect(element?.size).toEqual(newSize);
        expect(state.isModified).toBe(true);
      });
    });
  });

  describe('utility actions', () => {
    it('should mark presentation as saved', () => {
      let state = presentationReducer(initialState, createPresentation({}));
      state = presentationReducer(state, addSlide({})); // Make it modified
      
      expect(state.isModified).toBe(true);
      expect(state.lastSaved).toBeNull();
      
      state = presentationReducer(state, markAsSaved());
      
      expect(state.isModified).toBe(false);
      expect(state.lastSaved).toBeInstanceOf(Date);
    });
  });
});