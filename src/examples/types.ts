/** 示例目录项。mount 返回的 handle.api 交给方法按钮，dispose 负责注销 */
export type EngineKind = "both" | "cesium" | "ol" | "common";

export interface ExampleContext {
  mode: "2d" | "3d";
  viewer: any;
  olMap: any;
  log: (message: string) => void;
}

export interface ExampleHandle {
  api: any;
  dispose: () => void;
}

export interface ExampleAction {
  name: string;
  run: (handle: ExampleHandle, ctx: ExampleContext) => void | Promise<void>;
}

export interface SdkExample {
  id: string;
  group: string;
  name: string;
  from: string;
  summary: string;
  engine: EngineKind;
  methods: string[];
  mount: (ctx: ExampleContext) => ExampleHandle | Promise<ExampleHandle>;
  unmount: (handle: ExampleHandle | null, ctx: ExampleContext) => void;
  actions: ExampleAction[];
}

export function disposeHandle(handle: ExampleHandle | null) {
  handle?.dispose?.();
}
