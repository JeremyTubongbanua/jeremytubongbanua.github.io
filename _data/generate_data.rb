#!/usr/bin/env ruby
# This script generates data files from assets folders
# Run this locally before pushing to GitHub Pages

require 'yaml'
require 'json'
require 'fileutils'

def load_asset_data(asset_path)
  data = []

  return data unless Dir.exist?(asset_path)

  Dir.foreach(asset_path) do |folder|
    next if folder == '.' || folder == '..' || folder == 'template'

    folder_path = File.join(asset_path, folder)
    next unless File.directory?(folder_path)

    item_data = { 'id' => folder }

    # Load metadata.yml if it exists
    metadata_file = File.join(folder_path, 'metadata.yml')
    if File.exist?(metadata_file)
      metadata = YAML.load_file(metadata_file)
      item_data.merge!(metadata) if metadata
    end

    # Check for thumbnail
    thumbnail_file = File.join(folder_path, 'thumbnail.png')
    if File.exist?(thumbnail_file)
      item_data['thumbnail'] = "/#{asset_path}/#{folder}/thumbnail.png"
    end

    # Load gallery if it exists
    gallery_json = File.join(folder_path, 'gallery', 'gallery.json')
    if File.exist?(gallery_json)
      gallery_data = JSON.parse(File.read(gallery_json))
      item_data['gallery'] = gallery_data.map { |img| "/#{asset_path}/#{folder}/gallery/#{img}" }
    end

    # Add folder reference
    item_data['folder'] = folder

    data << item_data
  end

  # Sort by date if available, newest first
  data.sort_by { |item| item['date'] || item['todate'] || item['fromdate'] || '0000-00-00' }.reverse
end

# Generate data files
FileUtils.mkdir_p('_data')

# Projects
projects = load_asset_data('assets/projects')
File.write('_data/asset_projects.yml', projects.to_yaml)
puts "Generated #{projects.size} projects"

# Experiences
experiences = load_asset_data('assets/experiences')
File.write('_data/asset_experiences.yml', experiences.to_yaml)
puts "Generated #{experiences.size} experiences"

# Awards
awards = load_asset_data('assets/awards')
File.write('_data/asset_awards.yml', awards.to_yaml)
puts "Generated #{awards.size} awards"

# Certifications
certifications = load_asset_data('assets/certifications')
File.write('_data/asset_certifications.yml', certifications.to_yaml)
puts "Generated #{certifications.size} certifications"