import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import SlideNavigation from './SlideNavigation';
import presentationReducer from '../store/slices/presentationSlice';
import { 
  Presentation, 
  createDefaultSlideLayout, 
  createDefaultBackground,
  createDefaultTheme,
  createDefaultPresentationMetadata,
  createDefaultPresentationSettings
} from '../types/presentation';

const createTestStore = (initialPresentation?: Presentation) => {
  return configureStore({
    reducer: {
      presentation: presentationReducer,
    },
    preloadedState: {
      presentation: {
        currentPresentation: initialPresentation || {
          id: 'test-presentation',
          title: 'Test Presentation',
          slides: [
            {
              id: 'slide-1',
              title: 'Slide 1',
              elements: [],
              connections: [],
              layout: createDefaultSlideLayout(),
              background: createDefaultBackground(),
              notes: '',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: 'slide-2',
              title: 'Slide 2',
              elements: [],
              connections: [],
              layout: createDefaultSlideLayout(),
              background: createDefaultBackground(),
              notes: '',
              createdAt: new Date(),
              updatedAt: new Date(),
            }
          ],
          theme: createDefaultTheme(),
          metadata: createDefaultPresentationMetadata(),
          settings: createDefaultPresentationSettings(),
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0.0',
        },
        presentations: [],
        currentSlideId: 'slide-1',
        isModified: false,
        lastSaved: null,
      }
    }
  });
};

const renderWithProvider = (store = createTestStore()) => {
  return render(
    <Provider store={store}>
      <SlideNavigation />
    </Provider>
  );
};

describe('SlideNavigation', () => {
  test('renders slide navigation with slides', () => {
    renderWithProvider();
    
    expect(screen.getByText('Slides')).toBeInTheDocument();
    expect(screen.getAllByText('Slide 1')).toHaveLength(2); // Preview and title
    expect(screen.getAllByText('Slide 2')).toHaveLength(2); // Preview and title
    expect(screen.getByTitle('Add new slide')).toBeInTheDocument();
  });

  test('adds new slide when add button is clicked', () => {
    const store = createTestStore();
    renderWithProvider(store);
    
    const addButton = screen.getByTitle('Add new slide');
    fireEvent.click(addButton);
    
    const state = store.getState();
    expect(state.presentation.currentPresentation?.slides).toHaveLength(3);
  });

  test('selects slide when clicked', () => {
    const store = createTestStore();
    renderWithProvider(store);
    
    const slideThumbnails = screen.getAllByRole('generic').filter(el => 
      el.classList.contains('slide-thumbnail')
    );
    fireEvent.click(slideThumbnails[1]); // Click second slide
    
    const state = store.getState();
    expect(state.presentation.currentSlideId).toBe('slide-2');
  });

  test('deletes slide when delete button is clicked', () => {
    const store = createTestStore();
    renderWithProvider(store);
    
    // Find delete buttons
    const deleteButtons = screen.getAllByTitle('Delete slide');
    expect(deleteButtons).toHaveLength(2); // Both slides should have delete buttons
    
    fireEvent.click(deleteButtons[1]); // Click delete on second slide
    
    const state = store.getState();
    expect(state.presentation.currentPresentation?.slides).toHaveLength(1);
    expect(state.presentation.currentPresentation?.slides[0].id).toBe('slide-1');
  });

  test('does not show delete button when only one slide exists', () => {
    const singleSlidePresentation: Presentation = {
      id: 'test-presentation',
      title: 'Test Presentation',
      slides: [
        {
          id: 'slide-1',
          title: 'Slide 1',
          elements: [],
          connections: [],
          layout: createDefaultSlideLayout(),
          background: createDefaultBackground(),
          notes: '',
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ],
      theme: createDefaultTheme(),
      metadata: createDefaultPresentationMetadata(),
      settings: createDefaultPresentationSettings(),
      createdAt: new Date(),
      updatedAt: new Date(),
      version: '1.0.0',
    };
    
    const store = createTestStore(singleSlidePresentation);
    renderWithProvider(store);
    
    expect(screen.queryByTitle('Delete slide')).not.toBeInTheDocument();
  });

  test('highlights selected slide', () => {
    renderWithProvider();
    
    const slideThumbnails = screen.getAllByRole('generic').filter(el => 
      el.classList.contains('slide-thumbnail')
    );
    
    expect(slideThumbnails[0]).toHaveClass('selected');
    expect(slideThumbnails[1]).not.toHaveClass('selected');
  });

  test('handles drag and drop functionality', () => {
    const store = createTestStore();
    renderWithProvider(store);
    
    const slideThumbnails = screen.getAllByRole('generic').filter(el => 
      el.classList.contains('slide-thumbnail')
    );
    
    expect(slideThumbnails[0]).toBeInTheDocument();
    expect(slideThumbnails[1]).toBeInTheDocument();
    
    // Simulate drag start
    fireEvent.dragStart(slideThumbnails[0], { dataTransfer: { effectAllowed: 'move', setData: jest.fn() } });
    
    // Simulate drag over
    fireEvent.dragOver(slideThumbnails[1], { dataTransfer: { dropEffect: 'move' } });
    
    // Simulate drop
    fireEvent.drop(slideThumbnails[1]);
    
    const state = store.getState();
    expect(state.presentation.currentPresentation?.slides[0].id).toBe('slide-2');
    expect(state.presentation.currentPresentation?.slides[1].id).toBe('slide-1');
  });

  test('renders nothing when no presentation exists', () => {
    const store = configureStore({
      reducer: {
        presentation: presentationReducer,
      },
      preloadedState: {
        presentation: {
          currentPresentation: null,
          presentations: [],
          currentSlideId: null,
          isModified: false,
          lastSaved: null,
        }
      }
    });
    
    const { container } = render(
      <Provider store={store}>
        <SlideNavigation />
      </Provider>
    );
    
    expect(container.firstChild).toBeNull();
  });
});