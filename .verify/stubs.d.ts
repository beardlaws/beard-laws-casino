declare module "pixi.js" { export class Application { destroy(...a:any[]):void; } }
declare module "@supabase/supabase-js" { export type SupabaseClient = any; export type Session = any; export function createClient(...a:any[]): any; }
interface ImportMeta { env: Record<string,string>; }
