import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import {
  closeTemplateGallery,
  addCustomSlideTemplate,
  deleteCustomSlideTemplate,
} from '../store/slices/themeSlice';
import { addSlide } from '../store/slices/presentationSlice';
import { SlideTemplate, SlideElement } from '../types/presentation';
import './TemplateGallery.css';

interface TemplateGalleryProps {
  onTemplateSelect?: (template: SlideTemplate) => void;
}

const TemplateGallery: React.FC<TemplateGalleryProps> = ({ onTemplateSelect }) => {
  const dispatch = useDispatch();
  const {
    availableSlideTemplates,
    isTemplateGalleryOpen,
  } = useSelector((state: RootState) => state.theme);
  
  const currentPresentation = useSelector((state: RootState) => state.presentation.currentPresentation);
  const currentSlideId = useSelector((state: RootState) => state.presentation.currentSlideId);
  
  const [selectedTemplate, setSelectedTemplate] = useState<SlideTemplate | null>(null);
  const [showCustomTemplateForm, setShowCustomTemplateForm] = useState(false);

  if (!isTemplateGalleryOpen) return null;

  const handleTemplateSelect = (template: SlideTemplate) => {
    if (currentPresentation) {
      // Add a new slide with the selected template
      dispatch(addSlide({ 
        template: template.id,
        insertAfter: currentSlideId || undefined 
      }));
      
      // Apply template elements to the new slide
      if (template.defaultElements && template.defaultElements.length > 0) {
        // This would need to be implemented in the presentation slice
        // For now, we'll just add the slide with the template layout
      }
      
      if (onTemplateSelect) {
        onTemplateSelect(template);
      }
    }
    dispatch(closeTemplateGallery());
  };

  const handleClose = () => {
    dispatch(closeTemplateGallery());
    setShowCustomTemplateForm(false);
    setSelectedTemplate(null);
  };

  const handleDeleteCustomTemplate = (templateId: string) => {
    if (window.confirm('Are you sure you want to delete this custom template?')) {
      dispatch(deleteCustomSlideTemplate(templateId));
    }
  };

  const renderTemplatePreview = (template: SlideTemplate) => {
    return (
      <div className="template-preview">
        <div className="template-preview-slide">
          {template.layout.regions.title && (
            <div
              className="template-region template-title"
              style={{
                left: `${(template.layout.regions.title.x / 800) * 100}%`,
                top: `${(template.layout.regions.title.y / 600) * 100}%`,
                width: `${(template.layout.regions.title.width / 800) * 100}%`,
                height: `${(template.layout.regions.title.height / 600) * 100}%`,
              }}
            >
              Title
            </div>
          )}
          {template.layout.regions.content && (
            <div
              className="template-region template-content"
              style={{
                left: `${(template.layout.regions.content.x / 800) * 100}%`,
                top: `${(template.layout.regions.content.y / 600) * 100}%`,
                width: `${(template.layout.regions.content.width / 800) * 100}%`,
                height: `${(template.layout.regions.content.height / 600) * 100}%`,
              }}
            >
              Content
            </div>
          )}
          {template.layout.regions.leftColumn && (
            <div
              className="template-region template-column"
              style={{
                left: `${(template.layout.regions.leftColumn.x / 800) * 100}%`,
                top: `${(template.layout.regions.leftColumn.y / 600) * 100}%`,
                width: `${(template.layout.regions.leftColumn.width / 800) * 100}%`,
                height: `${(template.layout.regions.leftColumn.height / 600) * 100}%`,
              }}
            >
              Left
            </div>
          )}
          {template.layout.regions.rightColumn && (
            <div
              className="template-region template-column"
              style={{
                left: `${(template.layout.regions.rightColumn.x / 800) * 100}%`,
                top: `${(template.layout.regions.rightColumn.y / 600) * 100}%`,
                width: `${(template.layout.regions.rightColumn.width / 800) * 100}%`,
                height: `${(template.layout.regions.rightColumn.height / 600) * 100}%`,
              }}
            >
              Right
            </div>
          )}
          {template.layout.regions.footer && (
            <div
              className="template-region template-footer"
              style={{
                left: `${(template.layout.regions.footer.x / 800) * 100}%`,
                top: `${(template.layout.regions.footer.y / 600) * 100}%`,
                width: `${(template.layout.regions.footer.width / 800) * 100}%`,
                height: `${(template.layout.regions.footer.height / 600) * 100}%`,
              }}
            >
              Footer
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="template-gallery-overlay">
      <div className="template-gallery">
        <div className="template-gallery-header">
          <h2>Slide Templates</h2>
          <div className="template-gallery-actions">
            <button
              className="btn btn-secondary"
              onClick={() => setShowCustomTemplateForm(!showCustomTemplateForm)}
            >
              Create Custom Template
            </button>
            <button className="btn btn-close" onClick={handleClose}>
              ×
            </button>
          </div>
        </div>

        {showCustomTemplateForm && (
          <div className="custom-template-form">
            <h3>Create Custom Template</h3>
            <p>Custom template creation will be available in a future update.</p>
            <div className="form-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowCustomTemplateForm(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}

        <div className="template-grid">
          {availableSlideTemplates.map((template) => (
            <div
              key={template.id}
              className={`template-card ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
              onClick={() => setSelectedTemplate(template)}
            >
              {renderTemplatePreview(template)}

              <div className="template-info">
                <h3>{template.name}</h3>
                <p>{template.description}</p>
              </div>

              <div className="template-actions">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleTemplateSelect(template)}
                >
                  Use Template
                </button>
                {template.isCustom && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDeleteCustomTemplate(template.id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {selectedTemplate && (
          <div className="template-preview-panel">
            <h3>{selectedTemplate.name}</h3>
            <p>{selectedTemplate.description}</p>
            <div className="template-details">
              <h4>Layout: {selectedTemplate.layout.name}</h4>
              <div className="template-regions">
                {Object.entries(selectedTemplate.layout.regions).map(([regionName, region]) => (
                  <div key={regionName} className="region-info">
                    <span className="region-name">{regionName}</span>
                    <span className="region-size">
                      {region.width}×{region.height}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="template-preview-large">
              {renderTemplatePreview(selectedTemplate)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateGallery;