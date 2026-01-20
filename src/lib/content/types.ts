import type { Component } from 'svelte';

export interface ContentMetadata {
	title: string;
	description?: string;
	date?: string;
	tags?: string;
	url?: string;
	git?: string;
	image?: string;
	[key: string]: unknown;
}

export interface ContentItem {
	slug: string;
	title: string;
	description: string;
	date: string;
	tags: string[];
	metadata: ContentMetadata;
	content?: Component;
}

export interface ContentModule {
	default: Component;
	metadata: ContentMetadata;
}
