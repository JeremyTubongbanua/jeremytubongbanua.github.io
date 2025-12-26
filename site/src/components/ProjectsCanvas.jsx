import React, { useState, useEffect } from 'react';

const ProjectFilter = ({filter, setFilter, languages, progresses, associations}) => {
  return (
    <div className="project-filter">
      <fieldset>
        <div>
          <label>Show Hidden:</label>
          <button onClick={() => {
            setFilter({...filter, showHidden: !filter.showHidden});
          }}>{filter.showHidden ? 'Disable' : 'Enable'}</button>
        </div>
        <legend>Filter</legend>
        Programming Language:
        {languages.map((language) => {
          return (
            <label key={language}>
              <input
                type="checkbox"
                checked={filter.languages.includes(language)}
                onChange={(e) => {
                  let newLanguages = filter.languages.includes(language) ?
                    filter.languages.filter((l) => l !== language) :
                    [...filter.languages, language];
                  setFilter({...filter, languages: newLanguages});
                }}
              />
              {language}
            </label>
          );
        })}
        <br/>
        Progress:
        {progresses.map((progress) => {
          return <label key={progress}>
            <input 
              type="checkbox"
              checked={filter.progresses.includes(progress)}
              onChange={(e) => {
                const isChecked = e.target.checked;
                if(!isChecked && filter.progresses.length === 1) {
                  // do not let it remove the last one
                  alert('At least one progress must be checked at all times');
                  return;
                }
                let newProgresses = [];
                if(!isChecked) {
                  newProgresses = filter.progresses.filter((p) => p !== progress); 
                } else {
                  newProgresses = [...filter.progresses, progress];
                }
                setFilter({...filter, progresses: newProgresses});
              }}  
            />
            {progress}
          </label>
        })}
        <br/>
        Association: {associations.map((association) => {
          return <label key={association}>
            <input 
              type="checkbox"
              checked={filter.associations.includes(association)}
              onChange={(e) => {
                const isChecked = e.target.checked; // this was JUST changed
                if(!isChecked && filter.associations.length === 1) {
                  // we don't want to remove the last one
                  alert('At least one association must be selected at all times');
                  return;
                }
                let newAssociations = [];
                if(!isChecked) {
                  // we just unchecked
                  // remove it 
                  newAssociations = filter.associations.filter((a) => a !== association);
                } else {
                  // we just checked it
                  // add it to the list of associations
                  newAssociations = [...filter.associations, association];
                }
                setFilter({...filter, associations: newAssociations});
              }}
            />
            {association}
          </label>
        })}
      </fieldset>
    </div>
  );
}

const ProjectSort = ({sort, setSort, bys, orders}) => {
  return (
    <fieldset id="project-sort">
      <legend>
        Sort
      </legend>
      <label>
        Sort By:
        <select onChange={(e) => {
          setSort({...sort, by: e.target.value});
        }} value={sort.by}>
          {bys.map((by) => <option key={by} value={by}>{by}</option>)}
        </select>
      </label>
      <label>
        Order By:
        <select onChange={(e) => {
          setSort({...sort, order: e.target.value});
        }} value={sort.order}>
          {orders.map((order) => <option key={order} value={order}>{order}</option>)}
        </select>
      </label>
    </fieldset>
  );
}

const ProjectList = ({onShowAllBtnPress, allProjects, processedProjects}) => {
  return (
    <div>
      <h2>Viewing: {processedProjects.length} projects out of {allProjects.length}</h2>
      <button onClick={onShowAllBtnPress}>Show All</button>
      <ul>
        {processedProjects.map((project) => (
          <li key={project.url}>
            <a href={project.url}>
              {project.frontmatter.title}
            </a>
          </li>))}
      </ul>
    </div>
  );
}


const ProjectCanvas = ({allProjects}) => {
  const languages = ['C', 'C++', 'Dart', 'Python', 'Java', 'HTML/CSS/JavaScript', 'No Programming Language'];
  const progresses = ['In-Progress', 'Finished'];
  const associations = ['Hackathon', 'Atsign', 'Hobby', 'School'];

  const bys = ['Date', 'Title', 'Association', 'Progress'];
  const orders = ['Ascending', 'Descending'];

  const [filter, setFilter] = useState({
    languages: [...languages],
    progresses: [...progresses],
    associations: [...associations],
    showHidden: false,
  });

  const [sort, setSort] = useState({
    by: bys[1],
    order: orders[0]
  });

  const [processedProjects, setProcessedProjects] = useState([]);

  useEffect(() => {
    const filteredProjects = allProjects.filter((project) => {
      const shouldBeShown = !project.frontmatter.hidden || filter.showHidden;
      const matchesLanguages = project.frontmatter.languages.length === 0 
        ? filter.languages.includes('No Programming Language') 
        : project.frontmatter.languages.some((language) => filter.languages.includes(language));
      const matchesProgress = filter.progresses.includes(project.frontmatter.progress);
      const matchesAssociation = filter.associations.includes(project.frontmatter.association);
      return shouldBeShown && matchesLanguages && matchesProgress && matchesAssociation;
    });

    const sortedProjects = filteredProjects.sort((projectA, projectB) => {
      const multiplier = sort.order === orders[0] ? 1 : -1;
      let value = 0; 
      if(sort.by === bys[0]) {
        value = multiplier * (new Date(projectA.frontmatter.date) - new Date(projectB.frontmatter.date));
      } else if(sort.by === bys[1]) {
        value = multiplier * projectA.frontmatter.title.localeCompare(projectB.frontmatter.title);
      } else if(sort.by === bys[2]) {
        value = multiplier * projectA.frontmatter.association.localeCompare(projectB.frontmatter.association);
      } else if(sort.by === bys[3]) {
        value = multiplier * projectA.frontmatter.progress.localeCompare(projectB.frontmatter.association);
      } else {
        value = 0;
      }
      return value;
    });

    setProcessedProjects(sortedProjects);

  }, [filter, sort, allProjects]);

  const onShowAllBtnPress = () => {
    setFilter({
      languages: languages,
      progresses: progresses,
      associations: associations,
      showHidden: true,
    });
  }

  return (
    <div>
      <h2>Projects</h2>
      <ProjectFilter filter={filter} setFilter={setFilter} languages={languages} progresses={progresses} associations={associations} />
      <ProjectSort sort={sort} setSort={setSort} bys={bys} orders={orders} />
      <ProjectList onShowAllBtnPress={onShowAllBtnPress} allProjects={allProjects} processedProjects={processedProjects} />
    </div>
  );
}

export default ProjectCanvas;
