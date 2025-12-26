import React, { useState, useEffect } from 'react';

const ProjectListFilter = ({filter, setFilter}) => {
  return (
    <div className="project-filter">
      <button onClick={() => {
        setFilter({...filter, showHidden: !filter.showHidden});
      }}>Show Hidden = {filter.showHidden.toString()}</button>
    </div>
  );
}

const ProjectList = ({filteredProjects}) => {
  return (
    <ul>
      {filteredProjects.map((project) => (
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
 
  // All by default
  const [filter, setFilter] = useState({
    languages: ['Python', 'C', 'C++', 'Dart', 'Java', 'HTML/CSS/JavaScript', 'No Programming Language'],
    progress: ['In-Progress', 'Finished'],
    association: ['Hackathon', 'Atsign', 'Hobby', 'School'],
    showHidden: false,
  });

  const [filteredProjects, setFilteredProjects] = useState([]);

  useEffect(() => {
    // update projects whenever filter is updated
    const updatedProjects = allProjects.filter((project) => {
      // not hidden OR we're showing hidden items
      const shouldBeShown = !project.frontmatter.hidden || filter.showHidden
      const matchesLanguages = project.frontmatter.languages.length == 0 ? filter.languages.includes('No Programming Language') : project.frontmatter.languages.some((language) => filter.languages.includes(language));
      const matchesProgress = filter.progress.includes(project.frontmatter.progress);
      const matchesAssociation = filter.association.includes(project.frontmatter.association);

      const result = shouldBeShown && matchesLanguages && matchesProgress && matchesAssociation;
      if(!result) {
        console.log(`${project.frontmatter.title} 
          was not included in filtered list 
          ${matchesLanguages} | ${matchesProgress} | ${matchesAssociation}`);
      }
      return result;
    });
    setFilteredProjects(updatedProjects);
  }, [filter]);

  return (
    <div>
      <h2>Projects</h2>
      <ProjectListFilter filter={filter} setFilter={setFilter} />
      <ProjectList filteredProjects={filteredProjects} />
    </div>
  );
}

export default ProjectCanvas;
