import React from 'react';
import type { SortBy, OrderBy } from '../../types/project';
import { sortBys, orderBys } from '../../types/project';

interface ProjectSortProps {
  sortBy: SortBy;
  orderBy: OrderBy;
  onSortByChange: (sortBy: SortBy) => void;
  onOrderByChange: (orderBy: OrderBy) => void;
}

const ProjectSort = ({
  sortBy,
  orderBy,
  onSortByChange,
  onOrderByChange,
}: ProjectSortProps) => {
  return (
    <fieldset id="project-sort">
      <legend>Sort</legend>
      <label>
        Sort By:
        <select
          id="sort-by"
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value as SortBy)}
        >
          {sortBys.map((sortByOption) => (
            <option key={sortByOption} value={sortByOption}>
              {sortByOption}
            </option>
          ))}
        </select>
      </label>
      <label>
        Order By:
        <select
          id="sort-order"
          value={orderBy}
          onChange={(e) => onOrderByChange(e.target.value as OrderBy)}
        >
          {orderBys.map((orderByOption) => (
            <option key={orderByOption} value={orderByOption}>
              {orderByOption}
            </option>
          ))}
        </select>
      </label>
    </fieldset>
  );
};

export default ProjectSort;
