import { store } from '../store';
import { latexGenerator } from './latexGenerator';

interface PendingGeneration {
  slideId: string;
  elementId: string;
  content: string;
  timeout: NodeJS.Timeout;
}

class LatexGenerationService {
  private pendingGenerations = new Map<string, PendingGeneration>();
  private readonly DEBOUNCE_DELAY = 1500; // 1.5 seconds delay
  private isGenerating = false;

  /**
   * Schedule LaTeX generation for a text element with debouncing
   */
  scheduleGeneration(slideId: string, elementId: string, content: string) {
    const key = `${slideId}-${elementId}`;
    
    // Clear existing timeout if any
    const existing = this.pendingGenerations.get(key);
    if (existing) {
      clearTimeout(existing.timeout);
    }

    // Schedule new generation
    const timeout = setTimeout(() => {
      this.executeGeneration(slideId, elementId, content);
      this.pendingGenerations.delete(key);
    }, this.DEBOUNCE_DELAY);

    this.pendingGenerations.set(key, {
      slideId,
      elementId,
      content,
      timeout
    });

    console.log(`📅 [LatexGeneration] Scheduled generation for element ${elementId} in ${this.DEBOUNCE_DELAY}ms`);
  }

  /**
   * Cancel pending generation for a specific element
   */
  cancelGeneration(slideId: string, elementId: string) {
    const key = `${slideId}-${elementId}`;
    const pending = this.pendingGenerations.get(key);
    
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingGenerations.delete(key);
      console.log(`❌ [LatexGeneration] Cancelled generation for element ${elementId}`);
    }
  }

  /**
   * Execute LaTeX generation immediately (bypassing debounce)
   */
  async executeGeneration(slideId: string, elementId: string, content: string) {
    if (this.isGenerating) {
      console.log(`⏳ [LatexGeneration] Generation already in progress, skipping for element ${elementId}`);
      return;
    }

    try {
      this.isGenerating = true;
      console.log(`🔥 [LatexGeneration] Starting LaTeX generation for element ${elementId}`);
      console.log(`📝 [LatexGeneration] Content: "${content}"`);

      const state = store.getState();
      const presentation = state.presentation.currentPresentation;
      
      if (!presentation) {
        console.error('❌ [LatexGeneration] No current presentation');
        return;
      }

      const slide = presentation.slides.find(s => s.id === slideId);
      if (!slide) {
        console.error(`❌ [LatexGeneration] Slide not found: ${slideId}`);
        return;
      }

      const element = slide.elements.find(e => e.id === elementId);
      if (!element || element.type !== 'text') {
        console.error(`❌ [LatexGeneration] Text element not found: ${elementId}`);
        return;
      }

      // Skip generation if content is empty or just whitespace
      if (!content || content.trim().length === 0) {
        console.log(`⏭️ [LatexGeneration] Skipping generation for empty content`);
        return;
      }

      // Generate LaTeX for the entire presentation
      const latexCode = latexGenerator.generateDocument(presentation);
      
      console.log(`✅ [LatexGeneration] LaTeX generated successfully for element ${elementId}`);
      console.log(`📄 [LatexGeneration] Generated LaTeX length: ${latexCode.length} characters`);
      console.log(`📝 [LatexGeneration] Generated LaTeX preview:`, latexCode.substring(0, 200) + '...');

      // LaTeX generation completed successfully
      // The generated LaTeX can be used by other services (e.g., preview, export)
      // For now, we just log it - in the future this could trigger preview updates

    } catch (error) {
      console.error(`❌ [LatexGeneration] Error generating LaTeX for element ${elementId}:`, error);
    } finally {
      this.isGenerating = false;
    }
  }

  /**
   * Check if generation is currently in progress
   */
  isGenerationInProgress(): boolean {
    return this.isGenerating;
  }

  /**
   * Get count of pending generations
   */
  getPendingCount(): number {
    return this.pendingGenerations.size;
  }

  /**
   * Clear all pending generations
   */
  clearAllPending() {
    this.pendingGenerations.forEach(pending => {
      clearTimeout(pending.timeout);
    });
    this.pendingGenerations.clear();
    console.log(`🧹 [LatexGeneration] Cleared all pending generations`);
  }

  /**
   * Force generation for all pending items immediately
   */
  async flushPending() {
    const pending = Array.from(this.pendingGenerations.values());
    this.clearAllPending();

    for (const item of pending) {
      await this.executeGeneration(item.slideId, item.elementId, item.content);
    }
  }
}

// Export singleton instance
export const latexGenerationService = new LatexGenerationService();