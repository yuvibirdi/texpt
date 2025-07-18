import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import PreviewPane from '../PreviewPane';
import presentationReducer from '../../store/slices/presentationSlice';
import uiReducer from '../../store/slices/uiSlice';
import { usePreview } from '../../hooks/usePreview';

// Mock the usePreview hook
jest.mock('../../hooks/usePreview');
const mockUsePreview = usePreview as jest.MockedFunction<typeof usePreview>;

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-blob-url');
global.URL.revokeObjectURL = jest.fn();

const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      presentation: presentationReducer,
      ui: uiReducer,
    },
    preloadedState: {
      presentation: {
        currentPresentation: {
          id: 'test-presentation',
          title: 'Test Presentation',
          slides: [
            {
              id: 'slide-1',
              title: 'Slide 1',
              elements: [],
              connections: [],
              layout: { name: 'default' },
              background: { type: 'color', color: { r: 255, g: 255, b: 255, a: 1 } },
              notes: '',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          theme: {
            colors: {
              primary: { r: 0, g: 123, b: 255, a: 1 },
              secondary: { r: 108, g: 117, b: 125, a: 1 },
              background: { r: 255, g: 255, b: 255, a: 1 },
              text: { r: 33, g: 37, b: 41, a: 1 },
            },
            fonts: {
              heading: 'Inter',
              body: 'Inter',
            },
          },
          metadata: {
            title: 'Test Presentation',
            subtitle: '',
            author: '',
            institution: '',
            date: new Date(),
            keywords: [],
            description: '',
          },
          settings: {
            slideSize: { width: 800, height: 600 },
            aspectRatio: '4:3',
            theme: 'default',
            language: 'en',
            autoSave: true,
            autoSaveInterval: 30000,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0.0',
        },
        presentations: [],
        currentSlideId: 'slide-1',
        isModified: false,
        lastSaved: null,
      },
      ui: {
        selectedTool: 'select',
        zoom: 100,
        showGrid: true,
        showRulers: false,
        sidebarCollapsed: false,
        previewCollapsed: false,
      },
      ...initialState,
    },
  });
};

