import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { addSlide, deleteSlide, selectSlide, reorderSlides } from '../store/slices/presentationSlice';
import { lazyLoadingService } from '../services/lazyLoadingService';
import './SlideNavigation.css';

interface DragState {
  isDragging: boolean;
  draggedIndex: number | null;
  dragOverIndex: number | null;
}

const SlideNavigation: React.FC = () => {
  const dispatch = useDispatch();
  const presentation = useSelector((state: RootState) => state.presentation.currentPresentation);
  const currentSlideId = useSelector((state: RootState) => state.presentation.currentSlideId);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedIndex: null,
    dragOverIndex: null
  });
  const [thumbnails, setThumbnails] = useState<Map<string, string>>(new Map());
  const thumbnailRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Preload thumbnails when slides change
  useEffect(() => {
    if (!presentation) return;

    const currentIndex = presentation.slides.findIndex(slide => slide.id === currentSlideId);
    if (currentIndex !== -1) {
      lazyLoadingService.preloadThumbnails(presentation.slides, currentIndex);
    }
  }, [presentation, currentSlideId]);

  // Load thumbnail for a specific slide
  const loadThumbnail = async (slide: any, index: number) => {
    if (thumbnails.has(slide.id)) return;

    try {
      const thumbnailUrl = await lazyLoadingService.loadThumbnail(slide, Math.abs(index - (presentation?.slides.findIndex(s => s.id === currentSlideId) || 0)));
      if (thumbnailUrl) {
        setThumbnails(prev => new Map(prev).set(slide.id, thumbnailUrl));
      }
    } catch (error) {
      console.error('Failed to load thumbnail for slide:', slide.id, error);
    }
  };

  // Setup intersection observer for lazy loading
  useEffect(() => {
    if (!presentation) return;

    presentation.slides.forEach((slide, index) => {
      const element = thumbnailRefs.current.get(slide.id);
      if (element) {
        lazyLoadingService.observeElement(element, slide.id, 'thumbnail');
        
        // Load thumbnail when element comes into view
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                loadThumbnail(slide, index);
                observer.unobserve(entry.target);
              }
            });
          },
          { threshold: 0.1 }
        );
        
        observer.observe(element);
      }
    });

    return () => {
      presentation.slides.forEach((slide) => {
        lazyLoadingService.unobserveElement(slide.id, 'thumbnail');
      });
    };
  }, [presentation?.slides]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      lazyLoadingService.cleanup();
    };
  }, []);

  const handleAddSlide = () => {
    dispatch(addSlide({}));
  };

  const handleDeleteSlide = (slideId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    dispatch(deleteSlide(slideId));
  };

  const handleSelectSlide = (slideId: string) => {
    dispatch(selectSlide(slideId));
  };

  const handleDragStart = (event: React.DragEvent, index: number) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/html', '');
    setDragState({
      isDragging: true,
      draggedIndex: index,
      dragOverIndex: null
    });
  };

  const handleDragOver = (event: React.DragEvent, index: number) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragState(prev => ({
      ...prev,
      dragOverIndex: index
    }));
  };

  const handleDragLeave = () => {
    setDragState(prev => ({
      ...prev,
      dragOverIndex: null
    }));
  };

  const handleDrop = (event: React.DragEvent, toIndex: number) => {
    event.preventDefault();
    
    if (dragState.draggedIndex !== null && dragState.draggedIndex !== toIndex) {
      dispatch(reorderSlides({
        fromIndex: dragState.draggedIndex,
        toIndex: toIndex
      }));
    }
    
    setDragState({
      isDragging: false,
      draggedIndex: null,
      dragOverIndex: null
    });
  };

  const handleDragEnd = () => {
    setDragState({
      isDragging: false,
      draggedIndex: null,
      dragOverIndex: null
    });
  };

  if (!presentation) {
    return null;
  }

  return (
    <nav className="slide-navigation" role="navigation" aria-label="Slide navigation">
      <div className="slide-navigation-header">
        <h3 id="slides-heading">Slides</h3>
        <button 
          className="add-slide-btn"
          onClick={handleAddSlide}
          title="Add new slide"
          aria-label="Add new slide"
          type="button"
        >
          +
        </button>
      </div>
      
      <div 
        className="slide-list" 
        role="list" 
        aria-labelledby="slides-heading"
        aria-live="polite"
      >
        {presentation.slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`slide-thumbnail ${
              slide.id === currentSlideId ? 'selected' : ''
            } ${
              dragState.draggedIndex === index ? 'dragging' : ''
            } ${
              dragState.dragOverIndex === index ? 'drag-over' : ''
            }`}
            role="listitem"
            tabIndex={0}
            draggable
            onClick={() => handleSelectSlide(slide.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelectSlide(slide.id);
              }
            }}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            aria-label={`Slide ${index + 1}: ${slide.title}${slide.id === currentSlideId ? ' (current)' : ''}`}
            aria-selected={slide.id === currentSlideId}
            aria-describedby={`slide-${slide.id}-desc`}
          >
            <div className="slide-number">{index + 1}</div>
            <div 
              className="slide-preview"
              ref={(el) => {
                if (el) {
                  thumbnailRefs.current.set(slide.id, el);
                } else {
                  thumbnailRefs.current.delete(slide.id);
                }
              }}
            >
              {thumbnails.has(slide.id) ? (
                <img 
                  src={thumbnails.get(slide.id)} 
                  alt={`Slide ${index + 1} thumbnail`}
                  className="slide-thumbnail-image"
                />
              ) : (
                <div className="slide-content">
                  {slide.title}
                </div>
              )}
            </div>
            <div className="slide-title" id={`slide-${slide.id}-desc`}>
              {slide.title}
            </div>
            {presentation.slides.length > 1 && (
              <button
                className="delete-slide-btn"
                onClick={(e) => handleDeleteSlide(slide.id, e)}
                title={`Delete slide ${index + 1}: ${slide.title}`}
                aria-label={`Delete slide ${index + 1}: ${slide.title}`}
                type="button"
                tabIndex={-1}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </nav>
  );
};

export default SlideNavigation;