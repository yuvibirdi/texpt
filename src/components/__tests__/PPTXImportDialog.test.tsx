import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { PPTXImportDialog } from '../PPTXImportDialog';
import presentationSlice from '../../store/slices/presentationSlice';
import uiSlice from '../../store/slices/uiSlice';
import { pptxImportService } from '../../services/pptxImportService';

// Mock the import service
jest.mock('../../services/pptxImportService', () => ({
  pptxImportService: {
    constructor: jest.fn(),
    setProgressCallback: jest.fn(),
    importPPTX: jest.fn()
  },
  PPTXImportService: jest.fn().mockImplementation(() => ({
    setProgressCallback: jest.fn(),
    importPPTX: jest.fn()
  }))
}));

// Mock CSS import
jest.mock('../PPTXImportDialog.css', () => ({}));

const createMockStore = () => {
  return configureStore({
    reducer: {
      presentation: presentationSlice,
      ui: uiSlice
    }
  });
};

const renderWithProvider = (component: React.ReactElement) => {
  const store = createMockStore();
  return render(
    <Provider store={store}>
      {component}
    </Provider>
  );
};

describe('PPTXImportDialog', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should not render when closed', () => {
      renderWithProvider(
        <PPTXImportDialog isOpen={false} onClose={mockOnClose} />
      );

      expect(screen.queryByText('Import PowerPoint Presentation')).not.toBeInTheDocument();
    });

    it('should render when open', () => {
      renderWithProvider(
        <PPTXImportDialog isOpen={true} onClose={mockOnClose} />
      );

      expect(screen.getByText('Import PowerPoint Presentation')).toBeInTheDocument();
      expect(screen.getByText('Select PowerPoint File')).toBeInTheDocument();
      expect(screen.getByText('Import Options')).toBeInTheDocument();
    });

    it('should render file drop zone', () => {
      renderWithProvider(
        <PPTXImportDialog isOpen={true} onClose={mockOnClose} />
      );

      expect(screen.getByText('Drag and drop a PowerPoint file here')).toBeInTheDocument();
      expect(screen.getByText('Browse Files')).toBeInTheDocument();
    });

    it('should render import options', () => {
      renderWithProvider(
        <PPTXImportDialog isOpen={true} onClose={mockOnClose} />
      );

      expect(screen.getByLabelText('Preserve formatting')).toBeInTheDocument();
      expect(screen.getByLabelText('Import images')).toBeInTheDocument();
      expect(screen.getByLabelText('Import shapes')).toBeInTheDocument();
      expect(screen.getByLabelText('Import speaker notes')).toBeInTheDocument();
    });

    it('should render advanced options', () => {
      renderWithProvider(
        <PPTXImportDialog isOpen={true} onClose={mockOnClose} />
      );

      expect(screen.getByText('Image Quality:')).toBeInTheDocument();
      expect(screen.getByText('Max Image Size (MB):')).toBeInTheDocument();
    });

    it('should render action buttons', () => {
      renderWithProvider(
        <PPTXImportDialog isOpen={true} onClose={mockOnClose} />
      );

      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Import Presentation')).toBeInTheDocument();
    });
  });

  describe('file selection', () => {
    it('should handle file input change', () => {
      renderWithProvider(
        <PPTXImportDialog isOpen={true} onClose={mockOnClose} />
      );

      const fileInput = screen.getByRole('button', { name: 'Browse Files' });
      fireEvent.click(fileInput);

      // File input should be triggered (hidden input)
      const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(hiddenInput).toBeInTheDocument();
    });

    it('should display selected file information', async () => {
      renderWithProvider(
        <PPTXImportDialog isOpen={true} onClose={mockOnClose} />
      );

      const mockFile = new File(['test content'], 'test.pptx', { 
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
      });

      const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      // Mock file selection
      Object.defineProperty(hiddenInput, 'files', {
        value: [mockFile],
        writable: false,
      });

      fireEvent.change(hiddenInput);

      await waitFor(() => {
        expect(screen.getByText('test.pptx')).toBeInTheDocument();
        expect(screen.getByText(/0.00 MB/)).toBeInTheDocument();
      });
    });

    it('should handle file removal', async () => {
      renderWithProvider(
        <PPTXImportDialog isOpen={true} onClose={mockOnClose} />
      );

      const mockFile = new File(['test content'], 'test.pptx', { 
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
      });

      const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(hiddenInput, 'files', {
        value: [mockFile],
        writable: false,
      });

      fireEvent.change(hiddenInput);

      await waitFor(() => {
        expect(screen.getByText('test.pptx')).toBeInTheDocument();
      });

      const removeButton = screen.getByText('Remove');
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(screen.queryByText('test.pptx')).not.toBeInTheDocument();
        expect(screen.getByText('Drag and drop a PowerPoint file here')).toBeInTheDocument();
      });
    });
  });

  describe('drag and drop', () => {
    it('should handle drag over events', () => {
      renderWithProvider(
        <PPTXImportDialog isOpen={true} onClose={mockOnClose} />
      );

      const dropZone = screen.getByText('Drag and drop a PowerPoint file here').closest('.file-drop-zone');
      
      const dragOverEvent = new Event('dragover', { bubbles: true });
      Object.defineProperty(dragOverEvent, 'preventDefault', { value: jest.fn() });
      Object.defineProperty(dragOverEvent, 'stopPropagation', { value: jest.fn() });

      fireEvent(dropZone!, dragOverEvent);

      expect(dragOverEvent.preventDefault).toHaveBeenCalled();
      expect(dragOverEvent.stopPropagation).toHaveBeenCalled();
    });

    it('should handle file drop', async () => {
      renderWithProvider(
        <PPTXImportDialog isOpen={true} onClose={mockOnClose} />
      );

      const mockFile = new File(['test content'], 'dropped.pptx', { 
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
      });

      const dropZone = screen.getByText('Drag and drop a PowerPoint file here').closest('.file-drop-zone');
      
      const dropEvent = new Event('drop', { bubbles: true });
      Object.defineProperty(dropEvent, 'preventDefault', { value: jest.fn() });
      Object.defineProperty(dropEvent, 'stopPropagation', { value: jest.fn() });
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          files: [mockFile]
        }
      });

      fireEvent(dropZone!, dropEvent);

      await waitFor(() => {
        expect(screen.getByText('dropped.pptx')).toBeInTheDocument();
      });
    });

    it('should ignore non-PPTX files in drop', () => {
      renderWithProvider(
        <PPTXImportDialog isOpen={true} onClose={mockOnClose} />
      );

      const mockFile = new File(['test content'], 'document.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });

      const dropZone = screen.getByText('Drag and drop a PowerPoint file here').closest('.file-drop-zone');
      
      const dropEvent = new Event('drop', { bubbles: true });
      Object.defineProperty(dropEvent, 'preventDefault', { value: jest.fn() });
      Object.defineProperty(dropEvent, 'stopPropagation', { value: jest.fn() });
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          files: [mockFile]
        }
      });

      fireEvent(dropZone!, dropEvent);

      // Should not display the file since it's not a PPTX
      expect(screen.queryByText('document.docx')).not.toBeInTheDocument();
      expect(screen.getByText('Drag and drop a PowerPoint file here')).toBeInTheDocument();
    });
  });

  describe('import options', () => {
    it('should toggle preserve formatting option', () => {
      renderWithProvider(
        <PPTXImportDialog isOpen={true} onClose={mockOnClose} />
      );

      const checkbox = screen.getByLabelText('Preserve formatting') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);

      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(false);

      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(true);
    });

    it('should toggle import images option', () => {
      renderWithProvider(
        <PPTXImportDialog isOpen={true} onClose={mockOnClose} />
      );

      const checkbox = screen.getByLabelText('Import images') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);

      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(false);
    });

    it('should change image quality setting', () => {
      renderWithProvider(
        <PPTXImportDialog isOpen={true} onClose={mockOnClose} />
      );

      const select = screen.getByDisplayValue('Medium (balanced)') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'high' } });
      
      expect(select.value).toBe('high');
    });

    it('should change max image size setting', () => {
      renderWithProvider(
        <PPTXImportDialog isOpen={true} onClose={mockOnClose} />
      );

      const input = screen.getByDisplayValue('10') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '20' } });
      
      expect(input.value).toBe('20');
    });
  });

  describe('import process', () => {
    it('should disable import button when no file selected', () => {
      renderWithProvider(
        <PPTXImportDialog isOpen={true} onClose={mockOnClose} />
      );

      const importButton = screen.getByText('Import Presentation') as HTMLButtonElement;
      expect(importButton.disabled).toBe(true);
    });

    it('should enable import button when file is selected', async () => {
      renderWithProvider(
        <PPTXImportDialog isOpen={true} onClose={mockOnClose} />
      );

      const mockFile = new File(['test content'], 'test.pptx', { 
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
      });

      const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(hiddenInput, 'files', {
        value: [mockFile],
        writable: false,
      });

      fireEvent.change(hiddenInput);

      await waitFor(() => {
        const importButton = screen.getByText('Import Presentation') as HTMLButtonElement;
        expect(importButton.disabled).toBe(false);
      });
    });

    it('should show progress during import', async () => {
      const mockImportService = {
        setProgressCallback: jest.fn(),
        importPPTX: jest.fn().mockImplementation(() => {
          return new Promise((resolve) => {
            // Simulate progress callback
            setTimeout(() => {
              const progressCallback = mockImportService.setProgressCallback.mock.calls[0][0];
              progressCallback({
                stage: 'parsing',
                progress: 50,
                message: 'Processing slides...'
              });
              
              resolve({
                success: true,
                presentation: { id: 'test', title: 'Test Presentation', slides: [] },
                warnings: [],
                errors: [],
                importedSlides: 1,
                skippedElements: 0
              });
            }, 100);
          });
        })
      };

      // Mock the constructor to return our mock service
      const { PPTXImportService } = require('../../services/pptxImportService');
      PPTXImportService.mockImplementation(() => mockImportService);

      renderWithProvider(
        <PPTXImportDialog isOpen={true} onClose={mockOnClose} />
      );

      // Add a file
      const mockFile = new File(['test content'], 'test.pptx', { 
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
      });

      const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(hiddenInput, 'files', {
        value: [mockFile],
        writable: false,
      });

      fireEvent.change(hiddenInput);

      await waitFor(() => {
        const importButton = screen.getByText('Import Presentation');
        fireEvent.click(importButton);
      });

      // Should show importing state
      await waitFor(() => {
        expect(screen.getByText('Importing...')).toBeInTheDocument();
      });

      // Should show progress
      await waitFor(() => {
        expect(screen.getByText('Import Progress')).toBeInTheDocument();
        expect(screen.getByText('Processing slides...')).toBeInTheDocument();
      });
    });
  });

  describe('dialog controls', () => {
    it('should close dialog when close button is clicked', () => {
      renderWithProvider(
        <PPTXImportDialog isOpen={true} onClose={mockOnClose} />
      );

      const closeButton = screen.getByText('×');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close dialog when cancel button is clicked', () => {
      renderWithProvider(
        <PPTXImportDialog isOpen={true} onClose={mockOnClose} />
      );

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not close dialog during import', async () => {
      const mockImportService = {
        setProgressCallback: jest.fn(),
        importPPTX: jest.fn().mockImplementation(() => {
          return new Promise(() => {}); // Never resolves to simulate ongoing import
        })
      };

      const { PPTXImportService } = require('../../services/pptxImportService');
      PPTXImportService.mockImplementation(() => mockImportService);

      renderWithProvider(
        <PPTXImportDialog isOpen={true} onClose={mockOnClose} />
      );

      // Add a file and start import
      const mockFile = new File(['test content'], 'test.pptx', { 
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
      });

      const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(hiddenInput, 'files', {
        value: [mockFile],
        writable: false,
      });

      fireEvent.change(hiddenInput);

      await waitFor(() => {
        const importButton = screen.getByText('Import Presentation');
        fireEvent.click(importButton);
      });

      // Try to close during import
      const closeButton = screen.getByText('×') as HTMLButtonElement;
      expect(closeButton.disabled).toBe(true);

      const cancelButton = screen.getByText('Cancel') as HTMLButtonElement;
      expect(cancelButton.disabled).toBe(true);
    });
  });
});