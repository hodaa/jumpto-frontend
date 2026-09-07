/** Don't interrupt someone using the language menu or reading anchored help. */
export function isReadingHelp(): boolean {
  return Boolean(document.activeElement?.closest('header, #how-it-works, #why-jumpto'));
}
