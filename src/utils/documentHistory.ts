import { ActiveDocumentState, Quiz } from '../types/quiz';

const ACTIVE_DOC_KEY = 'docuquiz_active_document';
const DOC_REGISTRY_KEY = 'docuquiz_document_registry';

interface DocRegistryEntry {
  documentKey: string;
  name: string;
  batchCount: number;
  questionPrompts: string[];
  lastUsedAt: number;
}

// Normalize document name/content for stable lookup
export function computeDocumentKey(name: string, contentSnippet?: string): string {
  const cleanName = name.trim().toLowerCase();
  const snippet = (contentSnippet || '').slice(0, 100).trim().toLowerCase();
  return `${cleanName}__${snippet}`;
}

export function getDocumentRegistry(): Record<string, DocRegistryEntry> {
  try {
    const raw = localStorage.getItem(DOC_REGISTRY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveDocumentRegistry(registry: Record<string, DocRegistryEntry>) {
  try {
    localStorage.setItem(DOC_REGISTRY_KEY, JSON.stringify(registry));
  } catch {
    // Ignore quota errors
  }
}

export function getActiveDocumentState(): ActiveDocumentState | null {
  try {
    const raw = localStorage.getItem(ACTIVE_DOC_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setActiveDocumentState(doc: ActiveDocumentState | null) {
  try {
    if (!doc) {
      localStorage.removeItem(ACTIVE_DOC_KEY);
    } else {
      localStorage.setItem(ACTIVE_DOC_KEY, JSON.stringify(doc));
    }
  } catch {
    // Ignore
  }
}

/**
 * Collect all question prompts already generated for this document from:
 * 1. Document registry
 * 2. Active document state
 * 3. Saved library quizzes matching this document name
 */
export function getPreviousQuestionsForDocument(
  docName: string,
  contentSnippet?: string
): string[] {
  const questionsSet = new Set<string>();
  const docKey = computeDocumentKey(docName, contentSnippet);

  // 1. Check registry
  const registry = getDocumentRegistry();
  if (registry[docKey] && Array.isArray(registry[docKey].questionPrompts)) {
    registry[docKey].questionPrompts.forEach((q) => questionsSet.add(q));
  }

  // 2. Also check active document
  const activeDoc = getActiveDocumentState();
  if (activeDoc && (activeDoc.name.toLowerCase() === docName.toLowerCase() || activeDoc.id === docKey)) {
    if (Array.isArray(activeDoc.generatedQuestionTexts)) {
      activeDoc.generatedQuestionTexts.forEach((q) => questionsSet.add(q));
    }
  }

  // 3. Check docuquiz_library for past quizzes from this document
  try {
    const libraryRaw = localStorage.getItem('docuquiz_library');
    if (libraryRaw) {
      const library: Quiz[] = JSON.parse(libraryRaw);
      library.forEach((quiz) => {
        if (
          quiz.sourceDocumentName &&
          quiz.sourceDocumentName.toLowerCase() === docName.toLowerCase()
        ) {
          quiz.questions.forEach((q) => questionsSet.add(q.question));
        }
      });
    }
  } catch {
    // Ignore
  }

  return Array.from(questionsSet);
}

/**
 * Record newly generated questions into the document history and increment batch count
 */
export function recordQuizForDocument(
  docName: string,
  contentSnippet: string | undefined,
  newQuestions: string[]
): number {
  const docKey = computeDocumentKey(docName, contentSnippet);
  const registry = getDocumentRegistry();
  const existing = registry[docKey] || {
    documentKey: docKey,
    name: docName,
    batchCount: 0,
    questionPrompts: [],
    lastUsedAt: Date.now(),
  };

  const updatedPrompts = Array.from(new Set([...existing.questionPrompts, ...newQuestions]));
  const nextBatchCount = existing.batchCount + 1;

  registry[docKey] = {
    ...existing,
    name: docName,
    batchCount: nextBatchCount,
    questionPrompts: updatedPrompts,
    lastUsedAt: Date.now(),
  };

  saveDocumentRegistry(registry);

  // Update active document state as well
  const active = getActiveDocumentState();
  if (active) {
    setActiveDocumentState({
      ...active,
      batchCount: nextBatchCount,
      generatedQuestionTexts: updatedPrompts,
      lastUsedAt: Date.now(),
    });
  }

  return nextBatchCount;
}

export function getBatchCountForDocument(docName: string, contentSnippet?: string): number {
  const docKey = computeDocumentKey(docName, contentSnippet);
  const registry = getDocumentRegistry();
  if (registry[docKey]) {
    return registry[docKey].batchCount;
  }
  return 0;
}

export function resetDocumentHistory(docName: string, contentSnippet?: string) {
  const docKey = computeDocumentKey(docName, contentSnippet);
  const registry = getDocumentRegistry();
  if (registry[docKey]) {
    delete registry[docKey];
    saveDocumentRegistry(registry);
  }
  const active = getActiveDocumentState();
  if (active && (active.name.toLowerCase() === docName.toLowerCase() || active.id === docKey)) {
    setActiveDocumentState({
      ...active,
      batchCount: 0,
      generatedQuestionTexts: [],
    });
  }
}
