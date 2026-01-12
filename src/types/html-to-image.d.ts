declare module 'html-to-image' {
  export function toPng(node: HTMLElement, options?: any): Promise<string>
  // other exports can be added as needed
}
