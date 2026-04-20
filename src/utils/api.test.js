import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeApiBaseUrl } from './api.js';

test('normalizeApiBaseUrl removes trailing slashes', () => {
  assert.equal(
    normalizeApiBaseUrl('https://ssh-oci.duckdns.org///'),
    'https://ssh-oci.duckdns.org'
  );
});

test('normalizeApiBaseUrl upgrades non-local http origins to https', () => {
  assert.equal(
    normalizeApiBaseUrl('http://ssh-oci.duckdns.org'),
    'https://ssh-oci.duckdns.org'
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
    normalizeApiBaseUrl('not a url'),
    'https://ssh-oci.duckdns.org'
  );
});

