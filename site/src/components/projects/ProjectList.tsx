import React from 'react';
import type { Project } from '../../types/project';
import ProjectCard from './ProjectCard';

interface ProjectListProps {
  projects: Project[];
  totalProjects: number;
}

const ProjectList = ({ projects, totalProjects }: ProjectListProps) => {
  return (
    <div id="projects-list">
      <h3>
        Viewing <span id="project-count">{projects.length}</span> projects out of {totalProjects} total
      </h3>
      <ul>
        {projects.map((project) => (
          <ProjectCard key={project.url} project={project} />
        ))}
      </ul>
    </div>
  );
};

export default ProjectList;
