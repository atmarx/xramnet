export const contentTypes = ['musings', 'projects'] as const;
export type ContentType = (typeof contentTypes)[number];
