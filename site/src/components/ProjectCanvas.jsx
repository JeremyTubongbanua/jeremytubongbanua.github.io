import React, { useState, useEffect } from 'react';

const ProjectFilter = ({filter, setFilter}) => {
  return (
    <div className="project-filter">
      <button onClick={() => {
        setFilter({...filter, showHidden: !filter.showHidden});
      }}>Show Hidden = {filter.showHidden.toString()}</button>
    </div>
  );
}

const ProjectSort = ({sort, setSort}) => {
  return (
    <div className="project-sort">
      <label>
        Sort By:
        <select value={sort.by} onChange={(e) => {
          setSort({...sort, by: e.target.value});
        }}>
          <option value="Date">Date</option>
          <option value="Title">Title</option>
          <option value="Association">Association</option>
          <option value="Progress">Progress</option>
        </select>
      </label>
      <label>
        Order:
        <select value={sort.order} onChange={(e) => {
          setSort({...sort, order: e.target.value});
        }}>
          <option value="Ascending">Ascending</option>
          <option value="Descending">Descending</option>
        </select>
      </label>
    </div>
  );
}

const ProjectList = ({processedProjects}) => {
  return (
    <ul>
      {processedProjects.map((project) => (
        <li key={project.url}>
          <a href={project.url}>
            {project.frontmatter.title}
          </a>
        </li>))}
    </ul>
  );
}


const ProjectCanvas = ({allProjects}) => {
  // filter: {
  //   languages: {C, C++, Dart, Java, HTML/CSS/JavaScript}
  //   progress: {In-Progress/Finished}
  //   association: {Hackathon/Atsign/Hobby}
  //   hidden: (true/false)
  // }
  //
  // sort: {
  //  by: 'Date'/'Title'/'Association'/'Progress'
  //  order: 'Ascending'/'Descending'
  // }

  // All on by default
  const [filter, setFilter] = useState({
    languages: ['Python', 'C', 'C++', 'Dart', 'Java', 'HTML/CSS/JavaScript', 'No Programming Language'],
    progress: ['In-Progress', 'Finished'],
    association: ['Hackathon', 'Atsign', 'Hobby', 'School'],
    showHidden: false,
  });

  const [sort, setSort] = useState({
    by: 'Date',
    order: 'Descending',
  });

  const [processedProjects, setProcessedProjects] = useState([]);

  useEffect(() => {
    const filteredProjects = allProjects.filter((project) => {
      const shouldBeShown = !project.frontmatter.hidden || filter.showHidden;
      const matchesLanguages = project.frontmatter.languages.length === 0 
        ? filter.languages.includes('No Programming Language') 
        : project.frontmatter.languages.some((language) => filter.languages.includes(language));
      const matchesProgress = filter.progress.includes(project.frontmatter.progress);
      const matchesAssociation = filter.association.includes(project.frontmatter.association);

      return shouldBeShown && matchesLanguages && matchesProgress && matchesAssociation;
    });

    const sortedProjects = [...filteredProjects].sort((projectA, projectB) => {
      const multiplier = sort.order === 'Ascending' ? 1 : -1;

      if(sort.by === 'Date') {
        return multiplier * (new Date(projectA.frontmatter.date) - new Date(projectB.frontmatter.date));
      } else if(sort.by === 'Title') {
        return multiplier * projectA.frontmatter.title.localeCompare(projectB.frontmatter.title);
      } else if(sort.by === 'Association') {
        return multiplier * projectA.frontmatter.association.localeCompare(projectB.frontmatter.association);
      } else if(sort.by === 'Progress') {
        return multiplier * projectA.frontmatter.progress.localeCompare(projectB.frontmatter.progress);
      }
    });

    setProcessedProjects(sortedProjects);
  }, [filter, sort, allProjects]);

  return (
    <div>
      <h2>Projects</h2>
      <ProjectFilter filter={filter} setFilter={setFilter} />
      <ProjectSort sort={sort} setSort={setSort} />
      <ProjectList processedProjects={processedProjects} />
    </div>
  );
}

export default ProjectCanvas;
