import { describe, it, expect, vi } from 'vitest';

vi.mock('./firebase', () => ({ auth: { currentUser: null } }));

import { api } from './api';

describe('api', () => {
	it('exports expected methods', () => {
		expect(typeof api.get).toBe('function');
		expect(typeof api.post).toBe('function');
		expect(typeof api.put).toBe('function');
		expect(typeof api.delete).toBe('function');
	});
});
