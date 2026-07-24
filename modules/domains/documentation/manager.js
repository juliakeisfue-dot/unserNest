/**
 * modules/domains/documentation/manager.js
 *
 * Verwaltung von Feature-Dokumentation für die UI.
 */

import { DOCUMENTATION, getFeatureById, getFeaturesByCategory, getFeaturesSorted } from '../../core/documentation.js';

export class DocumentationManager {
  constructor() {
    this.doc = DOCUMENTATION;
  }

  getFullDocumentation() {
    return this.doc;
  }

  getFeaturesSorted() {
    return getFeaturesSorted();
  }

  getFeaturesByCategory(category) {
    return getFeaturesByCategory(category);
  }

  getFeatureById(featureId) {
    return getFeatureById(featureId);
  }

  getCategories() {
    const categories = new Set();
    this.doc.features.forEach(f => categories.add(f.category));
    return Array.from(categories).sort();
  }
}

