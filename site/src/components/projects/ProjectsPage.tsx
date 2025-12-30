import React, { useState, useMemo } from 'react';
import type { Project, SortBy, OrderBy } from '../../types/project';
import ProjectFilter from './ProjectFilter';
import ProjectSort from './ProjectSort';
import ProjectList from './ProjectList';

interface ProjectsPageProps {
  allProjects: Project[];
  allLanguages: string[];
  allAssociations: string[];
  allProgresses: string[];
}

const ProjectsPage = ({
  allProjects,
  allLanguages,
  allAssociations,
  allProgresses,
}: ProjectsPageProps) => {
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(allLanguages);
  const [selectedAssociations, setSelectedAssociations] = useState<string[]>(allAssociations);
  const [selectedProgresses, setSelectedProgresses] = useState<string[]>(allProgresses);
  const [showHidden, setShowHidden] = useState<boolean>(false);

  const [sortBy, setSortBy] = useState<SortBy>('Title');
  const [orderBy, setOrderBy] = useState<OrderBy>('Ascending');

  const processedProjects = useMemo(() => {
    const filteredProjects = allProjects.filter((project) => {
      const shouldBeShown = !project.frontmatter.hidden || showHidden;

      const matchesLanguages = project.frontmatter.languages.length === 0
        ? selectedLanguages.includes('No Programming Language')
        : project.frontmatter.languages.some((language) => selectedLanguages.includes(language));

      const matchesProgress = selectedProgresses.includes(project.frontmatter.progress);
      const matchesAssociation = selectedAssociations.includes(project.frontmatter.association);

      return shouldBeShown && matchesLanguages && matchesProgress && matchesAssociation;
    });

    const sortedProjects = [...filteredProjects].sort((projectA, projectB) => {
      const multiplier = orderBy === 'Ascending' ? 1 : -1;
      let value = 0;

      if (sortBy === 'Date') {
        value = multiplier * (new Date(projectA.frontmatter.date).getTime() - new Date(projectB.frontmatter.date).getTime());
      } else if (sortBy === 'Title') {
        value = multiplier * projectA.frontmatter.title.localeCompare(projectB.frontmatter.title);
      } else if (sortBy === 'Association') {
        value = multiplier * projectA.frontmatter.association.localeCompare(projectB.frontmatter.association);
      } else if (sortBy === 'Progress') {
        value = multiplier * projectA.frontmatter.progress.localeCompare(projectB.frontmatter.progress);
      }

      return value;
    });

    return sortedProjects;
  }, [allProjects, selectedLanguages, selectedAssociations, selectedProgresses, showHidden, sortBy, orderBy]);

  const handleLanguageToggle = (language: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(language)
        ? prev.filter((l) => l !== language)
        : [...prev, language]
    );
  };

  const handleAssociationToggle = (association: string) => {
    setSelectedAssociations((prev) =>
      prev.includes(association)
        ? prev.filter((a) => a !== association)
        : [...prev, association]
    );
  };

  const handleProgressToggle = (progress: string) => {
    setSelectedProgresses((prev) =>
      prev.includes(progress)
        ? prev.filter((p) => p !== progress)
        : [...prev, progress]
    );
  };

  const handleShowAll = () => {
    setSelectedLanguages(allLanguages);
    setSelectedAssociations(allAssociations);
    setSelectedProgresses(allProgresses);
    setShowHidden(true);
  };

  return (
    <div>
      <h2>Projects</h2>

      <ProjectFilter
        allLanguages={allLanguages}
        allAssociations={allAssociations}
        allProgresses={allProgresses}
        selectedLanguages={selectedLanguages}
        selectedAssociations={selectedAssociations}
        selectedProgresses={selectedProgresses}
        showHidden={showHidden}
        onLanguageToggle={handleLanguageToggle}
        onAssociationToggle={handleAssociationToggle}
        onProgressToggle={handleProgressToggle}
        onShowHiddenChange={setShowHidden}
        onShowAll={handleShowAll}
      />

      <ProjectSort
        sortBy={sortBy}
        orderBy={orderBy}
        onSortByChange={setSortBy}
        onOrderByChange={setOrderBy}
      />

      <ProjectList
        projects={processedProjects}
        totalProjects={allProjects.length}
      />
    </div>
  );
}

export default ProjectsPage;
