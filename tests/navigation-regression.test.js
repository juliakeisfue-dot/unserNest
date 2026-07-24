/**
 * tests/navigation-regression.test.js
 * Regressionstests fuer Navigation/Section-Rendering.
 */
import { suite, test, eq, isTrue, notNull, summary } from './helpers.js';
import { AnalyticsManager } from '../modules/domains/analytics/manager.js';
import { AnalyticsUI } from '../modules/domains/analytics/ui.js';
import { DocumentationUI } from '../modules/domains/documentation/ui.js';
import { HelpManager } from '../modules/domains/help/manager.js';

suite('Navigation Regression – Analytics');

test('AnalyticsManager.getDashboard verarbeitet Event-Objekte robust', () => {
  const tracker = {
    getAnalytics: () => [],
    getAllEvents: () => ({
      shopping: [{ timestamp: 1710000000000, userId: 'julia' }],
      broken: { foo: 'bar' }
    })
  };

  const manager = new AnalyticsManager(tracker);
  const dashboard = manager.getDashboard();

  eq(dashboard.summary.totalEvents, 1);
  eq(dashboard.summary.uniqueUsers, 1);
  eq(dashboard.summary.lastEventAt, 1710000000000);
});

test('AnalyticsUI.renderDashboard rendert in analyticsContent', () => {
  const container = { innerHTML: '' };
  global.document = {
    getElementById: (id) => (id === 'analyticsContent' ? container : null)
  };

  const app = {
    analyticsManager: {
      getDashboard: () => ({ summary: { totalEvents: 1, uniqueUsers: 1, totalFeatures: 1, lastEventAt: 1710000000000 } }),
      getFeatureRanking: () => [{ featureId: 'shopping', totalEvents: 1, uniqueUsers: 1, avgEventsPerUser: 1, eventTypes: 1 }]
    }
  };

  const ui = new AnalyticsUI(app);
  ui.renderDashboard();

  isTrue(container.innerHTML.includes('Analytics Dashboard'));
});

suite('Navigation Regression – Dokumentation/Hilfe');

test('DocumentationUI rendert in documentationContent', () => {
  const container = { innerHTML: '' };
  global.document = {
    getElementById: (id) => (id === 'documentationContent' ? container : null)
  };

  const app = {
    docManager: {
      getFullDocumentation: () => ({
        appName: 'Unser Nest',
        appVersion: '1.0.0',
        purpose: 'Test',
        lastUpdated: Date.now(),
        authentication: { model: 'lokal', description: 'Test', features: [] },
        permissions: { roleModel: 'Familie', levels: [] },
        dataRetention: { localStorage: 'ja', cloudSync: 'optional', tracking: 'lokal' },
        features: []
      })
    }
  };

  const ui = new DocumentationUI(app);
  ui.render();

  isTrue(container.innerHTML.includes('Unser Nest'));
});

test('HelpManager enthaelt Kassenbon-, Chronik- und Dokumentations-Hilfe', () => {
  const manager = new HelpManager();
  const bill = manager.getSection('bill');
  const chronicle = manager.getSection('chronicle');
  const documentation = manager.getSection('documentation');
  const shopping = manager.getSection('shopping');

  notNull(bill);
  notNull(chronicle);
  notNull(documentation);
  eq(bill.category, 'Module');
  eq(chronicle.category, 'Module');
  eq(documentation.category, 'Module');
  isTrue((shopping.content || '').includes('Google Tasks'));
});

summary();
