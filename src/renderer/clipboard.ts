export function copyText(value: string): void {
  void navigator.clipboard?.writeText(value).catch(() => undefined);
}
