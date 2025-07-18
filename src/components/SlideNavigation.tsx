import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { addSlide, deleteSlide, selectSlide, reorderSlides } from '../store/slices/presentationSlice';
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

  if (!presentation) return null;

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

  return (
    <div className="slide-navigation">
      <div className="slide-navigation-header">
        <h3>Slides</h3>
        <button 
          className="add-slide-btn"
          onClick={handleAddSlide}
          title="Add new slide"
        >
          +
        </button>
      </div>
      
      <div className="slide-list">
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
            draggable
            onClick={() => handleSelectSlide(slide.id)}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
          >
            <div className="slide-number">{index + 1}</div>
            <div className="slide-preview">
              <div className="slide-content">
                {slide.title}
              </div>
            </div>
            <div className="slide-title">{slide.title}</div>
            {presentation.slides.length > 1 && (
              <button
                className="delete-slide-btn"
                onClick={(e) => handleDeleteSlide(slide.id, e)}
                title="Delete slide"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SlideNavigation;