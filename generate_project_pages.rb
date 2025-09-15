#!/usr/bin/env ruby
require 'yaml'
require 'fileutils'

# Create _projects directory if it doesn't exist
FileUtils.mkdir_p('_projects')

# Read the projects data
projects_data = YAML.load_file('_data/asset_projects.yml')

projects_data.each do |project|
  folder = project['folder']
  next unless folder

  # Read the content.md file if it exists
  content_path = "assets/projects/#{folder}/content.md"
  content = File.exist?(content_path) ? File.read(content_path) : ""

  # Read the metadata
  metadata_path = "assets/projects/#{folder}/metadata.yml"
  metadata = File.exist?(metadata_path) ? YAML.load_file(metadata_path) : {}

  # Get gallery images
  gallery_path = "assets/projects/#{folder}/gallery"
  gallery_images = []
  if Dir.exist?(gallery_path)
    gallery_images = Dir.glob("#{gallery_path}/*").map { |f| "/#{f}" }
  end

  # Create the project page
  File.open("_projects/#{folder}.md", 'w') do |f|
    f.puts "---"
    f.puts "layout: project"
    f.puts "title: \"#{project['title'] || metadata['title']}\""
    f.puts "subtitle: \"#{project['subtitle'] || metadata['subtitle']}\"" if project['subtitle'] || metadata['subtitle']
    f.puts "description: \"#{project['description'] || metadata['description']}\""
    f.puts "date: #{project['date'] || metadata['date']}"
    f.puts "languages: #{project['languages']}" if project['languages']
    f.puts "field: #{project['field']}" if project['field']
    f.puts "tech: #{project['tech']}" if project['tech']
    f.puts "progress: #{project['progress']}" if project['progress']
    f.puts "association: #{project['association']}" if project['association']
    f.puts "thumbnail: /assets/projects/#{folder}/thumbnail.png"
    f.puts "gallery: #{gallery_images}" if gallery_images.any?
    f.puts "permalink: /projects/#{folder}/"
    f.puts "---"
    f.puts ""
    f.puts content
  end
end

puts "Generated #{projects_data.length} project pages"