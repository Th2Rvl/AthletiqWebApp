/** Page demandée par un `p-table` paginé côté serveur (index du premier élément et taille). */
export interface PageChange {
  first: number;
  rows: number;
}
