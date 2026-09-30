export declare function renderMaintenance(siteUrl: string): string;
export declare function isMaintenanceOn(raw: unknown): boolean;
import type { Plugin } from 'vite';
export declare function maintenanceDevPlugin(siteUrl: string): Plugin;
