export const sortBys = ['Title', 'Date'] as const;
export type SortBy = typeof sortBys[number];

export const orderBys = ['Ascending', 'Descending'] as const;
export type OrderBy = typeof orderBys[number];

export type AwardFrontmatter = {
  title: string;
  subtitle: string;
  placement: string;
  description: string;
  date: string;
  hidden: boolean;
}

export type Award = {
  url: string;
  frontmatter: AwardFrontmatter;
}

