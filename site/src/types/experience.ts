export const sortBys = ['Title', 'From Date', 'To Date', 'Category'] as const;
export type SortBy = typeof sortBys[number];

export const orderBys = ['Ascending', 'Descending'] as const;
export type OrderBy = typeof orderBys[number];

export type ExperienceFrontmatter = {
  title: string;
  subtitle: string;
  description: string;
  fromdate: string;
  todate: string;
  category: string;
  hidden: boolean;
}

export type Experience = {
  url: string;
  frontmatter: ExperienceFrontmatter;
}

