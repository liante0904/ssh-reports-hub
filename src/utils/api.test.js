import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeApiBaseUrl } from './api.js';

test('normalizeApiBaseUrl removes trailing slashes', () => {
  assert.equal(
    normalizeApiBaseUrl('https://api.example.com///'),
    'https://api.example.com'
  );
});

test('normalizeApiBaseUrl upgrades non-local http origins to https', () => {
  assert.equal(
    normalizeApiBaseUrl('http://api.example.com'),
    'https://api.example.com'
  );
});

test('normalizeApiBaseUrl preserves localhost http origins', () => {
  assert.equal(
    normalizeApiBaseUrl('http://localhost:8000/'),
    'http://localhost:8000'
  );
});

test('normalizeApiBaseUrl falls back to the default API URL on invalid input', () => {
  assert.equal(
    normalizeApiBaseUrl('not a url', 'http://localhost:8000'),
    'http://localhost:8000'
  );
});

test('normalizeApiBaseUrl returns an empty fallback when no URL is configured', () => {
  assert.equal(normalizeApiBaseUrl('', ''), '');
});
