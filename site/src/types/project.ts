export const sortBys = ['Title', 'Date', 'Association', 'Progress'] as const;
export type SortBy = typeof sortBys[number];

export const orderBys = ['Ascending', 'Descending'] as const;
export type OrderBy = typeof orderBys[number];

export type ProjectFrontmatter = {
  title: string;
  subtitle: string;
  description: string;
  date: string;
  languages: string[];
  progress: string;
  association: string;
  hidden: boolean;
}

export type Project = {
  url: string;
  frontmatter: ProjectFrontmatter;
}

export type State = {
  filter: {
    languages: string[];
    associations: string[];
    progresses: string[];
  };
  sort: {
    sortBy: SortBy;
    orderBy: OrderBy;
  }
}
