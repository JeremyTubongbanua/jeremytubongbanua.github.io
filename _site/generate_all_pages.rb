#!/usr/bin/env ruby
require 'yaml'
require 'fileutils'

# Function to generate pages for a collection
def generate_pages(collection_name, data_file, asset_folder)
  # Create collection directory if it doesn't exist
  collection_dir = "_#{collection_name}"
  FileUtils.mkdir_p(collection_dir)

  # Read the data
  data = YAML.load_file(data_file)

  count = 0
  data.each do |item|
    folder = item['folder']
    next unless folder

    # Read the content.md file if it exists
    content_path = "#{asset_folder}/#{folder}/content.md"
    content = File.exist?(content_path) ? File.read(content_path) : ""

    # Read the metadata
    metadata_path = "#{asset_folder}/#{folder}/metadata.yml"
    metadata = File.exist?(metadata_path) ? YAML.load_file(metadata_path) : {}

    # Get gallery images
    gallery_path = "#{asset_folder}/#{folder}/gallery"
    gallery_images = []
    if Dir.exist?(gallery_path)
      gallery_images = Dir.glob("#{gallery_path}/*").map { |f| "/#{f}" }
    end

    # Create the page
    File.open("#{collection_dir}/#{folder}.md", 'w') do |f|
      f.puts "---"
      f.puts "layout: #{collection_name.chomp('s')}"
      f.puts "title: \"#{item['title'] || metadata['title']}\""
      f.puts "subtitle: \"#{item['subtitle'] || metadata['subtitle']}\"" if item['subtitle'] || metadata['subtitle']
      f.puts "description: \"#{item['description'] || metadata['description']}\""
      f.puts "date: #{item['date'] || metadata['date']}" if item['date'] || metadata['date']

      # Collection-specific fields
      case collection_name
      when 'projects'
        f.puts "languages: #{item['languages']}" if item['languages']
        f.puts "field: #{item['field']}" if item['field']
        f.puts "tech: #{item['tech']}" if item['tech']
        f.puts "progress: #{item['progress']}" if item['progress']
        f.puts "association: #{item['association']}" if item['association']
      when 'experiences'
        f.puts "roles: #{item['roles'] || metadata['roles']}" if item['roles'] || metadata['roles']
        f.puts "industries: #{item['industries'] || metadata['industries']}" if item['industries'] || metadata['industries']
        f.puts "fromdate: #{item['fromdate'] || metadata['fromdate']}" if item['fromdate'] || metadata['fromdate']
        f.puts "todate: #{item['todate'] || metadata['todate']}" if item['todate'] || metadata['todate']
      when 'awards'
        f.puts "placement: #{item['placement'] || metadata['placement']}" if item['placement'] || metadata['placement']
      when 'certifications'
        f.puts "issuer: #{item['issuer'] || metadata['issuer']}" if item['issuer'] || metadata['issuer']
        f.puts "credential_id: #{item['credential_id'] || metadata['credential_id']}" if item['credential_id'] || metadata['credential_id']
      end

      f.puts "thumbnail: /#{asset_folder}/#{folder}/thumbnail.png"
      f.puts "gallery: #{gallery_images}" if gallery_images.any?
      f.puts "permalink: /#{collection_name}/#{folder}/"
      f.puts "---"
      f.puts ""
      f.puts content
    end
    count += 1
  end

  puts "Generated #{count} #{collection_name} pages"
end

# Generate pages for all collections
generate_pages('projects', '_data/asset_projects.yml', 'assets/projects')
generate_pages('experiences', '_data/asset_experiences.yml', 'assets/experiences')
generate_pages('awards', '_data/asset_awards.yml', 'assets/awards')
generate_pages('certifications', '_data/asset_certifications.yml', 'assets/certifications')