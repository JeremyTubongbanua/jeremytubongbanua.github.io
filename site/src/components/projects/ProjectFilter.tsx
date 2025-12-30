import React from 'react';

interface ProjectFilterProps {
  allLanguages: string[];
  allAssociations: string[];
  allProgresses: string[];
  selectedLanguages: string[];
  selectedAssociations: string[];
  selectedProgresses: string[];
  showHidden: boolean;
  onLanguageToggle: (language: string) => void;
  onAssociationToggle: (association: string) => void;
  onProgressToggle: (progress: string) => void;
  onShowHiddenChange: (showHidden: boolean) => void;
  onShowAll: () => void;
}

const ProjectFilter = ({
  allLanguages,
  allAssociations,
  allProgresses,
  selectedLanguages,
  selectedAssociations,
  selectedProgresses,
  showHidden,
  onLanguageToggle,
  onAssociationToggle,
  onProgressToggle,
  onShowHiddenChange,
  onShowAll,
}: ProjectFilterProps) => {
  return (
    <div className="project-filter">
      <fieldset>
        <legend>Filter</legend>
        <button id="show-all" onClick={onShowAll}>
          Show All
        </button>
        <div>
          <label>
            Show Hidden:
            <input
              id="filter-show-hidden"
              type="checkbox"
              checked={showHidden}
              onChange={(e) => onShowHiddenChange(e.target.checked)}
            />
          </label>
        </div>
        <div>
          Programming Language:
          {allLanguages.map((language) => (
            <label key={language}>
              <input
                type="checkbox"
                className="filter-language"
                value={language}
                checked={selectedLanguages.includes(language)}
                onChange={() => onLanguageToggle(language)}
              />
              {language}
            </label>
          ))}
        </div>
        <div>
          Association:
          {allAssociations.map((association) => (
            <label key={association}>
              <input
                type="checkbox"
                className="filter-association"
                value={association}
                checked={selectedAssociations.includes(association)}
                onChange={() => onAssociationToggle(association)}
              />
              {association}
            </label>
          ))}
        </div>
        <div>
          Progress:
          {allProgresses.map((progress) => (
            <label key={progress}>
              <input
                type="checkbox"
                className="filter-progress"
                value={progress}
                checked={selectedProgresses.includes(progress)}
                onChange={() => onProgressToggle(progress)}
              />
              {progress}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
};

export default ProjectFilter;
