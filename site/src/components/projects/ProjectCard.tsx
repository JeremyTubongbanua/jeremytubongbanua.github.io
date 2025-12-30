import React from 'react';
import type { Project } from '../../types/project';

interface ProjectCardProps {
  project: Project;
}

const ProjectCard = ({ project }: ProjectCardProps) => {
  return (
    <li>
      <a href={project.url}>{project.frontmatter.title}</a>
    </li>
  );
};

export default ProjectCard;
