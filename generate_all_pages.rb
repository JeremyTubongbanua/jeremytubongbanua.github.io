#!/usr/bin/env ruby
require 'yaml'
require 'fileutils'

# Function to generate pages for a collection
def generate_pages(collection_name, data_file, asset_folder)
  # Create collection directory if it doesn't exist
  collection_dir = "_#{collection_name}"
  FileUtils.mkdir_p(collection_dir)

  # Read the data
  data = File.exist?(data_file) ? YAML.load_file(data_file) : []
  data = [] unless data.is_a?(Array)

  # Discover asset folders actually present on disk
  asset_slugs = Dir.exist?(asset_folder) ? Dir.children(asset_folder).select { |d| File.directory?(File.join(asset_folder, d)) } : []

  # Ensure every asset folder has a corresponding entry in data (auto-add minimal entries)
  known_slugs = data.map { |i| i['folder'] }.compact
  # Filter out template folders
  asset_slugs = asset_slugs.reject { |s| s == 'template' }
  missing = asset_slugs - known_slugs
  unless missing.empty?
    missing.each do |slug|
      data << {
        'id' => slug,
        'title' => slug.tr('_', ' '),
        'subtitle' => '',
        'description' => '',
        'folder' => slug
      }
    end
    puts "Added #{missing.size} new #{collection_name} to data (pending backfill)"
  end

  count = 0
  expected_slugs = []
  changed = false
  data.each do |item|
    folder = item['folder']
    next unless folder
    expected_slugs << folder

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

    # Merge fields to prefer data.yml values, falling back to per-asset metadata
    # Prefer metadata values over data for display fields when present
    merged = (item || {}).merge(metadata || {})

    # Helper lambdas to check blank/present
    is_blank = ->(v) { v.nil? || (v.respond_to?(:empty?) && v.empty?) }
    is_present = ->(v) { !is_blank.call(v) }

    %w[subtitle description date languages field tech progress association].each do |key|
      item_val = item[key]
      meta_val = metadata[key] rescue nil
      # If the value in data is blank but metadata has a value, backfill from metadata
      if is_blank.call(item_val) && is_present.call(meta_val)
        item[key] = meta_val
        changed = true
      end
    end

    # Always sync title from metadata when provided (even if data has a placeholder)
    meta_title = metadata['title'] rescue nil
    if is_present.call(meta_title) && item['title'] != meta_title
      item['title'] = meta_title
      changed = true
    end

    # Ensure data has a thumbnail path if the file exists
    thumb_path = "/#{asset_folder}/#{folder}/thumbnail.png"
    if File.exist?(File.join(asset_folder, folder, 'thumbnail.png'))
      merged['thumbnail'] ||= thumb_path
      # Also backfill into data so listings that read site.data can use it
      if item['thumbnail'].nil? || item['thumbnail'] == ''
        item['thumbnail'] = thumb_path
        changed = true
      end
    end

    # Create/update the page
    File.open("#{collection_dir}/#{folder}.md", 'w') do |f|
      f.puts "---"
      f.puts "layout: #{collection_name.chomp('s')}"
      f.puts "title: \"#{merged['title']}\""
      f.puts "subtitle: \"#{merged['subtitle']}\"" if merged['subtitle']
      f.puts "description: \"#{merged['description']}\""
      f.puts "date: #{merged['date']}" if merged['date']

      # Collection-specific fields
      case collection_name
      when 'projects'
        f.puts "languages: #{merged['languages']}" if merged['languages']
        f.puts "field: #{merged['field']}" if merged['field']
        f.puts "tech: #{merged['tech']}" if merged['tech']
        f.puts "progress: #{merged['progress']}" if merged['progress']
        f.puts "association: #{merged['association']}" if merged['association']
      when 'experiences'
        f.puts "roles: #{merged['roles']}" if merged['roles']
        f.puts "industries: #{merged['industries']}" if merged['industries']
        f.puts "fromdate: #{merged['fromdate']}" if merged['fromdate']
        f.puts "todate: #{merged['todate']}" if merged['todate']
        f.puts "category: #{merged['category']}" if merged['category']
      when 'awards'
        f.puts "placement: #{merged['placement']}" if merged['placement']
      when 'certifications'
        f.puts "issuer: #{merged['issuer']}" if merged['issuer']
        f.puts "credential_id: #{merged['credential_id']}" if merged['credential_id']
      end

      f.puts "thumbnail: #{merged['thumbnail'] || thumb_path}"
      f.puts "gallery: #{gallery_images}" if gallery_images.any?
      f.puts "permalink: /#{collection_name}/#{folder}/"
      f.puts "---"
      f.puts ""
      f.puts content
    end
    count += 1
  end

  # Remove any template entries from data before save
  before_size = data.size
  data.reject! { |i| i['folder'] == 'template' }
  changed = true if data.size != before_size

  # Persist updated data back to the YAML file if anything changed
  if changed
    File.write(data_file, data.to_yaml)
    puts "Backfilled and saved updates to #{data_file}"
  end

  # Prune outdated generated pages that no longer have assets/data
  existing = Dir.glob(File.join(collection_dir, '*.md')).map { |p| File.basename(p, '.md') }
  existing = existing.reject { |s| s == 'template' }
  stale = existing - expected_slugs
  stale.each do |slug|
    FileUtils.rm_f(File.join(collection_dir, "#{slug}.md"))
  end

  puts "Generated #{count} #{collection_name} pages"
  puts "Pruned #{stale.size} stale #{collection_name} pages" if stale.any?
end

# Generate pages for all collections
generate_pages('projects', '_data/asset_projects.yml', 'assets/projects')
generate_pages('experiences', '_data/asset_experiences.yml', 'assets/experiences')
generate_pages('awards', '_data/asset_awards.yml', 'assets/awards')
generate_pages('certifications', '_data/asset_certifications.yml', 'assets/certifications')