describe('PreviewPane', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders preview pane with header and controls', () => {
    mockUsePreview.mockReturnValue({
      previewState: {
        isCompiling: false,
        progress: 0,
        stage: 'idle',
        message: 'Ready to compile',
        lastCompiled: null,
        error: null,
        pdfUrl: null,
        currentSlideIndex: 0,
      },
      compilePresentation: jest.fn(),
      cancelCompilation: jest.fn(),
      downloadPdf: jest.fn(),
      navigateToSlide: jest.fn(),
      isLatexAvailable: true,
      checkLatexAvailability: jest.fn(),
    });

    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <PreviewPane />
      </Provider>
    );

    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(screen.getByTitle('Refresh preview')).toBeInTheDocument();
    expect(screen.getByTitle('Download PDF')).toBeInTheDocument();
  });

  it('shows compilation progress when compiling', () => {
    mockUsePreview.mockReturnValue({
      previewState: {
        isCompiling: true,
        progress: 50,
        stage: 'compiling',
        message: 'Compiling LaTeX...',
        lastCompiled: null,
        error: null,
        pdfUrl: null,
        currentSlideIndex: 0,
      },
      compilePresentation: jest.fn(),
      cancelCompilation: jest.fn(),
      downloadPdf: jest.fn(),
      navigateToSlide: jest.fn(),
      isLatexAvailable: true,
      checkLatexAvailability: jest.fn(),
    });

    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <PreviewPane />
      </Provider>
    );

    expect(screen.getByText('Compiling LaTeX... (50%)')).toBeInTheDocument();
    expect(screen.getByText('Compiling presentation...')).toBeInTheDocument();
    
    // Progress bar should be visible
    const progressFill = document.querySelector('.progress-fill');
    expect(progressFill).toHaveStyle('width: 50%');
  });

  it('shows compilation error when compilation fails', () => {
    mockUsePreview.mockReturnValue({
      previewState: {
        isCompiling: false,
        progress: 0,
        stage: 'failed',
        message: 'Compilation failed',
        lastCompiled: null,
        error: 'LaTeX Error: Undefined control sequence',
        pdfUrl: null,
        currentSlideIndex: 0,
      },
      compilePresentation: jest.fn(),
      cancelCompilation: jest.fn(),
      downloadPdf: jest.fn(),
      navigateToSlide: jest.fn(),
      isLatexAvailable: true,
      checkLatexAvailability: jest.fn(),
    });

    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <PreviewPane />
      </Provider>
    );

    expect(screen.getByText('LaTeX Error: Undefined control sequence')).toBeInTheDocument();
    expect(screen.getByText('Compilation failed')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('shows PDF when compilation is successful', () => {
    mockUsePreview.mockReturnValue({
      previewState: {
        isCompiling: false,
        progress: 100,
        stage: 'completed',
        message: 'Compilation successful',
        lastCompiled: new Date('2023-01-01T12:00:00Z'),
        error: null,
        pdfUrl: 'mock-blob-url',
        currentSlideIndex: 0,
      },
      compilePresentation: jest.fn(),
      cancelCompilation: jest.fn(),
      downloadPdf: jest.fn(),
      navigateToSlide: jest.fn(),
      isLatexAvailable: true,
      checkLatexAvailability: jest.fn(),
    });

    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <PreviewPane />
      </Provider>
    );

    expect(screen.getByTitle('PDF Preview')).toBeInTheDocument();
    expect(screen.getByText(/Last compiled:/)).toBeInTheDocument();
    
    const iframe = screen.getByTitle('PDF Preview') as HTMLIFrameElement;
    expect(iframe.src).toContain('mock-blob-url');
  });

  it('shows LaTeX not available error when LaTeX is not installed', () => {
    mockUsePreview.mockReturnValue({
      previewState: {
        isCompiling: false,
        progress: 0,
        stage: 'idle',
        message: 'LaTeX not available',
        lastCompiled: null,
        error: 'LaTeX not found. Please install TeX Live or MiKTeX.',
        pdfUrl: null,
        currentSlideIndex: 0,
      },
      compilePresentation: jest.fn(),
      cancelCompilation: jest.fn(),
      downloadPdf: jest.fn(),
      navigateToSlide: jest.fn(),
      isLatexAvailable: false,
      checkLatexAvailability: jest.fn(),
    });

    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <PreviewPane />
      </Provider>
    );

    expect(screen.getAllByText('LaTeX not found. Please install TeX Live or MiKTeX.')[0]).toBeInTheDocument();
    expect(screen.getByText('Check LaTeX')).toBeInTheDocument();
    expect(screen.getByText('LaTeX not available')).toBeInTheDocument();
  });

  it('calls compilePresentation when refresh button is clicked', async () => {
    const mockCompilePresentation = jest.fn().mockResolvedValue(undefined);
    
    mockUsePreview.mockReturnValue({
      previewState: {
        isCompiling: false,
        progress: 0,
        stage: 'idle',
        message: 'Ready to compile',
        lastCompiled: null,
        error: null,
        pdfUrl: null,
        currentSlideIndex: 0,
      },
      compilePresentation: mockCompilePresentation,
      cancelCompilation: jest.fn(),
      downloadPdf: jest.fn(),
      navigateToSlide: jest.fn(),
      isLatexAvailable: true,
      checkLatexAvailability: jest.fn(),
    });

    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <PreviewPane />
      </Provider>
    );

    const refreshButton = screen.getByTitle('Refresh preview');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockCompilePresentation).toHaveBeenCalledTimes(1);
    });
  });

  it('calls downloadPdf when download button is clicked', () => {
    const mockDownloadPdf = jest.fn();
    
    mockUsePreview.mockReturnValue({
      previewState: {
        isCompiling: false,
        progress: 100,
        stage: 'completed',
        message: 'Compilation successful',
        lastCompiled: new Date(),
        error: null,
        pdfUrl: 'mock-blob-url',
        currentSlideIndex: 0,
      },
      compilePresentation: jest.fn(),
      cancelCompilation: jest.fn(),
      downloadPdf: mockDownloadPdf,
      navigateToSlide: jest.fn(),
      isLatexAvailable: true,
      checkLatexAvailability: jest.fn(),
    });

    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <PreviewPane />
      </Provider>
    );

    const downloadButton = screen.getByTitle('Download PDF');
    fireEvent.click(downloadButton);

    expect(mockDownloadPdf).toHaveBeenCalledWith('Test Presentation.pdf');
  });

  it('disables controls when compiling', () => {
    mockUsePreview.mockReturnValue({
      previewState: {
        isCompiling: true,
        progress: 25,
        stage: 'compiling',
        message: 'Compiling...',
        lastCompiled: null,
        error: null,
        pdfUrl: null,
        currentSlideIndex: 0,
      },
      compilePresentation: jest.fn(),
      cancelCompilation: jest.fn(),
      downloadPdf: jest.fn(),
      navigateToSlide: jest.fn(),
      isLatexAvailable: true,
      checkLatexAvailability: jest.fn(),
    });

    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <PreviewPane />
      </Provider>
    );

    const refreshButton = screen.getByTitle('Refresh preview');
    expect(refreshButton).toBeDisabled();
  });

  it('disables download button when no PDF is available', () => {
    mockUsePreview.mockReturnValue({
      previewState: {
        isCompiling: false,
        progress: 0,
        stage: 'idle',
        message: 'Ready to compile',
        lastCompiled: null,
        error: null,
        pdfUrl: null,
        currentSlideIndex: 0,
      },
      compilePresentation: jest.fn(),
      cancelCompilation: jest.fn(),
      downloadPdf: jest.fn(),
      navigateToSlide: jest.fn(),
      isLatexAvailable: true,
      checkLatexAvailability: jest.fn(),
    });

    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <PreviewPane />
      </Provider>
    );

    const downloadButton = screen.getByTitle('Download PDF');
    expect(downloadButton).toBeDisabled();
  });

  it('calls checkLatexAvailability when Check Again button is clicked', async () => {
    const mockCheckLatexAvailability = jest.fn().mockResolvedValue(undefined);
    
    mockUsePreview.mockReturnValue({
      previewState: {
        isCompiling: false,
        progress: 0,
        stage: 'idle',
        message: 'LaTeX not available',
        lastCompiled: null,
        error: 'LaTeX not found. Please install TeX Live or MiKTeX.',
        pdfUrl: null,
        currentSlideIndex: 0,
      },
      compilePresentation: jest.fn(),
      cancelCompilation: jest.fn(),
      downloadPdf: jest.fn(),
      navigateToSlide: jest.fn(),
      isLatexAvailable: false,
      checkLatexAvailability: mockCheckLatexAvailability,
    });

    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <PreviewPane />
      </Provider>
    );

    const checkButton = screen.getByText('Check LaTeX');
    fireEvent.click(checkButton);

    await waitFor(() => {
      expect(mockCheckLatexAvailability).toHaveBeenCalledTimes(1);
    });
  });
});